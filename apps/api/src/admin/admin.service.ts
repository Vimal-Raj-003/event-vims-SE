import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeletionRequestStatus } from '@prisma/client';

export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // Analytics
  // ──────────────────────────────────────────────

  async getAnalytics() {
    const now = new Date();

    const [
      totalOrganisers,
      totalEvents,
      totalAttendees,
      totalConnections,
      activeEvents,
      upcomingEvents,
    ] = await Promise.all([
      this.prisma.organiser.count(),
      this.prisma.event.count(),
      this.prisma.attendee.count(),
      this.prisma.connectionRequest.count(),
      this.prisma.event.count({
        where: {
          status: 'PUBLISHED',
          endAt: { gt: now },
        },
      }),
      this.prisma.event.count({
        where: {
          startAt: { gt: now },
        },
      }),
    ]);

    return {
      totalOrganisers,
      totalEvents,
      totalAttendees,
      totalConnections,
      activeEvents,
      upcomingEvents,
    };
  }

  // ──────────────────────────────────────────────
  // Organisers
  // ──────────────────────────────────────────────

  async listOrganisers(
    params: PaginationParams,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    const [organisers, totalItems] = await Promise.all([
      this.prisma.organiser.findMany({
        select: {
          id: true,
          name: true,
          organisation: true,
          email: true,
          mobile: true,
          status: true,
          emailVerifiedAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              events: true,
            },
          },
          events: {
            select: {
              _count: {
                select: { attendees: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.organiser.count(),
    ]);

    const data = organisers.map((org) => ({
      id: org.id,
      name: org.name,
      organisation: org.organisation,
      email: org.email,
      mobile: org.mobile,
      status: org.status,
      emailVerifiedAt: org.emailVerifiedAt,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      eventCount: org._count.events,
      totalAttendeeCount: org.events.reduce(
        (sum, ev) => sum + ev._count.attendees,
        0,
      ),
    }));

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async suspendOrganiser(
    organiserId: string,
    adminId: string,
    ip: string,
    userAgent: string,
  ) {
    const organiser = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
    });

    if (!organiser) {
      throw new NotFoundException(`Organiser with id ${organiserId} not found`);
    }

    if (organiser.status === 'SUSPENDED') {
      throw new BadRequestException('Organiser is already suspended');
    }

    const updated = await this.prisma.organiser.update({
      where: { id: organiserId },
      data: { status: 'SUSPENDED' },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'SUPER_ADMIN',
        action: 'suspend_organiser',
        entityType: 'organiser',
        entityId: organiserId,
        metadata: {
          previousStatus: organiser.status,
          newStatus: 'SUSPENDED',
          organiserEmail: organiser.email,
        },
        ip,
        userAgent,
      },
    });

    this.logger.log(`Organiser ${organiserId} suspended by ${adminId}`);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
    };
  }

  async reactivateOrganiser(
    organiserId: string,
    adminId: string,
    ip: string,
    userAgent: string,
  ) {
    const organiser = await this.prisma.organiser.findUnique({
      where: { id: organiserId },
    });

    if (!organiser) {
      throw new NotFoundException(`Organiser with id ${organiserId} not found`);
    }

    if (organiser.status === 'ACTIVE') {
      throw new BadRequestException('Organiser is already active');
    }

    const updated = await this.prisma.organiser.update({
      where: { id: organiserId },
      data: { status: 'ACTIVE' },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'SUPER_ADMIN',
        action: 'reactivate_organiser',
        entityType: 'organiser',
        entityId: organiserId,
        metadata: {
          previousStatus: organiser.status,
          newStatus: 'ACTIVE',
          organiserEmail: organiser.email,
        },
        ip,
        userAgent,
      },
    });

    this.logger.log(`Organiser ${organiserId} reactivated by ${adminId}`);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      status: updated.status,
    };
  }

  // ──────────────────────────────────────────────
  // Events
  // ──────────────────────────────────────────────

  async listEvents(
    params: PaginationParams & { status?: string; search?: string },
  ): Promise<
    PaginatedResult<Record<string, unknown>>
  > {
    const { page, pageSize, status, search } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { venue: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [events, totalItems] = await Promise.all([
      this.prisma.event.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          venue: true,
          startAt: true,
          endAt: true,
          status: true,
          createdAt: true,
          organiser: {
            select: {
              id: true,
              name: true,
              organisation: true,
              email: true,
            },
          },
          _count: {
            select: { attendees: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.event.count({ where }),
    ]);

    const data = events.map((ev) => ({
      id: ev.id,
      name: ev.name,
      slug: ev.slug,
      description: ev.description,
      venue: ev.venue,
      startAt: ev.startAt,
      endAt: ev.endAt,
      status: ev.status,
      createdAt: ev.createdAt,
      attendeeCount: ev._count.attendees,
      organiser: ev.organiser,
    }));

    return {
      data,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async getEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        slug: true,
        shortHash: true,
        description: true,
        venue: true,
        venueMapUrl: true,
        expectedCount: true,
        brandLogoUrl: true,
        brandPrimary: true,
        brandSecondary: true,
        bannerUrl: true,
        qrUrl: true,
        status: true,
        startAt: true,
        endAt: true,
        createdAt: true,
        updatedAt: true,
        organiser: {
          select: {
            id: true,
            name: true,
            organisation: true,
            email: true,
            mobile: true,
            status: true,
          },
        },
        _count: {
          select: {
            attendees: true,
            connections: true,
            announcements: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    return {
      ...event,
      attendeeCount: event._count.attendees,
      connectionCount: event._count.connections,
      announcementCount: event._count.announcements,
      _count: undefined,
    };
  }

  async deleteEvent(
    eventId: string,
    adminId: string,
    ip: string,
    userAgent: string,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        name: true,
        status: true,
        organiserId: true,
        _count: {
          select: {
            attendees: true,
            connections: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    if (event.status !== 'DELETED') {
      throw new BadRequestException(
        'Only events already in DELETED status can be hard-deleted. The organiser must request deletion first.',
      );
    }

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'SUPER_ADMIN',
        action: 'hard_delete_event',
        entityType: 'event',
        entityId: eventId,
        metadata: {
          eventName: event.name,
          organiserId: event.organiserId,
          attendeeCount: event._count.attendees,
          connectionCount: event._count.connections,
        },
        ip,
        userAgent,
      },
    });

    // Hard delete — cascade will handle related records
    await this.prisma.event.delete({
      where: { id: eventId },
    });

    this.logger.warn(
      `Event ${eventId} ("${event.name}") hard-deleted by ${adminId}`,
    );

    return {
      message: `Event "${event.name}" has been permanently deleted along with all related data.`,
      deletedEventId: eventId,
    };
  }

  // ──────────────────────────────────────────────
  // Deletion Requests
  // ──────────────────────────────────────────────

  async listDeletionRequests(
    params: PaginationParams,
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, pageSize } = params;
    const skip = (page - 1) * pageSize;

    const where = { status: 'PENDING' as DeletionRequestStatus };

    const [requests, totalItems] = await Promise.all([
      this.prisma.dataDeletionRequest.findMany({
        where,
        select: {
          id: true,
          requesterEmail: true,
          eventId: true,
          reason: true,
          status: true,
          requestedAt: true,
          event: {
            select: {
              id: true,
              name: true,
              organiser: {
                select: {
                  id: true,
                  name: true,
                  organisation: true,
                },
              },
            },
          },
        },
        orderBy: { requestedAt: 'asc' },
        skip,
        take: pageSize,
      }),
      this.prisma.dataDeletionRequest.count({ where }),
    ]);

    return {
      data: requests,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }

  async approveDeletionRequest(
    requestId: string,
    adminId: string,
    ip: string,
    userAgent: string,
  ) {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
      include: { event: true },
    });

    if (!request) {
      throw new NotFoundException(
        `Deletion request with id ${requestId} not found`,
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Deletion request is already in ${request.status} status`,
      );
    }

    const now = new Date();

    // Determine deletion type based on whether an eventId is present
    if (request.eventId) {
      // Event deletion — set event status to DELETED
      await this.prisma.$transaction(async (tx) => {
        await tx.event.update({
          where: { id: request.eventId! },
          data: { status: 'DELETED' },
        });

        await tx.dataDeletionRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            processedAt: now,
            processedBy: adminId,
          },
        });
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorRole: 'SUPER_ADMIN',
          action: 'approve_event_deletion',
          entityType: 'data_deletion_request',
          entityId: requestId,
          metadata: {
            requestId,
            requesterEmail: request.requesterEmail,
            eventId: request.eventId,
            eventName: request.event?.name,
            deletionType: 'event',
          },
          ip,
          userAgent,
        },
      });

      this.logger.log(
        `Deletion request ${requestId} approved — event ${request.eventId} marked as DELETED`,
      );
    } else {
      // Attendee data deletion — anonymise the attendee record
      const attendees = await this.prisma.attendee.findMany({
        where: { email: request.requesterEmail },
      });

      if (attendees.length === 0) {
        throw new NotFoundException(
          `No attendee found with email ${request.requesterEmail}`,
        );
      }

      await this.prisma.$transaction(async (tx) => {
        for (const attendee of attendees) {
          await tx.attendee.update({
            where: { id: attendee.id },
            data: {
              firstName: '[DELETED]',
              lastName: '[DELETED]',
              email: `[DELETED]-${attendee.id}`,
              phone: '[DELETED]',
              address: null,
              profilePhotoUrl: null,
              companyLogoUrl: null,
            },
          });
        }

        await tx.dataDeletionRequest.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            processedAt: now,
            processedBy: adminId,
          },
        });
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: adminId,
          actorRole: 'SUPER_ADMIN',
          action: 'approve_attendee_data_deletion',
          entityType: 'data_deletion_request',
          entityId: requestId,
          metadata: {
            requestId,
            requesterEmail: request.requesterEmail,
            deletionType: 'attendee_data',
            affectedAttendeeCount: attendees.length,
          },
          ip,
          userAgent,
        },
      });

      this.logger.log(
        `Deletion request ${requestId} approved — attendee data for ${request.requesterEmail} anonymised (${attendees.length} record(s))`,
      );
    }

    return {
      id: requestId,
      status: 'APPROVED',
      processedAt: now,
      processedBy: adminId,
    };
  }

  async rejectDeletionRequest(
    requestId: string,
    reason: string,
    adminId: string,
    ip: string,
    userAgent: string,
  ) {
    const request = await this.prisma.dataDeletionRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException(
        `Deletion request with id ${requestId} not found`,
      );
    }

    if (request.status !== 'PENDING') {
      throw new BadRequestException(
        `Deletion request is already in ${request.status} status`,
      );
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      await tx.dataDeletionRequest.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          reason: reason || request.reason,
          processedAt: now,
          processedBy: adminId,
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        actorRole: 'SUPER_ADMIN',
        action: 'reject_deletion_request',
        entityType: 'data_deletion_request',
        entityId: requestId,
        metadata: {
          requestId,
          requesterEmail: request.requesterEmail,
          rejectionReason: reason,
        },
        ip,
        userAgent,
      },
    });

    this.logger.log(
      `Deletion request ${requestId} rejected by ${adminId}: ${reason}`,
    );

    return {
      id: requestId,
      status: 'REJECTED',
      reason,
      processedAt: now,
      processedBy: adminId,
    };
  }

  // ──────────────────────────────────────────────
  // Audit Log
  // ──────────────────────────────────────────────

  async searchAuditLog(
    params: PaginationParams & { action?: string; entityType?: string },
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, pageSize, action, entityType } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }
    if (entityType) {
      where.entityType = entityType;
    }

    const [logs, totalItems] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        select: {
          id: true,
          actorId: true,
          actorRole: true,
          action: true,
          entityType: true,
          entityId: true,
          metadata: true,
          ip: true,
          userAgent: true,
          createdAt: true,
          organiser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / pageSize),
      },
    };
  }
}
