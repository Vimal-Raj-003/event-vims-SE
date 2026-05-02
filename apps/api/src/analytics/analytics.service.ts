import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(attendeeId: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const [
      acceptedConnections,
      pendingConnections,
      thisWeekConnections,
      lastWeekConnections,
      thisWeekViews,
      thisWeekShares,
      recentViewers,
      maxConnRule,
    ] = await Promise.all([
      // Total accepted connections
      this.prisma.connectionRequest.count({
        where: {
          eventId: attendee.eventId,
          status: ConnectionStatus.ACCEPTED,
          OR: [{ senderId: attendeeId }, { receiverId: attendeeId }],
        },
      }),
      // Pending sent connections
      this.prisma.connectionRequest.count({
        where: {
          eventId: attendee.eventId,
          status: ConnectionStatus.PENDING,
          senderId: attendeeId,
        },
      }),
      // This week connections
      this.prisma.connectionRequest.count({
        where: {
          eventId: attendee.eventId,
          status: ConnectionStatus.ACCEPTED,
          respondedAt: { gte: oneWeekAgo },
          OR: [{ senderId: attendeeId }, { receiverId: attendeeId }],
        },
      }),
      // Last week connections (for trend)
      this.prisma.connectionRequest.count({
        where: {
          eventId: attendee.eventId,
          status: ConnectionStatus.ACCEPTED,
          respondedAt: { gte: twoWeeksAgo, lt: oneWeekAgo },
          OR: [{ senderId: attendeeId }, { receiverId: attendeeId }],
        },
      }),
      // This week profile views
      this.prisma.profileView.count({
        where: { viewedId: attendeeId, createdAt: { gte: oneWeekAgo } },
      }),
      // This week card shares (from activities)
      this.prisma.activity.count({
        where: {
          attendeeId,
          type: 'card_shared',
          createdAt: { gte: oneWeekAgo },
        },
      }),
      // Recent viewers (last 5)
      this.prisma.profileView.findMany({
        where: { viewedId: attendeeId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          viewer: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
        },
      }),
      // Max connections rule
      this.prisma.eventRule.findUnique({
        where: { eventId: attendee.eventId },
        select: { maxConnectionsPerAttendee: true },
      }),
    ]);

    // Card shares by method (this week)
    const shareActivities = await this.prisma.activity.findMany({
      where: {
        attendeeId,
        type: 'card_shared',
        createdAt: { gte: oneWeekAgo },
      },
      select: { metadata: true },
    });

    const byMethod: Record<string, number> = {};
    for (const act of shareActivities) {
      const method = (act.metadata as Record<string, unknown>)?.method as string ?? 'unknown';
      byMethod[method] = (byMethod[method] ?? 0) + 1;
    }

    // Compute networking score
    const maxConn = parseInt(maxConnRule?.maxConnectionsPerAttendee ?? '50', 10);
    const daysSinceReg = Math.max(1, Math.floor((Date.now() - attendee.registeredAt.getTime()) / 86400000));
    const engagement = attendee.profileViewCount + attendee.cardShareCount + attendee.qrScanCount;

    // Profile completeness
    const allFields = [
      attendee.firstName, attendee.lastName, attendee.email, attendee.phone,
      attendee.designation, attendee.company, attendee.industry, attendee.city,
      attendee.profilePhotoUrl, attendee.occupation, attendee.businessType,
    ];
    const filledFields = allFields.filter((v) => v !== null && v !== undefined && v !== '').length;

    const networkingScore = Math.round(
      (Math.min(acceptedConnections / maxConn, 1) * 40) +
      (Math.min(engagement / daysSinceReg, 5) / 5 * 30) +
      (filledFields / allFields.length * 30),
    );

    // Engagement trend
    const thisWeekTotal = thisWeekConnections + thisWeekViews + thisWeekShares;
    const trend: 'up' | 'flat' | 'down' = thisWeekTotal > lastWeekConnections + 2 ? 'up' : thisWeekTotal < lastWeekConnections ? 'down' : 'flat';

    return {
      connections: {
        total: acceptedConnections,
        thisWeek: thisWeekConnections,
        pending: pendingConnections,
      },
      profileViews: {
        total: attendee.profileViewCount,
        thisWeek: thisWeekViews,
        recentViewers: recentViewers.map((v) => v.viewer),
      },
      cardShares: {
        total: attendee.cardShareCount,
        thisWeek: thisWeekShares,
        byMethod,
      },
      qrScans: {
        total: attendee.qrScanCount,
        thisWeek: 0,
      },
      networkingScore: Math.min(networkingScore, 100),
      engagementTrend: trend,
    };
  }

  async getTrends(attendeeId: string, period: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    const days = period === '30d' ? 30 : period === 'all' ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const data = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayStart = new Date(dateStr);
      const dayEnd = new Date(dateStr);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [connections, views, shares] = await Promise.all([
        this.prisma.connectionRequest.count({
          where: {
            eventId: attendee.eventId,
            status: ConnectionStatus.ACCEPTED,
            respondedAt: { gte: dayStart, lt: dayEnd },
            OR: [{ senderId: attendeeId }, { receiverId: attendeeId }],
          },
        }),
        this.prisma.profileView.count({
          where: { viewedId: attendeeId, createdAt: { gte: dayStart, lt: dayEnd } },
        }),
        this.prisma.activity.count({
          where: { attendeeId, type: 'card_shared', createdAt: { gte: dayStart, lt: dayEnd } },
        }),
      ]);

      data.push({ date: dateStr, connections, views, shares });
    }

    return { data };
  }
}
