import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DeletionRequestStatus, TicketStatus, TicketPriority } from '@prisma/client';
import * as ExcelJS from 'exceljs';

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

  // ──────────────────────────────────────────────
  // Export: Organisers
  // ──────────────────────────────────────────────

  async exportOrganisers(): Promise<Buffer> {
    const rows = await this.prisma.organiser.findMany({
      select: {
        id: true, name: true, organisation: true,
        email: true, mobile: true, status: true,
        createdAt: true,
        _count: { select: { events: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'VIMS Events Admin';
    const ws = wb.addWorksheet('Organisers');

    ws.columns = [
      { header: 'ID',           key: 'id',           width: 30 },
      { header: 'Name',         key: 'name',         width: 25 },
      { header: 'Organisation', key: 'organisation', width: 30 },
      { header: 'Email',        key: 'email',        width: 35 },
      { header: 'Mobile',       key: 'mobile',       width: 18 },
      { header: 'Status',       key: 'status',       width: 12 },
      { header: 'Events Count', key: 'events',       width: 14 },
      { header: 'Joined At',    key: 'createdAt',    width: 22 },
    ];

    this.styleHeader(ws);
    rows.forEach((r) => ws.addRow({
      id: r.id, name: r.name, organisation: r.organisation,
      email: r.email, mobile: r.mobile ?? '', status: r.status,
      events: r._count.events,
      createdAt: new Date(r.createdAt).toLocaleString('en-IN'),
    }));
    this.autoStyle(ws);

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ──────────────────────────────────────────────
  // Export: Events
  // ──────────────────────────────────────────────

  async exportEvents(): Promise<Buffer> {
    const rows = await this.prisma.event.findMany({
      where: { status: { not: 'DELETED' as any } },
      include: {
        organiser: { select: { name: true, organisation: true, email: true } },
        _count: { select: { attendees: true, connections: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'VIMS Events Admin';
    const ws = wb.addWorksheet('Events');

    ws.columns = [
      { header: 'Event ID',        key: 'id',           width: 30 },
      { header: 'Event Name',      key: 'name',         width: 35 },
      { header: 'Status',          key: 'status',       width: 12 },
      { header: 'Organiser',       key: 'organiser',    width: 25 },
      { header: 'Organisation',    key: 'organisation', width: 30 },
      { header: 'Organiser Email', key: 'orgEmail',     width: 30 },
      { header: 'Venue',           key: 'venue',        width: 30 },
      { header: 'Start Date',      key: 'startAt',      width: 22 },
      { header: 'End Date',        key: 'endAt',        width: 22 },
      { header: 'Expected',        key: 'expected',     width: 12 },
      { header: 'Attendees',       key: 'attendees',    width: 12 },
      { header: 'Connections',     key: 'connections',  width: 14 },
      { header: 'Short Hash',      key: 'shortHash',    width: 14 },
      { header: 'QR / Join URL',   key: 'qrUrl',        width: 60 },
      { header: 'Created At',      key: 'createdAt',    width: 22 },
    ];

    this.styleHeader(ws);
    rows.forEach((r) => ws.addRow({
      id: r.id, name: r.name, status: r.status,
      organiser: r.organiser.name, organisation: r.organiser.organisation,
      orgEmail: r.organiser.email,
      venue: r.venue,
      startAt: new Date(r.startAt).toLocaleString('en-IN'),
      endAt: new Date(r.endAt).toLocaleString('en-IN'),
      expected: r.expectedCount ?? 'N/A',
      attendees: r._count.attendees,
      connections: r._count.connections,
      shortHash: r.shortHash,
      qrUrl: r.qrUrl ?? '',
      createdAt: new Date(r.createdAt).toLocaleString('en-IN'),
    }));
    this.autoStyle(ws);

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ──────────────────────────────────────────────
  // Export: Attendees
  // ──────────────────────────────────────────────

  async exportAttendees(eventId?: string): Promise<Buffer> {
    const rows = await this.prisma.attendee.findMany({
      where: eventId ? { eventId } : {},
      include: { event: { select: { name: true } } },
      orderBy: { registeredAt: 'desc' },
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'VIMS Events Admin';
    const ws = wb.addWorksheet('Attendees');

    ws.columns = [
      { header: 'ID',            key: 'id',           width: 30 },
      { header: 'First Name',    key: 'firstName',    width: 18 },
      { header: 'Last Name',     key: 'lastName',     width: 18 },
      { header: 'Email',         key: 'email',        width: 35 },
      { header: 'Phone',         key: 'phone',        width: 18 },
      { header: 'Designation',   key: 'designation',  width: 25 },
      { header: 'Company',       key: 'company',      width: 28 },
      { header: 'Business Type', key: 'businessType', width: 20 },
      { header: 'Industry',      key: 'industry',     width: 20 },
      { header: 'City',          key: 'city',         width: 15 },
      { header: 'Company Size',  key: 'companySize',  width: 15 },
      { header: 'Consent Given', key: 'consent',      width: 14 },
      { header: 'Event',         key: 'event',        width: 30 },
      { header: 'Registered At', key: 'createdAt',    width: 22 },
    ];

    this.styleHeader(ws);
    rows.forEach((r) => ws.addRow({
      id: r.id, firstName: r.firstName, lastName: r.lastName,
      email: r.email, phone: r.phone ?? '', designation: r.designation,
      company: r.company, businessType: r.businessType, industry: r.industry,
      city: r.city, companySize: r.companySize ?? '', consent: r.consentGiven ? 'Yes' : 'No',
      event: r.event.name,
      createdAt: new Date(r.registeredAt).toLocaleString('en-IN'),
    }));
    this.autoStyle(ws);

    return wb.xlsx.writeBuffer() as unknown as Promise<Buffer>;
  }

  // ──────────────────────────────────────────────
  // Support Tickets (Admin)
  // ──────────────────────────────────────────────

  async listSupportTickets(
    params: PaginationParams & { status?: string; category?: string; search?: string },
  ): Promise<PaginatedResult<Record<string, unknown>>> {
    const { page, pageSize, status, category, search } = params;
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { organiser: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [tickets, totalItems] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          organiser: { select: { id: true, name: true, email: true, organisation: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
    };
  }

  async getSupportTicket(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        organiser: { select: { id: true, name: true, email: true, organisation: true } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async updateSupportTicket(
    id: string,
    dto: { status?: TicketStatus; priority?: TicketPriority; adminNote?: string },
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED' || dto.status === 'CLOSED') {
        data.resolvedAt = new Date();
      }
    }
    if (dto.priority !== undefined) data.priority = dto.priority;
    if (dto.adminNote !== undefined) data.adminNote = dto.adminNote;

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        organiser: { select: { id: true, name: true, email: true, organisation: true } },
      },
    });
    this.logger.log(`Support ticket ${id} updated by admin`);
    return updated;
  }

  // ──────────────────────────────────────────────
  // Private Excel helpers
  // ──────────────────────────────────────────────

  private styleHeader(ws: ExcelJS.Worksheet): void {
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 24;
  }

  private autoStyle(ws: ExcelJS.Worksheet): void {
    ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
        if (rowNum > 1) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowNum % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF' } };
        }
      });
    });
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }
}
