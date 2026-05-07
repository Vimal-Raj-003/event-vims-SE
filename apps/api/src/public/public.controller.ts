import { Controller, Get, Header, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_WINDOW_MIN = 30;
const PAST_LOOKBACK_DAYS = 90;
const ACTIVE_EVENTS_LIMIT = 50;

type EventBucket = 'LIVE' | 'UPCOMING' | 'PAST';

function bucketFor(startAt: Date, endAt: Date, now: Date): EventBucket {
  if (endAt < now) return 'PAST';
  if (startAt > now) return 'UPCOMING';
  return 'LIVE';
}

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
   * Past events from the last PAST_LOOKBACK_DAYS days are also returned
   * (visually muted + still selectable, so existing attendees can log
   * back in to view their card / connections from a finished event).
   * Drafts and deleted events are NEVER exposed.
   * ──────────────────────────────────────────────────────────────────── */

  @Get('organisers')
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 10_000 } })
  @Header('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
  @ApiOperation({
    summary:
      'Organisers with at least one published event (live, upcoming, or recent past). Includes liveEventCount + pastEventCount so the client can group Active vs Past.',
  })
  async organisers() {
    const now = new Date();
    const pastCutoff = new Date(now.getTime() - PAST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const organisers = await this.prisma.organiser.findMany({
      where: {
        events: {
          some: {
            status: 'PUBLISHED',
            endAt: { gte: pastCutoff },
          },
        },
      },
      select: {
        id: true,
        name: true,
        organisation: true,
        events: {
          where: {
            status: 'PUBLISHED',
            endAt: { gte: pastCutoff },
          },
          select: { startAt: true, endAt: true },
        },
      },
    });

    return organisers
      .map((o) => {
        let liveEventCount = 0;
        let pastEventCount = 0;
        for (const e of o.events) {
          const b = bucketFor(e.startAt, e.endAt, now);
          if (b === 'PAST') pastEventCount += 1;
          else liveEventCount += 1;
        }
        return {
          id: o.id,
          name: o.name,
          organisation: o.organisation,
          eventCount: liveEventCount + pastEventCount,
          liveEventCount,
          pastEventCount,
        };
      })
      .sort((a, b) => {
        if (b.liveEventCount !== a.liveEventCount) return b.liveEventCount - a.liveEventCount;
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
      "Organiser's published events (LIVE + UPCOMING + recent PAST), each tagged with bucket. Live first, upcoming next, past last.",
  })
  async organiserEvents(@Param('id') id: string) {
    const now = new Date();
    const pastCutoff = new Date(now.getTime() - PAST_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

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
        endAt: { gte: pastCutoff },
      },
      select: {
        id: true,
        name: true,
        startAt: true,
        endAt: true,
        venue: true,
      },
    });

    const tagged = events.map((e) => ({
      id: e.id,
      name: e.name,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      venue: e.venue,
      bucket: bucketFor(e.startAt, e.endAt, now),
    }));

    const order: Record<EventBucket, number> = { LIVE: 0, UPCOMING: 1, PAST: 2 };
    return tagged.sort((a, b) => {
      if (order[a.bucket] !== order[b.bucket]) return order[a.bucket] - order[b.bucket];
      // Within LIVE/UPCOMING: sooner-starting first. Within PAST: most recent first.
      if (a.bucket === 'PAST') {
        return new Date(b.endAt).getTime() - new Date(a.endAt).getTime();
      }
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
  }

  @Get('events/active')
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 10_000 } })
  @Header('Cache-Control', 'public, max-age=30, stale-while-revalidate=60')
  @ApiOperation({
    summary:
      'Globally currently-LIVE and UPCOMING published events across all organisers. Used by the attendee Event ID combobox.',
  })
  async activeEvents() {
    const now = new Date();

    const events = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        endAt: { gte: now },
      },
      select: {
        id: true,
        name: true,
        startAt: true,
        endAt: true,
        venue: true,
        organiser: { select: { name: true, organisation: true } },
      },
      orderBy: { startAt: 'asc' },
      take: ACTIVE_EVENTS_LIMIT,
    });

    return events.map((e) => ({
      id: e.id,
      name: e.name,
      startAt: e.startAt.toISOString(),
      endAt: e.endAt.toISOString(),
      venue: e.venue,
      organiserName: e.organiser?.name ?? '',
      organisation: e.organiser?.organisation ?? '',
      bucket: bucketFor(e.startAt, e.endAt, now),
    }));
  }
}
