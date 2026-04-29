import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dtos/create-announcement.dto';
import { PaginationQueryDto } from './dtos/pagination-query.dto';

@Injectable()
export class AnnouncementsService {
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(
    eventId: string,
    organiserId: string,
    dto: CreateAnnouncementDto,
  ) {
    await this.verifyEventOwnership(eventId, organiserId);

    const recipientCount = await this.prisma.attendee.count({
      where: { eventId },
    });

    const announcement = await this.prisma.announcement.create({
      data: {
        eventId,
        organiserId,
        title: dto.title,
        body: dto.body,
        linkUrl: dto.linkUrl ?? null,
        recipientCount,
      },
    });

    this.logger.log(
      `Announcement "${announcement.id}" created for event ${eventId} — ${recipientCount} recipients`,
    );

    // Phase 2: email/push delivery will be triggered here

    return announcement;
  }

  async findAll(
    eventId: string,
    organiserId: string,
    query: PaginationQueryDto,
  ) {
    await this.verifyEventOwnership(eventId, organiserId);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where: { eventId },
        orderBy: { sentAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.announcement.count({
        where: { eventId },
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ─── Helpers ────────────────────────────────────────────

  private async verifyEventOwnership(
    eventId: string,
    organiserId: string,
  ): Promise<void> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organiserId: true },
    });

    if (!event) {
      throw new NotFoundException(`Event with id "${eventId}" not found`);
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException(
        'You do not have permission to manage this event',
      );
    }
  }
}
