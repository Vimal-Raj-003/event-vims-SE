import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getNotifications(attendeeId: string, page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { attendeeId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.notification.count({ where: { attendeeId } }),
      this.prisma.notification.count({ where: { attendeeId, isRead: false } }),
    ]);

    return {
      data: notifications,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      unreadCount,
    };
  }

  async markAsRead(notificationId: string, attendeeId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, attendeeId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    return { message: 'Notification marked as read' };
  }

  async markAllAsRead(attendeeId: string) {
    await this.prisma.notification.updateMany({
      where: { attendeeId, isRead: false },
      data: { isRead: true },
    });

    return { message: 'All notifications marked as read' };
  }

  async subscribePush(attendeeId: string, dto: {
    endpoint: string;
    p256dh: string;
    auth: string;
  }) {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      update: { p256dh: dto.p256dh, auth: dto.auth },
      create: { attendeeId, endpoint: dto.endpoint, p256dh: dto.p256dh, auth: dto.auth },
    });

    this.logger.log(`Push subscription registered for attendee ${attendeeId}`);
    return { message: 'Push subscription registered' };
  }
}
