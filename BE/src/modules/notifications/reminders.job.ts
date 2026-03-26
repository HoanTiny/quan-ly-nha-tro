import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from 'src/common/prisma/prisma.service';

@Injectable()
export class RemindersJob {
  constructor(private readonly prisma: PrismaService) {}

  @Cron('0 0 8 * * *')
  async sendDueReminders() {
    const settlements = await this.prisma.monthlySettlement.findMany({
      where: {
        status: {
          in: ['OPEN', 'PARTIALLY_PAID', 'OVERDUE'],
        },
      },
      include: {
        items: {
          include: {
            membership: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    for (const settlement of settlements) {
      const dueDate = this.toDueDate(settlement.monthKey);
      const now = new Date();
      const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / 86400000);

      if (![3, 1, 0, -1].includes(daysLeft)) {
        continue;
      }

      const targetItems = settlement.items.filter((item) => {
        const amount = Math.max(Number(item.netAmount), 0);
        return amount - Number(item.paidAmount) > 0;
      });

      for (const item of targetItems) {
        const notification = await this.prisma.notification.create({
          data: {
            houseId: settlement.houseId,
            title: daysLeft >= 0 ? 'Nhac dong tien phong' : 'Da qua han thanh toan',
            body: `Ban con ${Math.max(Number(item.netAmount) - Number(item.paidAmount), 0)} VND can thanh toan cho ky ${settlement.monthKey}.`,
            channel: 'IN_APP',
            scheduledAt: now,
            status: 'PENDING',
          },
        });

        await this.prisma.notificationRecipient.create({
          data: {
            notificationId: notification.id,
            userId: item.membership.userId,
            status: 'PENDING',
          },
        });
      }
    }
  }

  private toDueDate(monthKey: string) {
    const [yearValue, monthValue] = monthKey.split('-').map(Number);
    return new Date(yearValue, monthValue, 10);
  }
}
