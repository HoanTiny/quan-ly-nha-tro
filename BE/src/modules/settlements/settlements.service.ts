import { Prisma } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class SettlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateMonthlySettlement(houseId: string, month: number, year: number, _dueDate: Date) {
    const monthKey = `${year}-${`${month}`.padStart(2, '0')}`;
    const expenses = await this.prisma.expense.findMany({
      where: {
        houseId,
        status: 'CONFIRMED',
        monthKey,
      },
      include: { allocations: true },
    });

    const memberships = await this.prisma.houseMembership.findMany({
      where: {
        houseId,
        isActive: true,
      },
      select: {
        id: true,
        userId: true,
      },
    });

    const payerMembershipMap = new Map(
      memberships.map((membership) => [membership.userId, membership.id]),
    );

    const aggregate = new Map(
      memberships.map((membership) => [
        membership.id,
        {
          allocatedAmount: 0,
          paidByUserAmount: 0,
          paidAmount: 0,
        },
      ]),
    );

    for (const expense of expenses) {
      const payerMembershipId = payerMembershipMap.get(expense.payerUserId);
      if (payerMembershipId) {
        aggregate.get(payerMembershipId)!.paidByUserAmount += Number(expense.amount);
      }

      for (const allocation of expense.allocations) {
        const item = aggregate.get(allocation.membershipId);
        if (item) {
          item.allocatedAmount += Number(allocation.amount);
        }
      }
    }

    const totalExpense = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

    return this.prisma.$transaction(async (tx) => {
      const settlementsForMonth = await tx.monthlySettlement.findMany({
        where: {
          houseId,
          monthKey: {
            startsWith: monthKey,
          },
        },
        include: {
          items: true,
          payments: true,
        },
        orderBy: { monthKey: 'asc' },
      });

      const hasPaidSettlement = settlementsForMonth.some(
        (settlement) =>
          Number(settlement.totalPaid) > 0 ||
          settlement.payments.some((payment) => payment.status === 'SUCCEEDED'),
      );

      if (!settlementsForMonth.length || !hasPaidSettlement) {
        const primaryMonthKey = settlementsForMonth[0]?.monthKey ?? monthKey;
        const settlement = await tx.monthlySettlement.upsert({
          where: {
            houseId_monthKey: {
              houseId,
              monthKey: primaryMonthKey,
            },
          },
          update: {
            totalExpense: new Prisma.Decimal(totalExpense),
            totalPaid: new Prisma.Decimal(0),
          },
          create: {
            houseId,
            monthKey: primaryMonthKey,
            totalExpense: new Prisma.Decimal(totalExpense),
          },
        });

        const membershipIds = [...aggregate.keys()];
        await tx.settlementItem.deleteMany({
          where: {
            settlementId: settlement.id,
            membershipId: {
              notIn: membershipIds,
            },
          },
        });

        for (const [membershipId, values] of aggregate.entries()) {
          await tx.settlementItem.upsert({
            where: {
              settlementId_membershipId: {
                settlementId: settlement.id,
                membershipId,
              },
            },
            update: {
              allocatedAmount: new Prisma.Decimal(values.allocatedAmount),
              paidByUserAmount: new Prisma.Decimal(values.paidByUserAmount),
              netAmount: new Prisma.Decimal(values.allocatedAmount - values.paidByUserAmount),
              paidAmount: new Prisma.Decimal(0),
            },
            create: {
              settlementId: settlement.id,
              membershipId,
              allocatedAmount: new Prisma.Decimal(values.allocatedAmount),
              paidByUserAmount: new Prisma.Decimal(values.paidByUserAmount),
              netAmount: new Prisma.Decimal(values.allocatedAmount - values.paidByUserAmount),
              paidAmount: new Prisma.Decimal(0),
            },
          });
        }

        return tx.monthlySettlement.findUnique({
          where: { id: settlement.id },
          include: {
            items: {
              include: {
                membership: {
                  include: {
                    user: true,
                    room: true,
                  },
                },
              },
            },
          },
        });
      }

      const existingCumulative = settlementsForMonth.reduce<Map<string, { allocatedAmount: number; paidByUserAmount: number }>>(
        (map, settlement) => {
          for (const item of settlement.items) {
            const current = map.get(item.membershipId) ?? {
              allocatedAmount: 0,
              paidByUserAmount: 0,
            };

            current.allocatedAmount += Number(item.allocatedAmount);
            current.paidByUserAmount += Number(item.paidByUserAmount);
            map.set(item.membershipId, current);
          }

          return map;
        },
        new Map(),
      );

      const deltaAggregate = new Map<
        string,
        { allocatedAmount: number; paidByUserAmount: number; paidAmount: number }
      >();

      for (const [membershipId, values] of aggregate.entries()) {
        const existing = existingCumulative.get(membershipId) ?? {
          allocatedAmount: 0,
          paidByUserAmount: 0,
        };

        const deltaAllocated = values.allocatedAmount - existing.allocatedAmount;
        const deltaPaidByUser = values.paidByUserAmount - existing.paidByUserAmount;

        if (Math.abs(deltaAllocated) < 0.005 && Math.abs(deltaPaidByUser) < 0.005) {
          continue;
        }

        deltaAggregate.set(membershipId, {
          allocatedAmount: deltaAllocated,
          paidByUserAmount: deltaPaidByUser,
          paidAmount: 0,
        });
      }

      if (!deltaAggregate.size) {
        const latestSettlement = settlementsForMonth[settlementsForMonth.length - 1];
        return tx.monthlySettlement.findUnique({
          where: { id: latestSettlement.id },
          include: {
            items: {
              include: {
                membership: {
                  include: {
                    user: true,
                    room: true,
                  },
                },
              },
            },
          },
        });
      }

      const nextMonthKey = this.getNextVersionMonthKey(
        monthKey,
        settlementsForMonth.map((settlement) => settlement.monthKey),
      );

      const adjustmentTotal = [...deltaAggregate.values()].reduce(
        (sum, values) => sum + values.allocatedAmount - values.paidByUserAmount,
        0,
      );

      const settlement = await tx.monthlySettlement.create({
        data: {
          houseId,
          monthKey: nextMonthKey,
          totalExpense: new Prisma.Decimal(adjustmentTotal),
          totalPaid: new Prisma.Decimal(0),
          items: {
            create: [...deltaAggregate.entries()].map(([membershipId, values]) => ({
              membershipId,
              allocatedAmount: new Prisma.Decimal(values.allocatedAmount),
              paidByUserAmount: new Prisma.Decimal(values.paidByUserAmount),
              netAmount: new Prisma.Decimal(values.allocatedAmount - values.paidByUserAmount),
              paidAmount: new Prisma.Decimal(0),
            })),
          },
        },
      });

      return tx.monthlySettlement.findUnique({
        where: { id: settlement.id },
        include: {
          items: {
            include: {
              membership: {
                include: {
                  user: true,
                  room: true,
                },
              },
            },
          },
        },
      });
    });
  }

  listByHouse(houseId: string, month?: string) {
    const where: Prisma.MonthlySettlementWhereInput = { houseId };
    if (month) {
      where.monthKey = {
        startsWith: month,
      };
    }

    return this.prisma.monthlySettlement.findMany({
      where,
      include: {
        items: {
          include: {
            membership: {
              include: {
                user: true,
                room: true,
              },
            },
          },
        },
        payments: true,
      },
      orderBy: { monthKey: 'desc' },
    });
  }

  private getNextVersionMonthKey(baseMonthKey: string, existingMonthKeys: string[]) {
    const maxVersion = existingMonthKeys.reduce((max, monthKey) => {
      if (monthKey === baseMonthKey) {
        return Math.max(max, 1);
      }

      if (!monthKey.startsWith(`${baseMonthKey}-`)) {
        return max;
      }

      const version = Number(monthKey.slice(baseMonthKey.length + 1));
      return Number.isFinite(version) ? Math.max(max, version) : max;
    }, 1);

    return `${baseMonthKey}-${maxVersion + 1}`;
  }
}
