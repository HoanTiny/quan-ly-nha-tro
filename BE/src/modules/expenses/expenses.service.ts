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
    if (dto.splitMethod !== SplitMethod.EQUAL) {
      throw new BadRequestException(
        'Only equal split is currently supported. Use participant selection to choose specific members.',
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

  private getMonthKey(date: Date) {
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    return `${date.getFullYear()}-${month}`;
  }
}
