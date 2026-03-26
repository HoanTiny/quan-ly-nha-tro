import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

type CreateInAppNotificationInput = {
  houseId?: string | null;
  title: string;
  body: string;
  recipientUserIds: string[];
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async listByUser(userId: string) {
    if (!userId) {
      return [];
    }

    const recipients = await this.prisma.notificationRecipient.findMany({
      where: { userId },
      include: { notification: true },
      orderBy: {
        notification: {
          createdAt: 'desc',
        },
      },
    });

    return recipients.map((recipient) => ({
      id: recipient.id,
      title: recipient.notification.title,
      body: recipient.notification.body,
      read: recipient.status === 'SENT',
      createdAt: recipient.notification.createdAt.toISOString(),
      status: recipient.status,
    }));
  }

  async markRead(notificationId: string, userId: string) {
    const recipient = await this.prisma.notificationRecipient.findUnique({
      where: { id: notificationId },
    });

    if (!recipient || recipient.userId !== userId) {
      throw new NotFoundException('Notification recipient not found');
    }

    return this.prisma.notificationRecipient.update({
      where: { id: notificationId },
      data: {
        status: 'SENT',
      },
    });
  }

  async createInAppNotification(input: CreateInAppNotificationInput) {
    const recipientUserIds = [...new Set(input.recipientUserIds.filter(Boolean))];

    if (!recipientUserIds.length) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        houseId: input.houseId ?? null,
        title: input.title,
        body: input.body,
        channel: 'IN_APP',
        scheduledAt: new Date(),
        status: 'SENT',
        recipients: {
          create: recipientUserIds.map((userId) => ({
            userId,
            status: 'PENDING',
          })),
        },
      },
      include: {
        recipients: true,
      },
    });

    for (const recipient of notification.recipients) {
      this.notificationsGateway.emitNotificationToUsers([recipient.userId], {
        id: recipient.id,
        title: notification.title,
        body: notification.body,
        read: false,
        createdAt: notification.createdAt.toISOString(),
      });
    }

    return notification;
  }

  emitBillsUpdated(userIds: string[], houseId: string, monthKey: string) {
    const recipientUserIds = [...new Set(userIds.filter(Boolean))];

    if (!recipientUserIds.length) {
      return;
    }

    this.notificationsGateway.emitBillsUpdatedToUsers(recipientUserIds, {
      houseId,
      monthKey,
      reason: 'expense_created',
    });
  }
}
