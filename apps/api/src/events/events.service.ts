import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { EventStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  private static readonly PROFILE_FIELDS = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'designation',
    'company',
    'businessType',
    'industry',
    'services',
    'city',
    'address',
    'companySize',
    'tags',
    'profilePhotoUrl',
    'companyLogoUrl',
  ] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  // ──────────────────────────────────────────────
  // Create Event (Draft)
  // ──────────────────────────────────────────────

  async create(
    organiserId: string,
    dto: {
      name: string;
      description: string;
      startAt: string;
      endAt: string;
      venue: string;
      venueMapUrl?: string;
      expectedCount?: number;
      brandPrimary?: string;
      brandSecondary?: string;
    },
  ) {
    const event = await this.prisma.event.create({
      data: {
        organiserId,
        name: dto.name,
        description: dto.description,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        venue: dto.venue,
        venueMapUrl: dto.venueMapUrl ?? null,
        expectedCount: dto.expectedCount ?? null,
        brandPrimary: dto.brandPrimary ?? '#4F46E5',
        brandSecondary: dto.brandSecondary ?? '#818CF8',
        // slug and shortHash are required but will be set on publish
        slug: `draft-${crypto.randomUUID()}`,
        shortHash: crypto.randomUUID().slice(0, 8),
        status: EventStatus.DRAFT,
      },
    });

    this.logger.log(`Event created (draft): ${event.id} by organiser ${organiserId}`);

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      venueMapUrl: event.venueMapUrl,
      expectedCount: event.expectedCount,
      brandPrimary: event.brandPrimary,
      brandSecondary: event.brandSecondary,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  // ──────────────────────────────────────────────
  // List Own Events
  // ──────────────────────────────────────────────

  async findAll(organiserId: string) {
    const events = await this.prisma.event.findMany({
      where: {
        organiserId,
        status: { not: EventStatus.DELETED },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        shortHash: true,
        venue: true,
        startAt: true,
        endAt: true,
        status: true,
        expectedCount: true,
        brandPrimary: true,
        brandSecondary: true,
        qrUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { attendees: true },
        },
      },
    });

    return events.map(({ _count, ...event }) => ({
      ...event,
      attendeeCount: _count.attendees,
    }));
  }

  // ──────────────────────────────────────────────
  // Get Single Event
  // ──────────────────────────────────────────────

  async findOne(eventId: string, organiserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    if (event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    return {
      id: event.id,
      name: event.name,
      description: event.description,
      slug: event.slug,
      shortHash: event.shortHash,
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      venueMapUrl: event.venueMapUrl,
      expectedCount: event.expectedCount,
      brandLogoUrl: event.brandLogoUrl,
      brandPrimary: event.brandPrimary,
      brandSecondary: event.brandSecondary,
      bannerUrl: event.bannerUrl,
      qrUrl: event.qrUrl,
      status: event.status,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    };
  }

  // ──────────────────────────────────────────────
  // Update Event (Draft only)
  // ──────────────────────────────────────────────

  async update(
    eventId: string,
    organiserId: string,
    dto: {
      name?: string;
      description?: string;
      startAt?: string;
      endAt?: string;
      venue?: string;
      venueMapUrl?: string;
      expectedCount?: number;
      brandPrimary?: string;
      brandSecondary?: string;
    },
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can be updated');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.startAt !== undefined) updateData.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) updateData.endAt = new Date(dto.endAt);
    if (dto.venue !== undefined) updateData.venue = dto.venue;
    if (dto.venueMapUrl !== undefined) updateData.venueMapUrl = dto.venueMapUrl;
    if (dto.expectedCount !== undefined) updateData.expectedCount = dto.expectedCount;
    if (dto.brandPrimary !== undefined) updateData.brandPrimary = dto.brandPrimary;
    if (dto.brandSecondary !== undefined) updateData.brandSecondary = dto.brandSecondary;

    const updated = await this.prisma.event.update({
      where: { id: eventId },
      data: updateData,
    });

    this.logger.log(`Event updated: ${eventId}`);

    return {
      id: updated.id,
      name: updated.name,
      description: updated.description,
      startAt: updated.startAt,
      endAt: updated.endAt,
      venue: updated.venue,
      venueMapUrl: updated.venueMapUrl,
      expectedCount: updated.expectedCount,
      brandPrimary: updated.brandPrimary,
      brandSecondary: updated.brandSecondary,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  // ──────────────────────────────────────────────
  // Publish Event
  // ──────────────────────────────────────────────

  async publish(eventId: string, organiserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only draft events can be published');
    }

    // Generate slug from name, deduplicate if necessary
    const baseSlug = this.slugify(event.name);
    const slug = await this.deduplicateSlug(baseSlug);

    // Generate 8-char random hex shortHash, deduplicate if necessary
    const shortHash = await this.deduplicateShortHash();

    // Construct QR URL (points to registration page)
    const baseUrl = process.env.FRONTEND_URL ?? 'https://vims.app';
    const qrUrl = `${baseUrl}/e/${shortHash}`;

    // Update event and create field configs + rules in a transaction
    const published = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id: eventId },
        data: {
          slug,
          shortHash,
          qrUrl,
          status: EventStatus.PUBLISHED,
        },
      });

      // Create default EventFieldConfig for all 15 profile fields
      const fieldConfigs = EventsService.PROFILE_FIELDS.map((fieldKey) => ({
        eventId,
        fieldKey,
        isRequired: ['firstName', 'lastName', 'email', 'phone', 'consentGiven'].includes(fieldKey)
          ? true
          : false,
        isVisible: true,
      }));

      await tx.eventFieldConfig.createMany({ data: fieldConfigs });

      // Create default EventRule
      await tx.eventRule.create({
        data: {
          eventId,
          maxConnectionsPerAttendee: '50',
          showAddressAfterAccept: true,
          allowVcardDownload: true,
        },
      });

      return updated;
    });

    this.logger.log(`Event published: ${eventId} with slug ${slug}`);

    return {
      id: published.id,
      name: published.name,
      slug: published.slug,
      shortHash: published.shortHash,
      qrUrl: published.qrUrl,
      status: published.status,
      updatedAt: published.updatedAt,
    };
  }

  // ──────────────────────────────────────────────
  // Soft Delete Event
  // ──────────────────────────────────────────────

  async remove(eventId: string, organiserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    if (event.status === EventStatus.DELETED) {
      throw new BadRequestException('Event is already deleted');
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: { status: EventStatus.DELETED },
    });

    this.logger.log(`Event soft-deleted: ${eventId}`);

    return { message: 'Event deleted successfully' };
  }

  // ──────────────────────────────────────────────
  // Get Live Event Stats
  // ──────────────────────────────────────────────

  async getStats(eventId: string, organiserId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    if (event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    const [
      attendeeCount,
      connectionsSent,
      connectionsAccepted,
      activeUsers5m,
    ] = await Promise.all([
      // Total registered attendees
      this.prisma.attendee.count({
        where: { eventId },
      }),

      // Total connection requests sent
      this.prisma.connectionRequest.count({
        where: { eventId },
      }),

      // Total accepted connections
      this.prisma.connectionRequest.count({
        where: {
          eventId,
          status: 'ACCEPTED',
        },
      }),

      // Active users in last 5 minutes
      this.prisma.attendee.count({
        where: {
          eventId,
          lastActiveAt: {
            gt: new Date(Date.now() - 5 * 60 * 1000),
          },
        },
      }),
    ]);

    const acceptanceRate =
      connectionsSent > 0
        ? Number(((connectionsAccepted / connectionsSent) * 100).toFixed(1))
        : 0;

    return {
      attendeeCount,
      connectionsSent,
      connectionsAccepted,
      acceptanceRate,
      activeUsers5m,
    };
  }

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  private async deduplicateSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await this.prisma.event.findUnique({
        where: { slug },
        select: { id: true },
      });

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async deduplicateShortHash(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const hash = crypto.randomBytes(4).toString('hex'); // 8 hex chars

      const existing = await this.prisma.event.findUnique({
        where: { shortHash: hash },
        select: { id: true },
      });

      if (!existing) return hash;

      attempts++;
    }

    throw new ConflictException('Failed to generate unique short hash. Please try again.');
  }
}
