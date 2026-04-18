import { Logger, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { performance } from 'node:perf_hooks';
import { PrismaService } from 'src/common/prisma/prisma.service';

type AggregateValues = {
  allocatedAmount: number;
  paidByUserAmount: number;
  paidAmount: number;
};

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateMonthlySettlement(houseId: string, month: number, year: number, _dueDate: Date) {
    const monthKey = `${year}-${`${month}`.padStart(2, '0')}`;
    const snapshotStart = performance.now();
    const snapshot = await this.readMonthlySnapshot(houseId, monthKey);

    this.logger.log(
      `[generateMonthlySettlement] snapshot ${houseId}/${monthKey} completed in ${Math.round(performance.now() - snapshotStart)}ms`,
    );

    const writeStart = performance.now();

    const settlement = await this.prisma.$transaction(async (tx) => {
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
        (item) =>
          Number(item.totalPaid) > 0 ||
          item.payments.some((payment) => payment.status === 'SUCCEEDED'),
      );

      if (!settlementsForMonth.length || !hasPaidSettlement) {
        const primaryMonthKey = settlementsForMonth[0]?.monthKey ?? monthKey;
        const settlementRecord = await tx.monthlySettlement.upsert({
          where: {
            houseId_monthKey: {
              houseId,
              monthKey: primaryMonthKey,
            },
          },
          update: {
            totalExpense: new Prisma.Decimal(snapshot.totalExpense),
            totalPaid: new Prisma.Decimal(0),
          },
          create: {
            houseId,
            monthKey: primaryMonthKey,
            totalExpense: new Prisma.Decimal(snapshot.totalExpense),
          },
        });

        const existingItems =
          settlementsForMonth.find((item) => item.monthKey === settlementRecord.monthKey)?.items ??
          [];
        await this.syncSettlementItems(tx, settlementRecord.id, snapshot.aggregate, existingItems);

        return tx.monthlySettlement.findUnique({
          where: { id: settlementRecord.id },
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

      const existingCumulative = settlementsForMonth.reduce<
        Map<string, { allocatedAmount: number; paidByUserAmount: number }>
      >((map, settlementItem) => {
        for (const item of settlementItem.items) {
          const current = map.get(item.membershipId) ?? {
            allocatedAmount: 0,
            paidByUserAmount: 0,
          };

          current.allocatedAmount += Number(item.allocatedAmount);
          current.paidByUserAmount += Number(item.paidByUserAmount);
          map.set(item.membershipId, current);
        }

        return map;
      }, new Map());

      const deltaAggregate = new Map<string, AggregateValues>();

      for (const [membershipId, values] of snapshot.aggregate.entries()) {
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
        settlementsForMonth.map((item) => item.monthKey),
      );

      const adjustmentTotal = [...deltaAggregate.values()].reduce(
        (sum, values) => sum + values.allocatedAmount - values.paidByUserAmount,
        0,
      );

      const settlementRecord = await tx.monthlySettlement.create({
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
        where: { id: settlementRecord.id },
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

    this.logger.log(
      `[generateMonthlySettlement] write ${houseId}/${monthKey} completed in ${Math.round(performance.now() - writeStart)}ms`,
    );

    return settlement;
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

  private async readMonthlySnapshot(houseId: string, monthKey: string) {
    const [memberships, expenseTotals, payerTotals, allocationTotals] = await Promise.all([
      this.prisma.houseMembership.findMany({
        where: {
          houseId,
          isActive: true,
        },
        select: {
          id: true,
          userId: true,
        },
      }),
      this.prisma.expense.aggregate({
        where: {
          houseId,
          monthKey,
          status: 'CONFIRMED',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.expense.groupBy({
        by: ['payerUserId'],
        where: {
          houseId,
          monthKey,
          status: 'CONFIRMED',
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.expenseAllocation.groupBy({
        by: ['membershipId'],
        where: {
          expense: {
            houseId,
            monthKey,
            status: 'CONFIRMED',
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const aggregate = new Map<string, AggregateValues>(
      memberships.map((membership) => [
        membership.id,
        {
          allocatedAmount: 0,
          paidByUserAmount: 0,
          paidAmount: 0,
        },
      ]),
    );
    const membershipByUserId = new Map(
      memberships.map((membership) => [membership.userId, membership.id]),
    );

    for (const allocation of allocationTotals) {
      const item = aggregate.get(allocation.membershipId);
      if (item) {
        item.allocatedAmount = Number(allocation._sum.amount ?? 0);
      }
    }

    for (const payer of payerTotals) {
      const membershipId = membershipByUserId.get(payer.payerUserId);
      if (!membershipId) {
        continue;
      }

      const item = aggregate.get(membershipId);
      if (item) {
        item.paidByUserAmount = Number(payer._sum.amount ?? 0);
      }
    }

    return {
      aggregate,
      totalExpense: Number(expenseTotals._sum.amount ?? 0),
    };
  }

  private async syncSettlementItems(
    tx: Prisma.TransactionClient,
    settlementId: string,
    aggregate: Map<string, AggregateValues>,
    existingItems: Array<{
      id: string;
      membershipId: string;
      allocatedAmount: Prisma.Decimal;
      paidByUserAmount: Prisma.Decimal;
      netAmount: Prisma.Decimal;
      paidAmount: Prisma.Decimal;
    }>,
  ) {
    const existingByMembershipId = new Map(
      existingItems.map((item) => [item.membershipId, item]),
    );
    const idsToDelete = existingItems
      .filter((item) => !aggregate.has(item.membershipId))
      .map((item) => item.id);

    if (idsToDelete.length) {
      await tx.settlementItem.deleteMany({
        where: {
          settlementId,
          id: {
            in: idsToDelete,
          },
        },
      });
    }

    const toCreate: Prisma.SettlementItemCreateManyInput[] = [];
    const toUpdate: Array<{
      id: string;
      allocatedAmount: number;
      paidByUserAmount: number;
      netAmount: number;
    }> = [];

    for (const [membershipId, values] of aggregate.entries()) {
      const netAmount = values.allocatedAmount - values.paidByUserAmount;
      const existingItem = existingByMembershipId.get(membershipId);

      if (!existingItem) {
        toCreate.push({
          settlementId,
          membershipId,
          allocatedAmount: new Prisma.Decimal(values.allocatedAmount),
          paidByUserAmount: new Prisma.Decimal(values.paidByUserAmount),
          netAmount: new Prisma.Decimal(netAmount),
          paidAmount: new Prisma.Decimal(0),
        });
        continue;
      }

      const allocatedChanged =
        Math.abs(Number(existingItem.allocatedAmount) - values.allocatedAmount) >= 0.005;
      const paidByUserChanged =
        Math.abs(Number(existingItem.paidByUserAmount) - values.paidByUserAmount) >= 0.005;
      const netChanged = Math.abs(Number(existingItem.netAmount) - netAmount) >= 0.005;
      const paidAmountChanged = Math.abs(Number(existingItem.paidAmount)) >= 0.005;

      if (allocatedChanged || paidByUserChanged || netChanged || paidAmountChanged) {
        toUpdate.push({
          id: existingItem.id,
          allocatedAmount: values.allocatedAmount,
          paidByUserAmount: values.paidByUserAmount,
          netAmount,
        });
      }
    }

    if (toCreate.length) {
      await tx.settlementItem.createMany({
        data: toCreate,
      });
    }

    await Promise.all(
      toUpdate.map((item) =>
        tx.settlementItem.update({
          where: { id: item.id },
          data: {
            allocatedAmount: new Prisma.Decimal(item.allocatedAmount),
            paidByUserAmount: new Prisma.Decimal(item.paidByUserAmount),
            netAmount: new Prisma.Decimal(item.netAmount),
            paidAmount: new Prisma.Decimal(0),
          },
        }),
      ),
    );
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
