import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionStatus } from '@prisma/client';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getActivities(
    attendeeId: string,
    eventId: string,
    page: number = 1,
    pageSize: number = 20,
  ) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee || attendee.eventId !== eventId) {
      throw new NotFoundException('Attendee not found in this event');
    }

    // Get accepted connection IDs for showing connection activities
    const connections = await this.prisma.connectionRequest.findMany({
      where: {
        eventId,
        status: ConnectionStatus.ACCEPTED,
        OR: [{ senderId: attendeeId }, { receiverId: attendeeId }],
      },
      select: { senderId: true, receiverId: true },
    });

    const connectedIds = new Set<string>();
    for (const conn of connections) {
      connectedIds.add(conn.senderId);
      connectedIds.add(conn.receiverId);
    }

    const skip = (page - 1) * pageSize;

    // Own activities + connected attendees' major activities
    const [activities, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: {
          eventId,
          OR: [
            { attendeeId },
            {
              attendeeId: { in: Array.from(connectedIds) },
              type: { in: ['connection_made', 'profile_completed'] },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.activity.count({
        where: {
          eventId,
          OR: [
            { attendeeId },
            {
              attendeeId: { in: Array.from(connectedIds) },
              type: { in: ['connection_made', 'profile_completed'] },
            },
          ],
        },
      }),
    ]);

    return {
      data: activities,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }
}
