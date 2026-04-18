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

    const [
      rooms,
      totalExpenseResult,
      latestSettlement,
      settlementItems,
      totalPaidResult,
      pendingPaymentsCount,
      recentExpenses,
    ] = await Promise.all([
      this.prisma.room.count({ where: { houseId } }),
      this.prisma.expense.aggregate({
        where: expenseWhere,
        _sum: {
          amount: true,
        },
      }),
      this.prisma.monthlySettlement.findFirst({
        where: settlementWhere,
        select: {
          id: true,
          monthKey: true,
          status: true,
          totalExpense: true,
          totalPaid: true,
        },
        orderBy: { monthKey: 'desc' },
      }),
      this.prisma.settlementItem.groupBy({
        by: ['membershipId'],
        where: {
          settlement: {
            is: settlementWhere,
          },
        },
        _sum: {
          netAmount: true,
          paidAmount: true,
        },
      }),
      this.prisma.monthlySettlement.aggregate({
        where: settlementWhere,
        _sum: {
          totalPaid: true,
        },
      }),
      this.prisma.settlementPayment.count({
        where: {
          houseId,
          status: 'PENDING',
        },
      }),
      this.prisma.expense.findMany({
        where: expenseWhere,
        orderBy: { expenseDate: 'desc' },
        take: 4,
        select: {
          id: true,
          title: true,
          category: true,
          amount: true,
          expenseDate: true,
          _count: {
            select: {
              allocations: true,
            },
          },
        },
      }),
    ]);

    const allItems = settlementItems.map((item) => ({
      membershipId: item.membershipId,
      netAmount: Number(item._sum.netAmount ?? 0),
      paidAmount: Number(item._sum.paidAmount ?? 0),
    }));

    const totalExpense = Number(totalExpenseResult._sum.amount ?? 0);
    const totalPaid = Number(totalPaidResult._sum.totalPaid ?? 0);
    const totalNetAmount = allItems.reduce((sum, item) => sum + item.netAmount, 0);
    const overdueCount = allItems.filter((item) => item.netAmount - item.paidAmount > 0).length;

    return {
      rooms,
      totalExpense,
      overdueCount,
      latestSettlement,
      allItems,
      totalPaid,
      totalNetAmount,
      pendingPaymentsCount,
      recentExpenses: recentExpenses.map((expense) => ({
        id: expense.id,
        title: expense.title,
        category: expense.category,
        amount: Number(expense.amount),
        expenseDate: expense.expenseDate,
        participantCount: expense._count.allocations,
      })),
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
        select: {
          id: true,
          netAmount: true,
          paidAmount: true,
          settlement: {
            select: {
              id: true,
              monthKey: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.notificationRecipient.findMany({
        where: { userId },
        select: {
          notification: {
            select: {
              id: true,
              title: true,
              body: true,
              createdAt: true,
            },
          },
        },
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
      lines: lines.map((item) => ({
        ...item,
        status: item.settlement.status,
      })),
      notifications: notifications.map((recipient) => recipient.notification),
    };
  }
}
