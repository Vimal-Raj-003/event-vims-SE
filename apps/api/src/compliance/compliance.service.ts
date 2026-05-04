import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // Right to Access — DPPD Section 4
  // ──────────────────────────────────────────────

  async exportData(user: CurrentUserData) {
    const attendeeId = user.sub;

    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
      include: {
        event: {
          select: {
            id: true,
            name: true,
            venue: true,
            startAt: true,
            endAt: true,
          },
        },
        sentConnections: {
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true,
            respondedAt: true,
            receiver: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                company: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        receivedConnections: {
          select: {
            id: true,
            status: true,
            message: true,
            createdAt: true,
            respondedAt: true,
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                designation: true,
                company: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        notifications: {
          select: {
            id: true,
            title: true,
            body: true,
            eventType: true,
            isRead: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!attendee) {
      throw new NotFoundException(
        `Attendee profile not found for id ${attendeeId}`,
      );
    }

    return {
      exportDate: new Date().toISOString(),
      notice:
        'This data export is provided in compliance with the Digital Personal Data Protection Act (DPDP), Section 4 — Right to Access.',
      profile: {
        id: attendee.id,
        firstName: attendee.firstName,
        lastName: attendee.lastName,
        email: attendee.email,
        phone: attendee.phone,
        designation: attendee.designation,
        company: attendee.company,
        businessType: attendee.businessType,
        industry: attendee.industry,
        services: attendee.services,
        city: attendee.city,
        address: attendee.address,
        companySize: attendee.companySize,
        tags: attendee.tags,
        profilePhotoUrl: attendee.profilePhotoUrl,
        companyLogoUrl: attendee.companyLogoUrl,
        registeredAt: attendee.registeredAt,
        lastActiveAt: attendee.lastActiveAt,
        isPaused: attendee.isPaused,
        consentGiven: attendee.consentGiven,
        consentedAt: attendee.consentedAt,
        event: attendee.event,
      },
      sentConnections: attendee.sentConnections,
      receivedConnections: attendee.receivedConnections,
      notifications: attendee.notifications,
      summary: {
        totalSentConnections: attendee.sentConnections.length,
        totalReceivedConnections: attendee.receivedConnections.length,
        totalNotifications: attendee.notifications.length,
      },
    };
  }

  // ──────────────────────────────────────────────
  // Right to Erasure — DPPD Section 5
  // ──────────────────────────────────────────────

  async requestDeletion(
    user: CurrentUserData,
    dto?: { reason?: string },
  ) {
    const attendeeId = user.sub;
    const requesterEmail = user.email;
    const eventId = user.eventId ?? null;

    // Verify attendee exists
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!attendee) {
      throw new NotFoundException(
        `Attendee profile not found for id ${attendeeId}`,
      );
    }

    const userReason = dto?.reason?.trim();
    const trailer = `submitted by ${attendee.firstName} ${attendee.lastName} (${attendee.email})`;
    const reason = userReason
      ? `${userReason}\n\n— ${trailer}`
      : `Data deletion requested by attendee ${attendee.firstName} ${attendee.lastName} (${attendee.email})`;

    const deletionRequest = await this.prisma.dataDeletionRequest.create({
      data: {
        requesterEmail,
        eventId,
        reason,
        status: 'PENDING',
      },
    });

    this.logger.log(
      `Data deletion request ${deletionRequest.id} created by attendee ${attendeeId}`,
    );

    return {
      id: deletionRequest.id,
      status: deletionRequest.status,
      requestedAt: deletionRequest.requestedAt,
      message:
        'Your data deletion request has been submitted and is pending review by a Super Administrator. You will be notified once the request is processed.',
    };
  }
}
