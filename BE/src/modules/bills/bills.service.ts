import { Prisma } from '@prisma/client';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async listForUser(userId: string, month?: string) {
    if (!userId) {
      throw new BadRequestException('userId is required');
    }

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

    const items = await this.prisma.settlementItem.findMany({
      where,
      include: {
        settlement: true,
        membership: {
          include: {
            user: true,
            room: true,
          },
        },
      },
    });

    return items
      .sort((left, right) =>
        this.compareMonthKeys(right.settlement.monthKey, left.settlement.monthKey),
      )
      .map((item) => {
        const period = this.parseMonthKey(item.settlement.monthKey);
        const dueDate = this.toDueDate(item.settlement.monthKey);
        const amount = Math.max(Number(item.netAmount), 0);
        const balance = Math.max(amount - Number(item.paidAmount), 0);

        return {
          id: item.id,
          roomId: item.membership.roomId ?? '',
          roomName:
            item.membership.room?.name ?? item.membership.room?.code ?? 'Chua gan phong',
          memberId: item.membership.userId,
          memberName: item.membership.user.fullName,
          amount,
          totalPaid: Number(item.paidAmount),
          balance,
          dueDate: dueDate.toISOString(),
          status: this.toBillStatus(balance, dueDate),
          month: period.month,
          year: period.year,
          monthKey: item.settlement.monthKey,
          version: period.version,
          periodLabel:
            period.version > 1
              ? `Ky ${period.month}/${period.year} - bo sung ${period.version - 1}`
              : `Ky ${period.month}/${period.year}`,
        };
      });
  }

  async findDetail(billId: string, requesterUserId: string) {
    const item = await this.prisma.settlementItem.findUnique({
      where: { id: billId },
      include: {
        settlement: true,
        membership: {
          include: {
            user: true,
            room: true,
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Bill not found');
    }

    if (item.membership.userId !== requesterUserId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    const period = this.parseMonthKey(item.settlement.monthKey);
    const [allocations, settlementItems, payments] = await Promise.all([
      this.prisma.expenseAllocation.findMany({
        where: {
          membershipId: item.membershipId,
          expense: {
            monthKey: period.baseMonthKey,
            houseId: item.settlement.houseId,
            status: 'CONFIRMED',
          },
        },
        include: {
          expense: {
            include: {
              payer: true,
            },
          },
        },
        orderBy: [{ expense: { expenseDate: 'asc' } }, { id: 'asc' }],
      }),
      this.prisma.settlementItem.findMany({
        where: {
          membershipId: item.membershipId,
          settlement: {
            houseId: item.settlement.houseId,
            monthKey: {
              startsWith: period.baseMonthKey,
            },
          },
        },
        include: {
          settlement: true,
        },
      }),
      this.prisma.settlementPayment.findMany({
        where: {
          settlementId: item.settlementId,
          membershipId: item.membershipId,
        },
        include: {
          payee: true,
        },
        orderBy: { paidAt: 'desc' },
      }),
    ]);

    const settlementAllocations = this.partitionAllocationsBySettlement(
      allocations,
      settlementItems.sort((left, right) =>
        this.compareMonthKeys(left.settlement.monthKey, right.settlement.monthKey),
      ),
    );

    const dueDate = this.toDueDate(item.settlement.monthKey);
    const amount = Math.max(Number(item.netAmount), 0);
    const balance = Math.max(amount - Number(item.paidAmount), 0);
    const currentAllocations = (settlementAllocations.get(item.settlementId) ?? []).filter(
      (allocation) => allocation.payerUserId !== item.membership.userId,
    );
    const paymentAccountSnapshot = await this.paymentsService.getManualPaymentAccountSnapshot(
      item.settlement.houseId,
    );
    const payees = await Promise.all(
      [...new Map(currentAllocations.map((allocation) => [allocation.payerUserId, allocation])).values()].map(
        async (allocation) => {
          const payeeItems = currentAllocations.filter(
            (candidate) => candidate.payerUserId === allocation.payerUserId,
          );
          const totalAmount = payeeItems.reduce((sum, candidate) => sum + candidate.shareAmount, 0);
          const paidAmount = payments
            .filter(
              (payment) =>
                payment.status === 'SUCCEEDED' && payment.payeeUserId === allocation.payerUserId,
            )
            .reduce((sum, payment) => sum + Number(payment.amount), 0);
          const receiver = this.paymentsService.resolveReceiverAccountFromSnapshot(
            paymentAccountSnapshot,
            allocation.payerUserId,
            `TRO-${item.settlement.houseId}-${item.id}-${allocation.payerUserId}`,
            Math.max(totalAmount - paidAmount, 0),
          );

          return {
            userId: allocation.payerUserId,
            fullName: allocation.payerName,
            amount: Number(totalAmount.toFixed(2)),
            paidAmount: Number(paidAmount.toFixed(2)),
            balance: Number(Math.max(totalAmount - paidAmount, 0).toFixed(2)),
            qrImageUrl: receiver?.qrImageUrl ?? null,
            receiverName: receiver?.accountName ?? null,
            bankName: receiver?.bankName ?? null,
            accountNumber: receiver?.accountNumber ?? null,
            transferContent: `TRO-${item.settlement.houseId}-${item.id}-${allocation.payerUserId}`,
            items: payeeItems,
          };
        },
      ),
    );

    return {
      id: item.id,
      roomId: item.membership.roomId ?? '',
      roomName: item.membership.room?.name ?? item.membership.room?.code ?? 'Chua gan phong',
      memberId: item.membership.userId,
      memberName: item.membership.user.fullName,
      memberEmail: item.membership.user.email,
      amount,
      totalPaid: Number(item.paidAmount),
      balance,
      dueDate: dueDate.toISOString(),
      status: this.toBillStatus(balance, dueDate),
      month: period.month,
      year: period.year,
      monthKey: item.settlement.monthKey,
      version: period.version,
      periodLabel:
        period.version > 1
          ? `Ky ${period.month}/${period.year} - bo sung ${period.version - 1}`
          : `Ky ${period.month}/${period.year}`,
      items: currentAllocations.map((allocation) => ({
        expenseId: allocation.expenseId,
        title: allocation.title,
        category: allocation.category,
        expenseDate: allocation.expenseDate,
        shareAmount: allocation.shareAmount,
        receiptImageUrl: allocation.receiptImageUrl ?? null,
      })),
      payees,
      payments: payments.map((payment) => ({
        id: payment.id,
        amount: Number(payment.amount),
        gateway: payment.provider,
        status: payment.status,
        proofUrl: payment.proofImageUrl ?? null,
        transactionRef: payment.providerRef ?? null,
        paidAt: payment.paidAt?.toISOString() ?? null,
        payeeUserId: payment.payeeUserId ?? null,
        payeeName: payment.payee?.fullName ?? null,
      })),
    };
  }

  private partitionAllocationsBySettlement(
    allocations: Array<{
      expenseId: string;
      amount: Prisma.Decimal;
      expense: {
        title: string;
        category: string;
        expenseDate: Date;
        receiptImageUrl?: string | null;
        payerUserId: string;
        payer: {
          fullName: string;
        };
      };
    }>,
    settlementItems: Array<{
      settlementId: string;
      allocatedAmount: Prisma.Decimal;
      settlement: {
        monthKey: string;
      };
    }>,
  ) {
    const fragments = allocations.map((allocation) => ({
      ...allocation,
      remainingAmount: Number(allocation.amount),
    }));
    const allocationBySettlement = new Map<
      string,
      Array<{
        expenseId: string;
        title: string;
        category: string;
        expenseDate: string;
        shareAmount: number;
        receiptImageUrl?: string | null;
        payerUserId: string;
        payerName: string;
      }>
    >();
    let fragmentIndex = 0;

    for (const settlementItem of settlementItems) {
      let remainingTarget = Number(settlementItem.allocatedAmount);
      const bucket: Array<{
        expenseId: string;
        title: string;
        category: string;
        expenseDate: string;
        shareAmount: number;
        receiptImageUrl?: string | null;
        payerUserId: string;
        payerName: string;
      }> = [];

      while (remainingTarget > 0.005 && fragmentIndex < fragments.length) {
        const fragment = fragments[fragmentIndex];
        const takeAmount = Math.min(fragment.remainingAmount, remainingTarget);

        if (takeAmount > 0.005) {
          bucket.push({
            expenseId: fragment.expenseId,
            title: fragment.expense.title,
            category: fragment.expense.category,
            expenseDate: fragment.expense.expenseDate.toISOString(),
            shareAmount: Number(takeAmount.toFixed(2)),
            receiptImageUrl: fragment.expense.receiptImageUrl ?? null,
            payerUserId: fragment.expense.payerUserId,
            payerName: fragment.expense.payer.fullName,
          });
        }

        fragment.remainingAmount = Number((fragment.remainingAmount - takeAmount).toFixed(2));
        remainingTarget = Number((remainingTarget - takeAmount).toFixed(2));

        if (fragment.remainingAmount <= 0.005) {
          fragmentIndex += 1;
        }
      }

      allocationBySettlement.set(settlementItem.settlementId, bucket);
    }

    return allocationBySettlement;
  }

  private parseMonthKey(monthKey: string) {
    const [yearPart, monthPart, versionPart] = monthKey.split('-');
    const year = Number(yearPart);
    const month = Number(monthPart);
    const version = Number(versionPart || '1');

    return {
      year,
      month,
      version: Number.isFinite(version) && version > 0 ? version : 1,
      baseMonthKey: `${yearPart}-${monthPart}`,
    };
  }

  private compareMonthKeys(left: string, right: string) {
    const leftPeriod = this.parseMonthKey(left);
    const rightPeriod = this.parseMonthKey(right);

    if (leftPeriod.year !== rightPeriod.year) {
      return leftPeriod.year - rightPeriod.year;
    }

    if (leftPeriod.month !== rightPeriod.month) {
      return leftPeriod.month - rightPeriod.month;
    }

    return leftPeriod.version - rightPeriod.version;
  }

  private toDueDate(monthKey: string) {
    const { year, month } = this.parseMonthKey(monthKey);
    return new Date(year, month - 1, 10);
  }

  private toBillStatus(balance: number, dueDate: Date) {
    if (balance <= 0) {
      return 'paid';
    }

    return dueDate.getTime() < Date.now() ? 'overdue' : 'pending_payment';
  }
}
