import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Injectable()
export class ConnectionsService {
  private readonly logger = new Logger(ConnectionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ──────────────────────────────────────────────
  // Send Connection Request
  // ──────────────────────────────────────────────

  async sendRequest(
    eventId: string,
    user: CurrentUserData,
    receiverId: string,
    message?: string,
  ) {
    if (user.eventId !== eventId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    if (user.sub === receiverId) {
      throw new BadRequestException('You cannot send a connection request to yourself');
    }

    // Verify receiver exists in the same event
    const receiver = await this.prisma.attendee.findFirst({
      where: { id: receiverId, eventId },
    });

    if (!receiver) {
      throw new NotFoundException('Recipient not found in this event');
    }

    // Check if sender is paused
    const sender = await this.prisma.attendee.findUnique({
      where: { id: user.sub },
    });

    if (sender?.isPaused) {
      throw new BadRequestException(
        'Your account is paused. Please contact the organiser.',
      );
    }

    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    // Anti-spam check
    await this.checkSpam(user.sub, eventId);

    // Check for existing connection between the two attendees
    const existing = await this.prisma.connectionRequest.findFirst({
      where: {
        eventId,
        OR: [
          { senderId: user.sub, receiverId },
          { senderId: receiverId, receiverId: user.sub },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      if (existing.status === 'PENDING') {
        throw new BadRequestException(
          'A pending connection request already exists between you and this attendee',
        );
      }
      if (existing.status === 'ACCEPTED') {
        throw new BadRequestException(
          'You are already connected with this attendee',
        );
      }
      if (existing.status === 'DECLINED') {
        // Sender can re-send after 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (existing.respondedAt && existing.respondedAt > twentyFourHoursAgo) {
          throw new BadRequestException(
            'Please wait 24 hours before sending another request to this attendee',
          );
        }
      }
      // WITHDRAWN or old DECLINED: allow re-send
    }

    const connection = await this.prisma.connectionRequest.create({
      data: {
        eventId,
        senderId: user.sub,
        receiverId,
        message: message || null,
        status: 'PENDING',
      },
    });

    // Create notification for receiver
    await this.prisma.notification.create({
      data: {
        attendeeId: receiverId,
        eventType: 'CONNECTION_REQUEST',
        title: 'New Connection Request',
        body: `${sender.firstName} ${sender.lastName} wants to connect with you`,
        relatedEntityId: connection.id,
      },
    });

    this.logger.log(
      `Connection request sent: ${user.sub} -> ${receiverId} in event ${eventId}`,
    );

    return {
      id: connection.id,
      status: connection.status,
      message: 'Connection request sent successfully',
    };
  }

  // ──────────────────────────────────────────────
  // List Accepted Connections
  // ──────────────────────────────────────────────

  async findAccepted(eventId: string, user: CurrentUserData) {
    if (user.eventId !== eventId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    const connections = await this.prisma.connectionRequest.findMany({
      where: {
        eventId,
        status: 'ACCEPTED',
        OR: [
          { senderId: user.sub },
          { receiverId: user.sub },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            designation: true,
            company: true,
            businessType: true,
            industry: true,
            services: true,
            city: true,
            address: true,
            companySize: true,
            tags: true,
            profilePhotoUrl: true,
            companyLogoUrl: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            designation: true,
            company: true,
            businessType: true,
            industry: true,
            services: true,
            city: true,
            address: true,
            companySize: true,
            tags: true,
            profilePhotoUrl: true,
            companyLogoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Return the other party's data (full data since accepted)
    return connections.map((conn) => {
      const peer = conn.senderId === user.sub ? conn.receiver : conn.sender;
      return {
        connectionId: conn.id,
        connectedAt: conn.respondedAt,
        attendee: {
          ...peer,
          services: Array.isArray(peer.services) ? peer.services : [],
          tags: Array.isArray(peer.tags) ? peer.tags : [],
        },
      };
    });
  }

  // ──────────────────────────────────────────────
  // List Incoming Pending Requests
  // ──────────────────────────────────────────────

  async findPendingRequests(eventId: string, user: CurrentUserData) {
    if (user.eventId !== eventId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    const requests = await this.prisma.connectionRequest.findMany({
      where: {
        eventId,
        receiverId: user.sub,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            designation: true,
            company: true,
            businessType: true,
            city: true,
            services: true,
            profilePhotoUrl: true,
            companyLogoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return requests.map((req) => ({
      connectionId: req.id,
      message: req.message,
      requestedAt: req.createdAt,
      sender: {
        ...req.sender,
        services: Array.isArray(req.sender.services)
          ? (req.sender.services as string[]).slice(0, 2)
          : [],
      },
    }));
  }

  // ──────────────────────────────────────────────
  // Accept Connection Request
  // ──────────────────────────────────────────────

  async acceptRequest(
    eventId: string,
    user: CurrentUserData,
    connectionId: string,
  ) {
    if (user.eventId !== eventId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    const connection = await this.prisma.connectionRequest.findFirst({
      where: { id: connectionId, eventId },
    });

    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }

    if (connection.receiverId !== user.sub) {
      throw new ForbiddenException('Only the recipient can accept this request');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot accept a request with status: ${connection.status}`,
      );
    }

    const updated = await this.prisma.connectionRequest.update({
      where: { id: connectionId },
      data: {
        status: 'ACCEPTED',
        respondedAt: new Date(),
      },
    });

    // Create notification for sender
    await this.prisma.notification.create({
      data: {
        attendeeId: connection.senderId,
        eventType: 'CONNECTION_ACCEPTED',
        title: 'Connection Accepted',
        body: 'Your connection request has been accepted',
        relatedEntityId: connection.id,
      },
    });

    this.logger.log(
      `Connection accepted: ${connection.senderId} <-> ${connection.receiverId} in event ${eventId}`,
    );

    return {
      id: updated.id,
      status: updated.status,
      respondedAt: updated.respondedAt,
      message: 'Connection request accepted',
    };
  }

  // ──────────────────────────────────────────────
  // Decline Connection Request
  // ──────────────────────────────────────────────

  async declineRequest(
    eventId: string,
    user: CurrentUserData,
    connectionId: string,
  ) {
    if (user.eventId !== eventId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    const connection = await this.prisma.connectionRequest.findFirst({
      where: { id: connectionId, eventId },
    });

    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }

    if (connection.receiverId !== user.sub) {
      throw new ForbiddenException('Only the recipient can decline this request');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot decline a request with status: ${connection.status}`,
      );
    }

    const updated = await this.prisma.connectionRequest.update({
      where: { id: connectionId },
      data: {
        status: 'DECLINED',
        respondedAt: new Date(),
      },
    });

    this.logger.log(
      `Connection declined: ${connection.senderId} -> ${connection.receiverId} in event ${eventId}`,
    );

    return {
      id: updated.id,
      status: updated.status,
      respondedAt: updated.respondedAt,
      message: 'Connection request declined. Sender can re-send after 24 hours.',
    };
  }

  // ──────────────────────────────────────────────
  // Withdraw Connection Request
  // ──────────────────────────────────────────────

  async withdrawRequest(
    eventId: string,
    user: CurrentUserData,
    connectionId: string,
  ) {
    if (user.eventId !== eventId) {
      throw new ForbiddenException('You do not have access to this event');
    }

    const connection = await this.prisma.connectionRequest.findFirst({
      where: { id: connectionId, eventId },
    });

    if (!connection) {
      throw new NotFoundException('Connection request not found');
    }

    if (connection.senderId !== user.sub) {
      throw new ForbiddenException('Only the sender can withdraw this request');
    }

    if (connection.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot withdraw a request with status: ${connection.status}`,
      );
    }

    const updated = await this.prisma.connectionRequest.update({
      where: { id: connectionId },
      data: {
        status: 'WITHDRAWN',
      },
    });

    this.logger.log(
      `Connection withdrawn: ${connection.senderId} -> ${connection.receiverId} in event ${eventId}`,
    );

    return {
      id: updated.id,
      status: updated.status,
      message: 'Connection request withdrawn. You can re-send immediately.',
    };
  }

  // ──────────────────────────────────────────────
  // Anti-Spam Check
  // ──────────────────────────────────────────────

  async checkSpam(senderId: string, eventId: string): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.prisma.connectionRequest.count({
      where: {
        senderId,
        eventId,
        createdAt: { gte: oneHourAgo },
      },
    });
    if (recentCount >= 50) {
      await this.prisma.attendee.update({
        where: { id: senderId },
        data: { isPaused: true },
      });
      throw new BadRequestException(
        'Account paused due to excessive requests. Please contact the organiser.',
      );
    }
  }
}
