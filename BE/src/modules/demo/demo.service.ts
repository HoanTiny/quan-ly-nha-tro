import { ExpenseCategory, HouseRole, PaymentProvider, SplitMethod } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { ExpensesService } from '../expenses/expenses.service';
import { SettlementsService } from '../settlements/settlements.service';

@Injectable()
export class DemoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expensesService: ExpensesService,
    private readonly settlementsService: SettlementsService,
  ) {}

  async getContext() {
    return this.findContext();
  }

  async bootstrap() {
    const passwordHash = await bcrypt.hash('123456', 10);
    const [owner, member] = await Promise.all([
      this.prisma.user.upsert({
        where: { email: 'owner@tro.demo' },
        update: { fullName: 'Demo Owner', passwordHash },
        create: {
          email: 'owner@tro.demo',
          fullName: 'Demo Owner',
          passwordHash,
        },
      }),
      this.prisma.user.upsert({
        where: { email: 'member@tro.demo' },
        update: { fullName: 'Demo Member', passwordHash },
        create: {
          email: 'member@tro.demo',
          fullName: 'Demo Member',
          passwordHash,
        },
      }),
    ]);

    const house = await this.prisma.boardingHouse.upsert({
      where: { code: 'TRO-DEMO' },
      update: {
        name: 'Nha Tro Demo',
        address: '123 Demo Street',
      },
      create: {
        code: 'TRO-DEMO',
        name: 'Nha Tro Demo',
        address: '123 Demo Street',
      },
    });

    const room = await this.prisma.room.upsert({
      where: {
        houseId_code: {
          houseId: house.id,
          code: 'A101',
        },
      },
      update: {
        name: 'Phong A101',
        capacity: 2,
      },
      create: {
        houseId: house.id,
        code: 'A101',
        name: 'Phong A101',
        capacity: 2,
      },
    });

    const [ownerMembership, memberMembership] = await Promise.all([
      this.prisma.houseMembership.upsert({
        where: {
          houseId_userId: {
            houseId: house.id,
            userId: owner.id,
          },
        },
        update: {
          role: HouseRole.OWNER,
          isActive: true,
        },
        create: {
          houseId: house.id,
          userId: owner.id,
          role: HouseRole.OWNER,
        },
      }),
      this.prisma.houseMembership.upsert({
        where: {
          houseId_userId: {
            houseId: house.id,
            userId: member.id,
          },
        },
        update: {
          roomId: room.id,
          role: HouseRole.TENANT,
          isActive: true,
        },
        create: {
          houseId: house.id,
          userId: member.id,
          roomId: room.id,
          role: HouseRole.TENANT,
        },
      }),
    ]);

    const paymentAccount = await this.prisma.paymentAccount.findFirst({
      where: {
        houseId: house.id,
        isActive: true,
      },
    });

    if (!paymentAccount) {
      await this.prisma.paymentAccount.create({
        data: {
          houseId: house.id,
          provider: PaymentProvider.MANUAL,
          accountName: 'DEMO OWNER',
          accountRef: 'MBBANK-123456789',
          isActive: true,
        },
      });
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;
    const existingExpenses = await this.prisma.expense.count({
      where: {
        houseId: house.id,
        monthKey,
      },
    });

    if (!existingExpenses) {
      await this.expensesService.createExpense(owner.id, {
        createdById: owner.id,
        houseId: house.id,
        roomId: room.id,
        payerUserId: owner.id,
        title: 'Tien dien thang nay',
        description: 'Hoa don dien phong A101',
        category: ExpenseCategory.ELECTRIC,
        splitMethod: SplitMethod.EQUAL,
        totalAmount: 650000,
        expenseDate: now.toISOString(),
        participantMembershipIds: [memberMembership.id],
      });

      await this.expensesService.createExpense(owner.id, {
        createdById: owner.id,
        houseId: house.id,
        payerUserId: owner.id,
        title: 'Tien internet toan nha',
        description: 'Chia deu cho thanh vien',
        category: ExpenseCategory.INTERNET,
        splitMethod: SplitMethod.EQUAL,
        totalAmount: 150000,
        expenseDate: now.toISOString(),
        participantMembershipIds: [memberMembership.id],
      });
    }

    await this.settlementsService.generateMonthlySettlement(
      house.id,
      now.getMonth() + 1,
      now.getFullYear(),
      new Date(now.getFullYear(), now.getMonth() + 1, 10),
    );

    return {
      houseId: house.id,
      roomId: room.id,
      ownerId: owner.id,
      memberId: member.id,
      ownerMembershipId: ownerMembership.id,
      memberMembershipId: memberMembership.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      ownerEmail: owner.email,
      memberEmail: member.email,
    };
  }

  async resetExpenses(houseId?: string) {
    const context = houseId ? { houseId } : await this.findContext();

    if (!context || !('houseId' in context) || !context.houseId) {
      throw new Error('Demo context not found. Run bootstrap first or provide houseId.');
    }

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, '0')}`;

    // Xóa tất cả expense allocations và expenses của tháng hiện tại
    await this.prisma.$transaction(async (tx) => {
      // Xóa allocations trước (foreign key constraint)
      await tx.expenseAllocation.deleteMany({
        where: {
          expense: {
            houseId: context.houseId,
            monthKey,
          },
        },
      });

      // Xóa expenses
      await tx.expense.deleteMany({
        where: {
          houseId: context.houseId,
          monthKey,
        },
      });

      // Xóa settlements của tháng
      await tx.monthlySettlement.deleteMany({
        where: {
          houseId: context.houseId,
          monthKey,
        },
      });
    });

    return { success: true, message: 'Đã reset dữ liệu chi phí tháng hiện tại.' };
  }

  private async findContext() {
    const house = await this.prisma.boardingHouse.findUnique({
      where: { code: 'TRO-DEMO' },
      include: {
        rooms: true,
        memberships: true,
      },
    });

    const [owner, member] = await Promise.all([
      this.prisma.user.findUnique({ where: { email: 'owner@tro.demo' } }),
      this.prisma.user.findUnique({ where: { email: 'member@tro.demo' } }),
    ]);

    const room = house?.rooms[0];
    const ownerMembership = house?.memberships.find((membership) => membership.userId === owner?.id);
    const memberMembership = house?.memberships.find((membership) => membership.userId === member?.id);

    if (!house || !room || !owner || !member || !ownerMembership || !memberMembership) {
      return null;
    }

    const now = new Date();
    return {
      houseId: house.id,
      roomId: room.id,
      ownerId: owner.id,
      memberId: member.id,
      ownerMembershipId: ownerMembership.id,
      memberMembershipId: memberMembership.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      ownerEmail: owner.email,
      memberEmail: member.email,
    };
  }
}
