import { HouseRole, Prisma } from '@prisma/client';
import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpsertPaymentAccountDto } from './dto/upsert-payment-account.dto';

type PaymentAccountMetadata = {
  scope?: 'HOUSE' | 'USER' | null;
  ownerUserId?: string | null;
  bankName?: string | null;
  bankBin?: string | null;
  accountNumber?: string | null;
  staticQrImageUrl?: string | null;
};

type ManualPaymentAccountRecord = {
  paymentAccount: {
    id: string;
    accountName: string;
    accountRef: string;
  };
  metadata: PaymentAccountMetadata;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  list(houseId: string, status?: string) {
    return this.prisma.settlementPayment.findMany({
      where: {
        houseId,
        ...(status ? { status: status as never } : {}),
      },
      include: {
        membership: {
          include: {
            user: true,
            room: true,
          },
        },
        settlement: true,
        payee: true,
      },
      orderBy: [{ status: 'asc' }, { paidAt: 'desc' }, { id: 'desc' }],
    });
  }

  async getPaymentAccount(houseId: string) {
    const paymentAccount = await this.findHousePaymentAccount(houseId);
    return this.toPaymentAccountResponse(houseId, paymentAccount);
  }

  async getUserPaymentAccount(userId: string, houseId: string) {
    const paymentAccount = await this.findUserPaymentAccount(houseId, userId);
    return this.toPaymentAccountResponse(houseId, paymentAccount);
  }

  async upsertPaymentAccount(ownerUserId: string, dto: UpsertPaymentAccountDto) {
    const accountName = dto.accountName.trim();
    const paymentAccount = await this.upsertScopedPaymentAccount(dto.houseId, 'HOUSE', ownerUserId, {
      accountName,
      bankName: dto.bankName?.trim() || null,
      bankBin: dto.bankBin?.trim() || null,
      accountNumber: dto.accountNumber?.trim() || null,
      staticQrImageUrl: dto.staticQrImageUrl?.trim() || null,
    });

    return this.toPaymentAccountResponse(dto.houseId, paymentAccount);
  }

  async upsertUserPaymentAccount(ownerUserId: string, dto: UpsertPaymentAccountDto) {
    const paymentAccount = await this.upsertScopedPaymentAccount(dto.houseId, 'USER', ownerUserId, {
      accountName: dto.accountName.trim(),
      bankName: dto.bankName?.trim() || null,
      bankBin: dto.bankBin?.trim() || null,
      accountNumber: dto.accountNumber?.trim() || null,
      staticQrImageUrl: dto.staticQrImageUrl?.trim() || null,
    });

    return this.toPaymentAccountResponse(dto.houseId, paymentAccount);
  }

  async create(requesterUserId: string, dto: CreatePaymentDto) {
    const item = await this.prisma.settlementItem.findUnique({
      where: { id: dto.settlementLineId },
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
      throw new NotFoundException('Settlement item not found');
    }

    if (item.membership.userId !== requesterUserId) {
      throw new ForbiddenException('You do not have access to submit payment for this bill');
    }

    const remainingBalance = Math.max(Number(item.netAmount) - Number(item.paidAmount), 0);
    if (remainingBalance <= 0) {
      throw new BadRequestException('Bill has already been fully paid');
    }

    const pendingPayment = await this.prisma.settlementPayment.findFirst({
      where: {
        settlementId: item.settlementId,
        membershipId: item.membershipId,
        status: 'PENDING',
        ...(dto.payeeUserId ? { payeeUserId: dto.payeeUserId } : {}),
      },
    });

    if (pendingPayment) {
      throw new BadRequestException('A payment proof is already pending confirmation');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.settlementPayment.create({
        data: {
          settlementId: item.settlementId,
          houseId: item.settlement.houseId,
          membershipId: item.membershipId,
          payeeUserId: dto.payeeUserId,
          amount: new Prisma.Decimal(Math.min(dto.amount, remainingBalance)),
          provider: dto.gateway,
          providerRef: dto.transactionRef,
          proofImageUrl: dto.proofUrl,
          status: 'PENDING',
        },
      });

      const admins = await tx.houseMembership.findMany({
        where: {
          houseId: item.settlement.houseId,
          isActive: true,
          role: {
            in: [HouseRole.OWNER, HouseRole.MANAGER],
          },
        },
        select: {
          userId: true,
        },
      });

      if (admins.length) {
        await tx.notification.create({
          data: {
            houseId: item.settlement.houseId,
            title: 'Co thanh toan moi cho xac nhan',
            body: `${item.membership.user.fullName} da gui minh chung thanh toan cho ${item.membership.room?.name ?? item.membership.room?.code ?? 'bill hien tai'}.`,
            channel: 'IN_APP',
            scheduledAt: new Date(),
            status: 'SENT',
            recipients: {
              create: admins.map((admin) => ({
                userId: admin.userId,
                status: 'PENDING',
              })),
            },
          },
        });
      }

      await tx.notification.create({
        data: {
          houseId: item.settlement.houseId,
          title: 'Da gui minh chung thanh toan',
          body: 'He thong da ghi nhan minh chung cua ban. Chu tro se xac nhan de hoan tat bill.',
          channel: 'IN_APP',
          scheduledAt: new Date(),
          status: 'SENT',
          recipients: {
            create: [
              {
                userId: item.membership.userId,
                status: 'PENDING',
              },
            ],
          },
        },
      });

      return payment;
    });
  }

  async generateQr(requesterUserId: string, settlementLineId: string, payeeUserId?: string) {
    const item = await this.prisma.settlementItem.findUnique({
      where: { id: settlementLineId },
      include: {
        settlement: true,
        membership: true,
      },
    });

    if (!item) {
      throw new NotFoundException('Settlement item not found');
    }

    if (item.membership.userId !== requesterUserId) {
      throw new ForbiddenException('You do not have access to this bill');
    }

    const amount = payeeUserId
      ? await this.getPayeeBalance(item.settlementId, item.membershipId, item.settlement.houseId, item.settlement.monthKey, payeeUserId)
      : Math.max(Number(item.netAmount) - Number(item.paidAmount), 0);
    const content = payeeUserId
      ? `TRO-${item.settlement.houseId}-${item.id}-${payeeUserId}`
      : `TRO-${item.settlement.houseId}-${item.id}`;
    const receiver =
      (payeeUserId
        ? await this.resolveReceiverAccount(item.settlement.houseId, payeeUserId, content, amount)
        : await this.resolveReceiverAccount(item.settlement.houseId, null, content, amount)) ?? null;

    return {
      settlementLineId,
      amount,
      content,
      qrPayload: receiver?.accountRef ?? null,
      qrImageUrl: receiver?.qrImageUrl ?? null,
      receiverName: receiver?.accountName ?? null,
      bankName: receiver?.bankName ?? null,
      accountNumber: receiver?.accountNumber ?? null,
    };
  }

  async confirm(paymentId: string) {
    const payment = await this.prisma.settlementPayment.findUnique({
      where: { id: paymentId },
      include: {
        membership: {
          include: {
            user: true,
            room: true,
          },
        },
        settlement: true,
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    const item = await this.prisma.settlementItem.findUnique({
      where: {
        settlementId_membershipId: {
          settlementId: payment.settlementId,
          membershipId: payment.membershipId,
        },
      },
    });

    if (!item) {
      throw new NotFoundException('Settlement item not found');
    }

    return this.prisma.$transaction(async (tx) => {
      if (payment.status === 'SUCCEEDED') {
        return payment;
      }

      const updatedPayment = await tx.settlementPayment.update({
        where: { id: paymentId },
        data: {
          status: 'SUCCEEDED',
          paidAt: new Date(),
        },
      });

      const nextPaidAmount = Number(item.paidAmount) + Number(payment.amount);
      await tx.settlementItem.update({
        where: { id: item.id },
        data: {
          paidAmount: new Prisma.Decimal(nextPaidAmount),
        },
      });

      const settlementPayments = await tx.settlementPayment.findMany({
        where: {
          settlementId: payment.settlementId,
          status: 'SUCCEEDED',
        },
      });

      const totalPaid = settlementPayments.reduce(
        (sum, settlementPayment) => sum + Number(settlementPayment.amount),
        0,
      );

      await tx.monthlySettlement.update({
        where: { id: payment.settlementId },
        data: {
          totalPaid: new Prisma.Decimal(totalPaid),
        },
      });

      await tx.notification.create({
        data: {
          houseId: payment.houseId,
          title: 'Thanh toan da duoc xac nhan',
          body: `Chu tro da xac nhan giao dich ${payment.providerRef ?? payment.id}. Bill cua ban da duoc cap nhat.`,
          channel: 'IN_APP',
          scheduledAt: new Date(),
          status: 'SENT',
          recipients: {
            create: [
              {
                userId: payment.membership.userId,
                status: 'PENDING',
              },
            ],
          },
        },
      });

      return updatedPayment;
    });
  }

  private parsePaymentAccountMetadata(accountRef?: string | null): PaymentAccountMetadata {
    if (!accountRef) {
      return {};
    }

    try {
      const parsed = JSON.parse(accountRef) as PaymentAccountMetadata;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      if (/^https?:\/\//i.test(accountRef)) {
        return { staticQrImageUrl: accountRef };
      }
    }

    return {};
  }

  private async listManualPaymentAccounts(houseId: string) {
    const paymentAccounts = await this.prisma.paymentAccount.findMany({
      where: {
        houseId,
        provider: 'MANUAL',
        isActive: true,
      },
    });

    return paymentAccounts.map((paymentAccount) => ({
      paymentAccount,
      metadata: this.parsePaymentAccountMetadata(paymentAccount.accountRef),
    }));
  }

  async getManualPaymentAccountSnapshot(houseId: string) {
    return this.listManualPaymentAccounts(houseId);
  }

  private async findHousePaymentAccount(houseId: string) {
    const paymentAccounts = await this.listManualPaymentAccounts(houseId);
    return (
      paymentAccounts.find(({ metadata }) => (metadata.scope ?? 'HOUSE') === 'HOUSE')?.paymentAccount ??
      null
    );
  }

  private async findUserPaymentAccount(houseId: string, ownerUserId: string) {
    const paymentAccounts = await this.listManualPaymentAccounts(houseId);
    return (
      paymentAccounts.find(
        ({ metadata }) => metadata.scope === 'USER' && metadata.ownerUserId === ownerUserId,
      )?.paymentAccount ?? null
    );
  }

  private async upsertScopedPaymentAccount(
    houseId: string,
    scope: 'HOUSE' | 'USER',
    ownerUserId: string,
    config: Omit<PaymentAccountMetadata, 'scope' | 'ownerUserId'> & { accountName: string },
  ) {
    if (!config.accountName) {
      throw new BadRequestException('Account name is required');
    }

    if (!config.staticQrImageUrl && !(config.bankBin && config.accountNumber)) {
      throw new BadRequestException('Provide either VietQR bank info or a static QR image');
    }

    const paymentAccounts = await this.listManualPaymentAccounts(houseId);
    const target = paymentAccounts.find(({ metadata }) =>
      scope === 'HOUSE'
        ? (metadata.scope ?? 'HOUSE') === 'HOUSE'
        : metadata.scope === 'USER' && metadata.ownerUserId === ownerUserId,
    )?.paymentAccount;

    const duplicateIds = paymentAccounts
      .filter(({ paymentAccount, metadata }) => {
        if (target?.id === paymentAccount.id) {
          return false;
        }

        return scope === 'HOUSE'
          ? (metadata.scope ?? 'HOUSE') === 'HOUSE'
          : metadata.scope === 'USER' && metadata.ownerUserId === ownerUserId;
      })
      .map(({ paymentAccount }) => paymentAccount.id);

    const metadata = this.serializePaymentAccountMetadata({
      scope,
      ownerUserId,
      bankName: config.bankName ?? null,
      bankBin: config.bankBin ?? null,
      accountNumber: config.accountNumber ?? null,
      staticQrImageUrl: config.staticQrImageUrl ?? null,
    });

    const paymentAccount = target
      ? await this.prisma.paymentAccount.update({
          where: { id: target.id },
          data: {
            accountName: config.accountName,
            accountRef: metadata,
            isActive: true,
          },
        })
      : await this.prisma.paymentAccount.create({
          data: {
            houseId,
            provider: 'MANUAL',
            accountName: config.accountName,
            accountRef: metadata,
            isActive: true,
          },
        });

    if (duplicateIds.length) {
      await this.prisma.paymentAccount.updateMany({
        where: {
          id: {
            in: duplicateIds,
          },
        },
        data: {
          isActive: false,
        },
      });
    }

    return paymentAccount;
  }

  private toPaymentAccountResponse(
    houseId: string,
    paymentAccount: { id: string; accountName: string; accountRef: string } | null,
  ) {
    const metadata = this.parsePaymentAccountMetadata(paymentAccount?.accountRef);

    return {
      id: paymentAccount?.id ?? null,
      houseId,
      accountName: paymentAccount?.accountName ?? '',
      bankName: metadata.bankName ?? '',
      bankBin: metadata.bankBin ?? '',
      accountNumber: metadata.accountNumber ?? '',
      staticQrImageUrl: metadata.staticQrImageUrl ?? null,
      previewQrImageUrl:
        metadata.bankBin && metadata.accountNumber && paymentAccount?.accountName
          ? this.buildVietQrImageUrl(
              metadata.bankBin,
              metadata.accountNumber,
              paymentAccount.accountName,
              'TRO-QR-PREVIEW',
            )
          : metadata.staticQrImageUrl ?? null,
      supportsDynamicQr: Boolean(metadata.bankBin && metadata.accountNumber),
    };
  }

  async resolveReceiverAccount(
    houseId: string,
    receiverUserId: string | null,
    transferContent: string,
    amount?: number,
  ) {
    const paymentAccounts = await this.listManualPaymentAccounts(houseId);
    return this.resolveReceiverAccountFromSnapshot(
      paymentAccounts,
      receiverUserId,
      transferContent,
      amount,
    );
  }

  resolveReceiverAccountFromSnapshot(
    paymentAccounts: ManualPaymentAccountRecord[],
    receiverUserId: string | null,
    transferContent: string,
    amount?: number,
  ) {
    const houseAccount =
      paymentAccounts.find(({ metadata }) => (metadata.scope ?? 'HOUSE') === 'HOUSE') ?? null;
    const userAccount =
      receiverUserId
        ? paymentAccounts.find(
            ({ metadata }) => metadata.scope === 'USER' && metadata.ownerUserId === receiverUserId,
          ) ?? null
        : null;

    const selectedAccount =
      userAccount ??
      (receiverUserId
        ? houseAccount?.metadata.ownerUserId === receiverUserId
          ? houseAccount
          : null
        : houseAccount);

    if (!selectedAccount) {
      return null;
    }

    const qrImageUrl =
      selectedAccount.metadata.bankBin &&
      selectedAccount.metadata.accountNumber &&
      selectedAccount.paymentAccount.accountName
        ? this.buildVietQrImageUrl(
            selectedAccount.metadata.bankBin,
            selectedAccount.metadata.accountNumber,
            selectedAccount.paymentAccount.accountName,
            transferContent,
            amount,
          )
        : selectedAccount.metadata.staticQrImageUrl ?? null;

    return {
      accountRef: selectedAccount.paymentAccount.accountRef,
      accountName: selectedAccount.paymentAccount.accountName,
      bankName: selectedAccount.metadata.bankName ?? null,
      accountNumber: selectedAccount.metadata.accountNumber ?? null,
      qrImageUrl,
    };
  }

  private async getPayeeBalance(
    settlementId: string,
    membershipId: string,
    houseId: string,
    monthKey: string,
    payeeUserId: string,
  ) {
    const period = this.parseMonthKey(monthKey);
    const [allocations, settlementItems, payments] = await Promise.all([
      this.prisma.expenseAllocation.findMany({
        where: {
          membershipId,
          expense: {
            houseId,
            monthKey: period.baseMonthKey,
            payerUserId: payeeUserId,
            status: 'CONFIRMED',
          },
        },
        include: {
          expense: true,
        },
        orderBy: [{ expense: { expenseDate: 'asc' } }, { id: 'asc' }],
      }),
      this.prisma.settlementItem.findMany({
        where: {
          membershipId,
          settlement: {
            houseId,
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
          settlementId,
          membershipId,
          payeeUserId,
          status: 'SUCCEEDED',
        },
      }),
    ]);

    const allocationBySettlement = this.partitionAllocationsBySettlement(
      allocations,
      settlementItems.sort((left, right) =>
        this.compareMonthKeys(left.settlement.monthKey, right.settlement.monthKey),
      ),
    );

    const allocatedAmount = (allocationBySettlement.get(settlementId) ?? []).reduce(
      (sum, value) => sum + value,
      0,
    );
    const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);

    return Number(Math.max(allocatedAmount - paidAmount, 0).toFixed(2));
  }

  private partitionAllocationsBySettlement(
    allocations: Array<{
      amount: Prisma.Decimal;
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
      remainingAmount: Number(allocation.amount),
    }));
    const allocationBySettlement = new Map<string, number[]>();
    let fragmentIndex = 0;

    for (const settlementItem of settlementItems) {
      let remainingTarget = Number(settlementItem.allocatedAmount);
      const bucket: number[] = [];

      while (remainingTarget > 0.005 && fragmentIndex < fragments.length) {
        const fragment = fragments[fragmentIndex];
        const takeAmount = Math.min(fragment.remainingAmount, remainingTarget);

        if (takeAmount > 0.005) {
          bucket.push(Number(takeAmount.toFixed(2)));
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

  private serializePaymentAccountMetadata(metadata: PaymentAccountMetadata) {
    return JSON.stringify({
      scope: metadata.scope ?? null,
      ownerUserId: metadata.ownerUserId ?? null,
      bankName: metadata.bankName ?? null,
      bankBin: metadata.bankBin ?? null,
      accountNumber: metadata.accountNumber ?? null,
      staticQrImageUrl: metadata.staticQrImageUrl ?? null,
    });
  }

  private buildVietQrImageUrl(
    bankBin: string,
    accountNumber: string,
    accountName: string,
    transferContent: string,
    amount?: number,
  ) {
    const url = new URL(`https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png`);
    url.searchParams.set('accountName', accountName);
    url.searchParams.set('addInfo', transferContent);

    if (amount && amount > 0) {
      url.searchParams.set('amount', String(Math.round(amount)));
    }

    return url.toString();
  }
}
