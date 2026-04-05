import { Prisma, SplitMethod } from '@prisma/client';
import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SettlementsService } from '../settlements/settlements.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { calculateShares } from './utils/calculate-shares';

type ResolvedParticipant = {
  membershipId: string;
  roomId?: string | null;
  weight: number;
};

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settlementsService: SettlementsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createExpense(actorId: string, dto: CreateExpenseDto) {
    if (dto.splitMethod !== SplitMethod.EQUAL && dto.splitMethod !== SplitMethod.BY_WEIGHT) {
      throw new BadRequestException(
        'Only EQUAL and BY_WEIGHT split methods are supported. Use participant selection to choose specific members.',
      );
    }

    const participants = await this.resolveParticipants(dto);
    const shares = calculateShares(
      dto.totalAmount,
      participants.map((participant) => ({
        userId: participant.membershipId,
        roomId: participant.roomId ?? null,
        weight: participant.weight,
      })),
      dto.splitMethod,
    );
    const expenseDate = new Date(dto.expenseDate);
    const monthKey = this.getMonthKey(expenseDate);

    const expense = await this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          houseId: dto.houseId,
          title: dto.title,
          description: dto.description,
          receiptImageUrl: dto.receiptImageUrl,
          category: dto.category,
          amount: new Prisma.Decimal(dto.totalAmount),
          expenseDate,
          monthKey,
          splitMethod: dto.splitMethod,
          status: 'CONFIRMED',
          payerUserId: dto.payerUserId ?? actorId,
          createdById: actorId,
        },
      });

      await tx.expenseAllocation.createMany({
        data: participants.map((participant) => ({
          expenseId: expense.id,
          membershipId: participant.membershipId,
          weight: new Prisma.Decimal(participant.weight),
          amount: new Prisma.Decimal(shares[participant.membershipId]),
        })),
      });

      return tx.expense.findUnique({
        where: { id: expense.id },
        include: {
          allocations: {
            include: {
              membership: {
                include: {
                  user: true,
                  room: true,
                },
              },
            },
          },
          payer: true,
          createdBy: true,
        },
      });
    });

    await this.settlementsService.generateMonthlySettlement(
      dto.houseId,
      expenseDate.getMonth() + 1,
      expenseDate.getFullYear(),
      expenseDate,
    );

    const recipientUserIds = [
      ...new Set(expense?.allocations.map((allocation) => allocation.membership.userId).filter(Boolean)),
    ];

    await this.notificationsService.createInAppNotification({
      houseId: dto.houseId,
      title: 'Có hóa đơn mới được thêm',
      body: `${expense?.title ?? 'Một khoản chi'} vừa được thêm vào kỳ ${monthKey}. Hệ thống đã cập nhật bill của bạn.`,
      recipientUserIds,
    });
    this.notificationsService.emitBillsUpdated(recipientUserIds, dto.houseId, monthKey);

    return expense;
  }

  async list(houseId: string, month?: string) {
    const where: Prisma.ExpenseWhereInput = { houseId };
    if (month) {
      where.monthKey = month;
    }

    return this.prisma.expense.findMany({
      where,
      include: {
        allocations: {
          include: {
            membership: {
              include: {
                user: true,
                room: true,
              },
            },
          },
        },
        payer: true,
        createdBy: true,
      },
      orderBy: { expenseDate: 'desc' },
    });
  }

  findOne(expenseId: string) {
    return this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: {
        allocations: {
          include: {
            membership: {
              include: {
                user: true,
                room: true,
              },
            },
          },
        },
        payer: true,
        createdBy: true,
        house: true,
      },
    });
  }

  async updateExpense(expenseId: string, dto: Partial<CreateExpenseDto>) {
    const existingExpense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
      include: { allocations: true },
    });

    if (!existingExpense) {
      throw new BadRequestException('Expense not found');
    }

    const expenseDate = new Date(dto.expenseDate ?? existingExpense.expenseDate);
    const monthKey = this.getMonthKey(expenseDate);

    const updatedExpense = await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id: expenseId },
        data: {
          title: dto.title,
          description: dto.description,
          category: dto.category,
          amount: dto.totalAmount ? new Prisma.Decimal(dto.totalAmount) : undefined,
          expenseDate,
          monthKey,
          receiptImageUrl: dto.receiptImageUrl,
        },
      });

      if (dto.participantMembershipIds?.length) {
        await tx.expenseAllocation.deleteMany({
          where: { expenseId },
        });

        const shares = calculateShares(
          dto.totalAmount ?? Number(existingExpense.amount),
          dto.participantMembershipIds.map((id) => ({
            userId: id,
            roomId: null,
            weight: 1,
          })),
          'EQUAL',
        );

        await tx.expenseAllocation.createMany({
          data: dto.participantMembershipIds.map((membershipId) => ({
            expenseId,
            membershipId,
            weight: new Prisma.Decimal(1),
            amount: new Prisma.Decimal(shares[membershipId]),
          })),
        });
      }

      return tx.expense.findUnique({
        where: { id: expenseId },
        include: {
          allocations: {
            include: {
              membership: {
                include: {
                  user: true,
                  room: true,
                },
              },
            },
          },
          payer: true,
          createdBy: true,
        },
      });
    });

    // Regenerate settlement sau khi cập nhật expense
    const [year, month] = monthKey.split('-').map(Number);
    await this.settlementsService.generateMonthlySettlement(
      existingExpense.houseId,
      month,
      year,
      expenseDate,
    );

    return updatedExpense;
  }

  async deleteExpense(expenseId: string) {
    const existingExpense = await this.prisma.expense.findUnique({
      where: { id: expenseId },
    });

    if (!existingExpense) {
      throw new BadRequestException('Expense not found');
    }

    const expenseDate = new Date(existingExpense.expenseDate);
    const monthKey = this.getMonthKey(expenseDate);
    const [year, month] = monthKey.split('-').map(Number);

    await this.prisma.$transaction(async (tx) => {
      await tx.expenseAllocation.deleteMany({
        where: { expenseId },
      });
      await tx.expense.delete({
        where: { id: expenseId },
      });
    });

    // Regenerate settlement sau khi xóa expense để cập nhật allocatedAmount và netAmount
    await this.settlementsService.generateMonthlySettlement(
      existingExpense.houseId,
      month,
      year,
      expenseDate,
    );

    return { success: true, message: 'Expense deleted successfully' };
  }

  private async resolveParticipants(dto: CreateExpenseDto): Promise<ResolvedParticipant[]> {
    if (dto.participantMembershipIds?.length) {
      const memberships = await this.prisma.houseMembership.findMany({
        where: {
          id: {
            in: dto.participantMembershipIds,
          },
          houseId: dto.houseId,
          isActive: true,
        },
      });

      if (!memberships.length) {
        throw new BadRequestException('No valid selected participants found for this expense');
      }

      if (memberships.length !== dto.participantMembershipIds.length) {
        throw new BadRequestException('Some selected participants are invalid or inactive');
      }

      // Nếu là BY_WEIGHT, lấy weight từ participantWeights
      if (dto.splitMethod === SplitMethod.BY_WEIGHT && dto.participantWeights?.length) {
        const weightMap = new Map(dto.participantWeights.map(w => [w.membershipId, w.weight]));
        return memberships.map((membership) => ({
          membershipId: membership.id,
          roomId: membership.roomId,
          weight: weightMap.get(membership.id) ?? 1,
        }));
      }

      return memberships.map((membership) => ({
        membershipId: membership.id,
        roomId: membership.roomId,
        weight: 1,
      }));
    }

    const membershipWhere: Prisma.HouseMembershipWhereInput = {
      houseId: dto.houseId,
      isActive: true,
    };

    if (dto.roomId) {
      membershipWhere.roomId = dto.roomId;
    }

    if (dto.participantUserIds?.length) {
      membershipWhere.userId = {
        in: dto.participantUserIds,
      };
    }

    const memberships = await this.prisma.houseMembership.findMany({
      where: membershipWhere,
    });

    if (!memberships.length) {
      throw new BadRequestException('No active participants found for this expense');
    }

    return memberships.map((membership) => ({
      membershipId: membership.id,
      roomId: membership.roomId,
      weight: 1,
    }));
  }

  async getMemberExpenseSummary(userId: string, houseId: string, month: string) {
    const membership = await this.prisma.houseMembership.findFirst({
      where: { userId, houseId, isActive: true },
      include: { room: true },
    });

    if (!membership) {
      throw new BadRequestException('Member not found in this house');
    }

    const prevMonth = this.getPreviousMonthKey(month);

    const [currentExpenses, prevExpenses] = await Promise.all([
      this.prisma.expenseAllocation.findMany({
        where: {
          membershipId: membership.id,
          expense: { monthKey: month, houseId },
        },
        include: {
          expense: {
            select: {
              id: true,
              title: true,
              category: true,
              amount: true,
              expenseDate: true,
              monthKey: true,
            },
          },
        },
      }),
      this.prisma.expenseAllocation.findMany({
        where: {
          membershipId: membership.id,
          expense: { monthKey: prevMonth, houseId },
        },
        include: {
          expense: {
            select: {
              id: true,
              title: true,
              category: true,
              amount: true,
              expenseDate: true,
              monthKey: true,
            },
          },
        },
      }),
    ]);

    const currentTotal = currentExpenses.reduce(
      (sum, alloc) => sum + Number(alloc.amount),
      0,
    );
    const prevTotal = prevExpenses.reduce(
      (sum, alloc) => sum + Number(alloc.amount),
      0,
    );

    const percentageChange =
      prevTotal > 0 ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;

    return {
      monthKey: month,
      previousMonthKey: prevMonth,
      currentTotal,
      previousTotal: prevTotal,
      percentageChange,
      expenses: currentExpenses.map((alloc) => ({
        id: alloc.expense.id,
        title: alloc.expense.title,
        category: alloc.expense.category,
        amount: Number(alloc.amount),
        expenseDate: alloc.expense.expenseDate,
      })),
    };
  }

  async getAdminExpenseSummaryByMember(houseId: string, month: string) {
    const memberships = await this.prisma.houseMembership.findMany({
      where: { houseId, isActive: true },
      include: {
        user: true,
        room: true,
      },
    });

    const expenseAllocations = await this.prisma.expenseAllocation.findMany({
      where: {
        membership: { houseId, isActive: true },
        expense: { monthKey: month, houseId },
      },
      include: {
        membership: {
          include: {
            user: true,
            room: true,
          },
        },
        expense: {
          select: {
            id: true,
            title: true,
            category: true,
            amount: true,
            expenseDate: true,
          },
        },
      },
    });

    const memberSummary = new Map<
      string,
      {
        membershipId: string;
        userId: string;
        fullName: string;
        roomName?: string | null;
        totalExpense: number;
        expenses: Array<{
          id: string;
          title: string;
          category: string;
          amount: number;
          expenseDate: Date;
        }>;
      }
    >();

    for (const membership of memberships) {
      memberSummary.set(membership.id, {
        membershipId: membership.id,
        userId: membership.userId,
        fullName: membership.user.fullName,
        roomName: membership.room?.name,
        totalExpense: 0,
        expenses: [],
      });
    }

    for (const alloc of expenseAllocations) {
      const summary = memberSummary.get(alloc.membershipId);
      if (summary) {
        summary.totalExpense += Number(alloc.amount);
        summary.expenses.push({
          id: alloc.expense.id,
          title: alloc.expense.title,
          category: alloc.expense.category,
          amount: Number(alloc.amount),
          expenseDate: alloc.expense.expenseDate,
        });
      }
    }

    return Array.from(memberSummary.values()).map((member) => ({
      ...member,
      expenses: member.expenses.sort(
        (a, b) =>
          new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime(),
      ),
    }));
  }

  private getPreviousMonthKey(monthKey: string): string {
    const [yearStr, monthStr] = monthKey.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10);

    if (month === 1) {
      year -= 1;
      month = 12;
    } else {
      month -= 1;
    }

    return `${year}-${`${month}`.padStart(2, '0')}`;
  }

  private getMonthKey(date: Date) {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
  }
}
