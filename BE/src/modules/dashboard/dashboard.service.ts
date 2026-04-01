import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async adminSummary(houseId: string, month?: string) {
    const expenseWhere: Prisma.ExpenseWhereInput = { houseId };
    if (month) {
      expenseWhere.monthKey = {
        startsWith: month,
      };
    }

    const settlementWhere: Prisma.MonthlySettlementWhereInput = { houseId };
    if (month) {
      settlementWhere.monthKey = {
        startsWith: month,
      };
    }

    const [rooms, expenses, settlements] = await Promise.all([
      this.prisma.room.count({ where: { houseId } }),
      this.prisma.expense.findMany({ where: expenseWhere }),
      this.prisma.monthlySettlement.findMany({
        where: settlementWhere,
        include: { items: true },
        orderBy: { monthKey: 'desc' },
      }),
    ]);

    const totalExpense = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

    // Gom nhóm các settlement items theo membershipId để tổng hợp
    const itemsByMember = new Map<string, { netAmount: number; paidAmount: number }>();

    for (const settlement of settlements) {
      for (const item of settlement.items) {
        const existing = itemsByMember.get(item.membershipId) || { netAmount: 0, paidAmount: 0 };
        existing.netAmount += Number(item.netAmount);
        existing.paidAmount += Number(item.paidAmount);
        itemsByMember.set(item.membershipId, existing);
      }
    }

    const allItems = Array.from(itemsByMember.entries()).map(([membershipId, data]) => ({
      membershipId,
      netAmount: data.netAmount,
      paidAmount: data.paidAmount,
    }));

    const totalPaid = settlements.reduce((sum, s) => sum + Number(s.totalPaid), 0);
    const totalNetAmount = allItems.reduce((sum, item) => sum + item.netAmount, 0);

    const latestSettlement = settlements[0] ?? null;
    const overdueCount =
      allItems.filter((item) => item.netAmount - item.paidAmount > 0).length ?? 0;

    return {
      rooms,
      totalExpense,
      overdueCount,
      latestSettlement,
      allItems,
      totalPaid,
      totalNetAmount,
    };
  }

  async memberSummary(userId: string, month?: string) {
    const where: Prisma.SettlementItemWhereInput = {
      membership: {
        userId,
      },
    };

    if (month) {
      where.settlement = {
        is: {
          monthKey: {
            startsWith: month,
          },
        },
      };
    }

    const [lines, notifications] = await Promise.all([
      this.prisma.settlementItem.findMany({
        where,
        include: { settlement: true },
      }),
      this.prisma.notificationRecipient.findMany({
        where: { userId },
        include: { notification: true },
        take: 5,
        orderBy: {
          notification: {
            createdAt: 'desc',
          },
        },
      }),
    ]);

    const currentDue = lines.reduce((sum, item) => {
      const amount = Math.max(Number(item.netAmount), 0);
      return sum + Math.max(amount - Number(item.paidAmount), 0);
    }, 0);

    return {
      currentDue,
      lines,
      notifications: notifications.map((recipient) => recipient.notification),
    };
  }
}
