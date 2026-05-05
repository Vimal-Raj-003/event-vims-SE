import { Controller, Get, Header, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_WINDOW_MIN = 30;

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 10_000 } })
  @Header('Cache-Control', 'public, max-age=15, stale-while-revalidate=30')
  @ApiOperation({
    summary:
      'Public landing-page stats — currently-networking attendee count across published, in-progress events',
  })
  async stats() {
    const now = new Date();
    const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_MIN * 60 * 1000);

    const networkingNow = await this.prisma.attendee.count({
      where: {
        isPaused: false,
        lastActiveAt: { gte: activeSince },
        event: {
          status: 'PUBLISHED',
          startAt: { lte: now },
          endAt: { gte: now },
        },
      },
    });

    return {
      networkingNow,
      asOf: now.toISOString(),
    };
  }

  /* ────────────────────────────────────────────────────────────────────
   * Browse-mode endpoints — power the attendee login "Browse" tab so
   * users can pick an organiser → event without needing the raw event ID.
   *
   * Both endpoints expose ONLY events that are live or upcoming
   * (status=PUBLISHED AND endAt >= now). Past events and drafts are never
   * returned, so no leakage of historical or unpublished work.
   * ──────────────────────────────────────────────────────────────────── */

  @Get('organisers')
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 10_000 } })
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  @ApiOperation({
    summary:
      'Organisers with at least one live or upcoming published event. Sorted by eventCount desc, name asc.',
  })
  async organisers() {
    const now = new Date();
    const organisers = await this.prisma.organiser.findMany({
      where: {
        events: {
          some: {
            status: 'PUBLISHED',
            endAt: { gte: now },
          },
        },
      },
      select: {
        id: true,
        name: true,
        organisation: true,
        _count: {
          select: {
            events: {
              where: {
                status: 'PUBLISHED',
                endAt: { gte: now },
              },
            },
          },
        },
      },
    });

    return organisers
      .map((o) => ({
        id: o.id,
        name: o.name,
        organisation: o.organisation,
        eventCount: o._count.events,
      }))
      .sort((a, b) => {
        if (b.eventCount !== a.eventCount) return b.eventCount - a.eventCount;
        return a.name.localeCompare(b.name);
      });
  }

  @Get('organisers/:id/events')
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 10_000 } })
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  @ApiOperation({
    summary:
      "Organiser's live or upcoming published events, sorted by startAt asc.",
  })
  async organiserEvents(@Param('id') id: string) {
    const now = new Date();

    const organiser = await this.prisma.organiser.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!organiser) {
      throw new NotFoundException('Organiser not found');
    }

    const events = await this.prisma.event.findMany({
      where: {
        organiserId: id,
        status: 'PUBLISHED',
        endAt: { gte: now },
      },
      select: {
        id: true,
        name: true,
        startAt: true,
        endAt: true,
        venue: true,
      },
      orderBy: { startAt: 'asc' },
    });

    return events.map((e) => ({
      id: e.id,
      name: e.name,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      venue: e.venue,
    }));
  }
}
