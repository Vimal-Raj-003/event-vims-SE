import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectionStatus } from '@prisma/client';

@Injectable()
export class SmartMatchingService {
  private readonly logger = new Logger(SmartMatchingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSuggestions(
    attendeeId: string,
    eventId: string,
    limit: number = 10,
    offset: number = 0,
  ) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee || attendee.eventId !== eventId) {
      throw new NotFoundException('Attendee not found in this event');
    }

    // Try cached scores first
    const cached = await this.prisma.matchScore.findMany({
      where: { attendeeId, eventId },
      orderBy: { score: 'desc' },
      skip: offset,
      take: limit,
    });

    if (cached.length > 0) {
      const targetIds = cached.map((c) => c.targetId);
      const targets = await this.prisma.attendee.findMany({
        where: { id: { in: targetIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          designation: true,
          company: true,
          businessType: true,
          city: true,
          industry: true,
          services: true,
          profilePhotoUrl: true,
          companyLogoUrl: true,
          tags: true,
        },
      });

      const targetMap = new Map(targets.map((t) => [t.id, t]));

      return {
        data: cached
          .map((c) => {
            const target = targetMap.get(c.targetId);
            if (!target) return null;
            return {
              attendee: {
                ...target,
                connectionStatus: null,
              },
              score: c.score,
              reasons: c.matchReasons as string[],
            };
          })
          .filter(Boolean),
      };
    }

    // Compute on demand
    const computed = await this.computeSuggestions(attendee, eventId, limit, offset);

    // Cache results
    if (computed.length > 0) {
      await this.prisma.matchScore.createMany({
        data: computed.map((c) => ({
          attendeeId,
          targetId: c.attendee.id,
          eventId,
          score: c.score,
          matchReasons: c.reasons,
        })),
        skipDuplicates: true,
      });
    }

    return { data: computed };
  }

  async refreshSuggestions(attendeeId: string, eventId: string) {
    // Delete old cached scores
    await this.prisma.matchScore.deleteMany({
      where: { attendeeId, eventId },
    });

    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee || attendee.eventId !== eventId) {
      throw new NotFoundException('Attendee not found in this event');
    }

    const computed = await this.computeSuggestions(attendee, eventId, 20, 0);

    if (computed.length > 0) {
      await this.prisma.matchScore.createMany({
        data: computed.map((c) => ({
          attendeeId,
          targetId: c.attendee.id,
          eventId,
          score: c.score,
          matchReasons: c.reasons,
        })),
        skipDuplicates: true,
      });
    }

    return { success: true, count: computed.length };
  }

  private async computeSuggestions(
    attendee: {
      id: string;
      eventId: string;
      industry: string;
      services: unknown;
      tags: unknown;
      networkingGoals: unknown;
      city: string;
      businessType: string;
    },
    eventId: string,
    limit: number,
    offset: number,
  ) {
    // Get all candidate attendees in same event
    const candidates = await this.prisma.attendee.findMany({
      where: {
        eventId,
        id: { not: attendee.id },
        isPaused: false,
        profileCompleted: true,
        NOT: {
          sentConnections: {
            some: { receiverId: attendee.id, status: ConnectionStatus.ACCEPTED },
          },
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        designation: true,
        company: true,
        businessType: true,
        city: true,
        industry: true,
        services: true,
        profilePhotoUrl: true,
        companyLogoUrl: true,
        tags: true,
        networkingGoals: true,
      },
    });

    // Also exclude already-connected from received side
    const acceptedConnections = await this.prisma.connectionRequest.findMany({
      where: {
        eventId,
        status: ConnectionStatus.ACCEPTED,
        OR: [
          { senderId: attendee.id },
          { receiverId: attendee.id },
        ],
      },
      select: { senderId: true, receiverId: true },
    });

    const connectedIds = new Set<string>();
    for (const conn of acceptedConnections) {
      connectedIds.add(conn.senderId);
      connectedIds.add(conn.receiverId);
    }

    const attendeeServices = (attendee.services as string[]) ?? [];
    const attendeeTags = (attendee.tags as string[]) ?? [];
    const attendeeGoals = (attendee.networkingGoals as string[]) ?? [];

    const scored = candidates
      .filter((c) => !connectedIds.has(c.id))
      .map((candidate) => {
        let score = 0;
        const reasons: string[] = [];

        // Same industry: +0.3
        if (candidate.industry === attendee.industry && attendee.industry) {
          score += 0.3;
          reasons.push('Same Industry');
        }

        // Overlapping services: +0.2 * overlap ratio
        const candidateServices = (candidate.services as string[]) ?? [];
        if (attendeeServices.length > 0 && candidateServices.length > 0) {
          const overlap = attendeeServices.filter((s) => candidateServices.includes(s)).length;
          const ratio = overlap / Math.max(attendeeServices.length, candidateServices.length);
          if (ratio > 0) {
            score += 0.2 * ratio;
            reasons.push('Overlapping Services');
          }
        }

        // Complementary goals/services: +0.2
        const candidateGoals = (candidate.networkingGoals as string[]) ?? [];
        if (attendeeGoals.length > 0 && candidateServices.length > 0) {
          const complement = attendeeGoals.some((g) =>
            candidateServices.some((s) => s.toLowerCase().includes(g.toLowerCase().split(' ')[0].toLowerCase())),
          );
          if (complement) {
            score += 0.2;
            reasons.push('Complementary Services');
          }
        }

        // Shared tags: +0.15 * ratio
        const candidateTags = (candidate.tags as string[]) ?? [];
        if (attendeeTags.length > 0 && candidateTags.length > 0) {
          const overlap = attendeeTags.filter((t) => candidateTags.includes(t)).length;
          const ratio = overlap / Math.max(attendeeTags.length, candidateTags.length);
          if (ratio > 0) {
            score += 0.15 * ratio;
            reasons.push('Shared Skills');
          }
        }

        // Same city: +0.05
        if (candidate.city === attendee.city && attendee.city) {
          score += 0.05;
          reasons.push('Same City');
        }

        // Has photo: +0.1
        if (candidate.profilePhotoUrl) {
          score += 0.1;
        }

        return {
          attendee: {
            ...candidate,
            connectionStatus: null,
          },
          score: Math.round(score * 100) / 100,
          reasons,
        };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(offset, offset + limit);

    return scored;
  }
}
