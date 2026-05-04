import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ConnectionStatus, EventStatus } from '@prisma/client';

type ActivityType =
  | 'attendee_registered'
  | 'announcement_sent'
  | 'attendees_milestone'
  | 'connection_milestone';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  timestamp: Date;
  relatedEntityId?: string;
}

const ATTENDEE_THRESHOLDS = [25, 50, 100, 250, 500];
const CONNECTION_THRESHOLDS = [50, 100, 250, 500, 1000];
const LOOKBACK_DAYS = 30;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventActivity(
    eventId: string,
    user: CurrentUserData,
    page: number = 1,
    pageSize: number = 25,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== user.organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    const lookbackStart = new Date(
      Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const [attendees, announcements] = await Promise.all([
      this.prisma.attendee.findMany({
        where: { eventId, registeredAt: { gte: lookbackStart } },
        orderBy: { registeredAt: 'desc' },
        take: 100,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          registeredAt: true,
        },
      }),
      this.prisma.announcement.findMany({
        where: { eventId, sentAt: { gte: lookbackStart } },
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          title: true,
          recipientCount: true,
          sentAt: true,
        },
      }),
    ]);

    const items: ActivityItem[] = [];

    for (const a of attendees) {
      const fullName = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || 'A new attendee';
      const body = a.company ? `${fullName} · ${a.company}` : fullName;
      items.push({
        id: `attendee_registered-${a.id}`,
        type: 'attendee_registered',
        title: 'New attendee',
        body,
        timestamp: a.registeredAt,
        relatedEntityId: a.id,
      });
    }

    for (const ann of announcements) {
      if (!ann.sentAt) continue;
      items.push({
        id: `announcement_sent-${ann.id}`,
        type: 'announcement_sent',
        title: 'Announcement sent',
        body: `"${ann.title}" · sent to ${ann.recipientCount} attendees`,
        timestamp: ann.sentAt,
        relatedEntityId: ann.id,
      });
    }

    const attendeeMilestones = await this.computeAttendeeMilestones(
      eventId,
      lookbackStart,
    );
    items.push(...attendeeMilestones);

    const connectionMilestones = await this.computeConnectionMilestones(
      eventId,
      lookbackStart,
    );
    items.push(...connectionMilestones);

    items.sort((x, y) => y.timestamp.getTime() - x.timestamp.getTime());

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const skip = (page - 1) * pageSize;
    const slice = items.slice(skip, skip + pageSize);

    return {
      data: slice.map((i) => ({
        ...i,
        timestamp: i.timestamp.toISOString(),
      })),
      meta: { page, pageSize, total, totalPages },
    };
  }

  private async computeAttendeeMilestones(
    eventId: string,
    lookbackStart: Date,
  ): Promise<ActivityItem[]> {
    const out: ActivityItem[] = [];
    for (const threshold of ATTENDEE_THRESHOLDS) {
      const crossing = await this.prisma.attendee.findFirst({
        where: { eventId },
        orderBy: { registeredAt: 'asc' },
        skip: threshold - 1,
        take: 1,
        select: { registeredAt: true, id: true },
      });
      if (crossing && crossing.registeredAt >= lookbackStart) {
        out.push({
          id: `attendees_milestone-${threshold}`,
          type: 'attendees_milestone',
          title: 'Milestone reached',
          body: `${threshold} attendees registered so far`,
          timestamp: crossing.registeredAt,
        });
      }
    }
    return out;
  }

  private async computeConnectionMilestones(
    eventId: string,
    lookbackStart: Date,
  ): Promise<ActivityItem[]> {
    const out: ActivityItem[] = [];
    for (const threshold of CONNECTION_THRESHOLDS) {
      const crossing = await this.prisma.connectionRequest.findFirst({
        where: { eventId, status: ConnectionStatus.ACCEPTED },
        orderBy: { respondedAt: 'asc' },
        skip: threshold - 1,
        take: 1,
        select: { respondedAt: true, id: true },
      });
      if (
        crossing &&
        crossing.respondedAt &&
        crossing.respondedAt >= lookbackStart
      ) {
        out.push({
          id: `connection_milestone-${threshold}`,
          type: 'connection_milestone',
          title: 'Milestone reached',
          body: `Your event hit ${threshold} accepted connections`,
          timestamp: crossing.respondedAt,
        });
      }
    }
    return out;
  }
}
