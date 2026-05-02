import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { ConnectionStatus, EventStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttendeesService {
  private readonly logger = new Logger(AttendeesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cls: ClsService,
  ) {}

  // ──────────────────────────────────────────────
  // Register Attendee (Public)
  // ──────────────────────────────────────────────

  async register(
    eventSlug: string,
    dto: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      designation: string;
      company: string;
      businessType: string;
      industry: string;
      services?: unknown;
      city: string;
      address?: string;
      companySize?: string;
      tags?: unknown;
      profilePhotoUrl?: string;
      companyLogoUrl?: string;
      consentGiven: boolean;
    },
  ) {
    if (!dto.consentGiven) {
      throw new BadRequestException('Consent is required to register');
    }

    // Resolve event by slug
    const event = await this.prisma.event.findUnique({
      where: { slug: eventSlug },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException('Event is not open for registration');
    }

    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check for existing registration (unique constraint on eventId + email)
    const existing = await this.prisma.attendee.findUnique({
      where: {
        eventId_email: {
          eventId: event.id,
          email: normalizedEmail,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Already registered. Please login.');
    }

    const attendee = await this.prisma.attendee.create({
      data: {
        eventId: event.id,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: normalizedEmail,
        phone: dto.phone,
        designation: dto.designation,
        company: dto.company,
        businessType: dto.businessType,
        industry: dto.industry,
        services: dto.services ?? [],
        city: dto.city,
        address: dto.address ?? null,
        companySize: dto.companySize ?? null,
        tags: dto.tags ?? [],
        profilePhotoUrl: dto.profilePhotoUrl ?? null,
        companyLogoUrl: dto.companyLogoUrl ?? null,
        consentGiven: true,
        consentedAt: new Date(),
      },
    });

    this.logger.log(
      `Attendee registered: ${attendee.id} for event ${event.id}`,
    );

    return {
      id: attendee.id,
      eventId: attendee.eventId,
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      email: attendee.email,
      message: 'Registration successful',
    };
  }

  // ──────────────────────────────────────────────
  // List Attendees (Organiser, paginated)
  // ──────────────────────────────────────────────

  async findAll(
    eventId: string,
    organiserId: string,
    page: number = 1,
    pageSize: number = 50,
    search?: string,
  ) {
    // Verify event ownership
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    const skip = (page - 1) * pageSize;

    const where: Prisma.AttendeeWhereInput = { eventId };

    if (search) {
      const searchTerm = search.trim();
      where.OR = [
        { firstName: { contains: searchTerm, mode: 'insensitive' } },
        { lastName: { contains: searchTerm, mode: 'insensitive' } },
        { company: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const [attendees, total] = await Promise.all([
      this.prisma.attendee.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { registeredAt: 'desc' },
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
          city: true,
          companySize: true,
          profilePhotoUrl: true,
          companyLogoUrl: true,
          registeredAt: true,
          lastActiveAt: true,
          isPaused: true,
        },
      }),
      this.prisma.attendee.count({ where }),
    ]);

    return {
      data: attendees,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  // ──────────────────────────────────────────────
  // Get Own Profile (Attendee)
  // ──────────────────────────────────────────────

  async getProfile(attendeeId: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    return {
      id: attendee.id,
      eventId: attendee.eventId,
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
    };
  }

  // ──────────────────────────────────────────────
  // Update Own Profile (Attendee)
  // ──────────────────────────────────────────────

  async updateProfile(
    attendeeId: string,
    dto: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      designation?: string;
      company?: string;
      businessType?: string;
      industry?: string;
      services?: unknown;
      city?: string;
      address?: string;
      companySize?: string;
      tags?: unknown;
      profilePhotoUrl?: string;
      companyLogoUrl?: string;
    },
  ) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.designation !== undefined) updateData.designation = dto.designation;
    if (dto.company !== undefined) updateData.company = dto.company;
    if (dto.businessType !== undefined) updateData.businessType = dto.businessType;
    if (dto.industry !== undefined) updateData.industry = dto.industry;
    if (dto.services !== undefined) updateData.services = dto.services;
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.companySize !== undefined) updateData.companySize = dto.companySize;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = dto.profilePhotoUrl;
    if (dto.companyLogoUrl !== undefined) updateData.companyLogoUrl = dto.companyLogoUrl;

    const updated = await this.prisma.attendee.update({
      where: { id: attendeeId },
      data: updateData,
    });

    this.logger.log(`Attendee profile updated: ${attendeeId}`);

    return {
      id: updated.id,
      eventId: updated.eventId,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      designation: updated.designation,
      company: updated.company,
      businessType: updated.businessType,
      industry: updated.industry,
      services: updated.services,
      city: updated.city,
      address: updated.address,
      companySize: updated.companySize,
      tags: updated.tags,
      profilePhotoUrl: updated.profilePhotoUrl,
      companyLogoUrl: updated.companyLogoUrl,
    };
  }

  // ──────────────────────────────────────────────
  // Get Business Card (Attendee)
  // ──────────────────────────────────────────────

  async getBusinessCard(attendeeId: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    return {
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      designation: attendee.designation,
      company: attendee.company,
      businessType: attendee.businessType,
      industry: attendee.industry,
      services: attendee.services,
      city: attendee.city,
      phone: attendee.phone,
      email: attendee.email,
      profilePhotoUrl: attendee.profilePhotoUrl,
      companyLogoUrl: attendee.companyLogoUrl,
    };
  }

  // ──────────────────────────────────────────────
  // Generate vCard (Attendee)
  // ──────────────────────────────────────────────

  async generateVCard(requesterId: string, targetAttendeeId: string) {
    // Cannot request own vCard
    if (requesterId === targetAttendeeId) {
      throw new BadRequestException('Cannot request your own vCard');
    }

    // Fetch both attendees to determine the event
    const [requester, target] = await Promise.all([
      this.prisma.attendee.findUnique({ where: { id: requesterId } }),
      this.prisma.attendee.findUnique({ where: { id: targetAttendeeId } }),
    ]);

    if (!requester) {
      throw new NotFoundException('Requester not found');
    }

    if (!target) {
      throw new NotFoundException('Target attendee not found');
    }

    // Verify both attendees belong to the same event
    if (requester.eventId !== target.eventId) {
      throw new ForbiddenException('Attendees are not in the same event');
    }

    // Check for ACCEPTED connection between requester and target in either direction
    const connection = await this.prisma.connectionRequest.findFirst({
      where: {
        eventId: requester.eventId,
        status: ConnectionStatus.ACCEPTED,
        OR: [
          {
            senderId: requesterId,
            receiverId: targetAttendeeId,
          },
          {
            senderId: targetAttendeeId,
            receiverId: requesterId,
          },
        ],
      },
    });

    if (!connection) {
      throw new ForbiddenException(
        'An accepted connection is required to view this contact card',
      );
    }

    // Generate vCard 3.0
    const lines: string[] = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${target.firstName} ${target.lastName}`,
      `N:${target.lastName};${target.firstName};;;`,
    ];

    if (target.company) {
      lines.push(`ORG:${target.company}`);
    }

    if (target.designation) {
      lines.push(`TITLE:${target.designation}`);
    }

    if (target.email) {
      lines.push(`EMAIL;TYPE=INTERNET:${target.email}`);
    }

    if (target.phone) {
      lines.push(`TEL;TYPE=CELL:${target.phone}`);
    }

    if (target.city || target.address) {
      const addressParts = ['', '', target.address ?? '', target.city ?? '', '', '', ''];
      lines.push(`ADR;TYPE=WORK:${addressParts.join(';')}`);
    }

    // Build NOTE from business details
    const noteParts: string[] = [];
    if (target.businessType) noteParts.push(`Type: ${target.businessType}`);
    if (target.industry) noteParts.push(`Industry: ${target.industry}`);

    const services = target.services as string[] | null;
    if (services && Array.isArray(services) && services.length > 0) {
      noteParts.push(`Services: ${services.join(', ')}`);
    }

    if (noteParts.length > 0) {
      lines.push(`NOTE:${noteParts.join(' | ')}`);
    }

    lines.push('END:VCARD');

    const vCardContent = lines.join('\r\n');

    this.logger.log(
      `vCard generated: requester=${requesterId}, target=${targetAttendeeId}`,
    );

    return {
      contentType: 'text/vcard',
      filename: `${target.firstName}_${target.lastName}.vcf`,
      content: vCardContent,
    };
  }

  // ──────────────────────────────────────────────
  // Get Profile Status (Attendee)
  // ──────────────────────────────────────────────

  async getProfileStatus(attendeeId: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    const allFields: Record<string, unknown> = {
      firstName: attendee.firstName,
      lastName: attendee.lastName,
      age: attendee.age,
      sex: attendee.sex,
      email: attendee.email,
      phone: attendee.phone,
      profilePhotoUrl: attendee.profilePhotoUrl,
      designation: attendee.designation,
      company: attendee.company,
      occupation: attendee.occupation,
      industry: attendee.industry,
      businessType: attendee.businessType,
      services: attendee.services,
      interestedIn: attendee.interestedIn,
      tags: attendee.tags,
      networkingGoals: attendee.networkingGoals,
      linkedinUrl: attendee.linkedinUrl,
      websiteUrl: attendee.websiteUrl,
    };

    const filled = Object.values(allFields).filter(
      (v) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0),
    ).length;
    const total = Object.keys(allFields).length;
    const missingFields = Object.entries(allFields)
      .filter(([, v]) => v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0))
      .map(([k]) => k);

    const completedSteps: string[] = [];
    if (attendee.firstName && attendee.lastName && attendee.phone) completedSteps.push('personal');
    if (attendee.company && attendee.designation && attendee.industry) completedSteps.push('professional');
    if (attendee.services && Array.isArray(attendee.services) && (attendee.services as string[]).length > 0) completedSteps.push('services');
    if (attendee.networkingGoals && Array.isArray(attendee.networkingGoals) && (attendee.networkingGoals as string[]).length > 0) completedSteps.push('preferences');

    let currentStep = 1;
    if (completedSteps.includes('personal')) currentStep = 2;
    if (completedSteps.includes('professional')) currentStep = 3;
    if (completedSteps.includes('services')) currentStep = 4;

    return {
      profileCompleted: attendee.profileCompleted,
      currentStep: attendee.profileCompleted ? 4 : currentStep,
      completedSteps,
      completenessPercent: Math.round((filled / total) * 100),
      missingFields,
    };
  }

  // ──────────────────────────────────────────────
  // Save Wizard Step (Attendee)
  // ──────────────────────────────────────────────

  async saveWizardStep(attendeeId: string, step: number, data: Record<string, unknown>) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    const updateData: Record<string, unknown> = {};

    if (step === 1) {
      if (data.firstName !== undefined) updateData.firstName = data.firstName;
      if (data.lastName !== undefined) updateData.lastName = data.lastName;
      if (data.age !== undefined) updateData.age = Number(data.age) || null;
      if (data.sex !== undefined) updateData.sex = data.sex;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.profilePhotoUrl !== undefined) updateData.profilePhotoUrl = data.profilePhotoUrl;
    } else if (step === 2) {
      if (data.company !== undefined) updateData.company = data.company;
      if (data.designation !== undefined) updateData.designation = data.designation;
      if (data.occupation !== undefined) updateData.occupation = data.occupation;
      if (data.industry !== undefined) updateData.industry = data.industry;
      if (data.businessType !== undefined) updateData.businessType = data.businessType;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.companySize !== undefined) updateData.companySize = data.companySize;
    } else if (step === 3) {
      if (data.services !== undefined) updateData.services = data.services;
      if (data.interestedIn !== undefined) updateData.interestedIn = data.interestedIn;
      if (data.tags !== undefined) updateData.tags = data.tags;
    } else if (step === 4) {
      if (data.networkingGoals !== undefined) updateData.networkingGoals = data.networkingGoals;
      if (data.linkedinUrl !== undefined) updateData.linkedinUrl = data.linkedinUrl;
      if (data.websiteUrl !== undefined) updateData.websiteUrl = data.websiteUrl;
      if (data.twitterHandle !== undefined) updateData.twitterHandle = data.twitterHandle;
      if (data.consentGiven !== undefined) {
        updateData.consentGiven = data.consentGiven;
        if (data.consentGiven) updateData.consentedAt = new Date();
      }
      updateData.profileCompleted = true;
      updateData.profileCompletedAt = new Date();
    }

    updateData.lastActiveAt = new Date();

    await this.prisma.attendee.update({
      where: { id: attendeeId },
      data: updateData,
    });

    if (step === 4) {
      await this.prisma.activity.create({
        data: {
          attendeeId,
          eventId: attendee.eventId,
          type: 'profile_completed',
          metadata: {},
        },
      });
    }

    const status = await this.getProfileStatus(attendeeId);

    return {
      success: true,
      profileCompleted: step === 4 ? true : attendee.profileCompleted,
      currentStep: step,
      ...status,
    };
  }

  // ──────────────────────────────────────────────
  // Track Card Share (Attendee)
  // ──────────────────────────────────────────────

  async trackCardShare(attendeeId: string, method: string) {
    const attendee = await this.prisma.attendee.findUnique({
      where: { id: attendeeId },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    await this.prisma.attendee.update({
      where: { id: attendeeId },
      data: { cardShareCount: { increment: 1 } },
    });

    await this.prisma.activity.create({
      data: {
        attendeeId,
        eventId: attendee.eventId,
        type: 'card_shared',
        metadata: { method },
      },
    });

    return { success: true };
  }

  // ──────────────────────────────────────────────
  // Track Profile View (Attendee)
  // ──────────────────────────────────────────────

  async trackProfileView(viewerId: string, viewedId: string, source: string) {
    if (viewerId === viewedId) {
      return { success: true };
    }

    const [viewer, viewed] = await Promise.all([
      this.prisma.attendee.findUnique({ where: { id: viewerId } }),
      this.prisma.attendee.findUnique({ where: { id: viewedId } }),
    ]);

    if (!viewer || !viewed) {
      throw new NotFoundException('Attendee not found');
    }

    if (viewer.eventId !== viewed.eventId) {
      throw new ForbiddenException('Attendees are not in the same event');
    }

    await Promise.all([
      this.prisma.profileView.create({
        data: {
          viewerId,
          viewedId,
          eventId: viewer.eventId,
          source,
        },
      }),
      this.prisma.attendee.update({
        where: { id: viewedId },
        data: { profileViewCount: { increment: 1 } },
      }),
      this.prisma.activity.create({
        data: {
          attendeeId: viewerId,
          eventId: viewer.eventId,
          type: 'profile_viewed',
          metadata: { targetId: viewedId, targetName: `${viewed.firstName} ${viewed.lastName}` },
        },
      }),
    ]);

    return { success: true };
  }

  // ──────────────────────────────────────────────
  // Get Public Profile (Attendee)
  // ──────────────────────────────────────────────

  async getPublicProfile(requesterId: string, targetId: string) {
    const [requester, target] = await Promise.all([
      this.prisma.attendee.findUnique({ where: { id: requesterId } }),
      this.prisma.attendee.findUnique({ where: { id: targetId } }),
    ]);

    if (!target) {
      throw new NotFoundException('Attendee not found');
    }

    if (requester && requester.eventId === target.eventId) {
      const connection = await this.prisma.connectionRequest.findFirst({
        where: {
          eventId: target.eventId,
          status: ConnectionStatus.ACCEPTED,
          OR: [
            { senderId: requesterId, receiverId: targetId },
            { senderId: targetId, receiverId: requesterId },
          ],
        },
      });

      return {
        id: target.id,
        firstName: target.firstName,
        lastName: target.lastName,
        designation: target.designation,
        company: target.company,
        businessType: target.businessType,
        industry: target.industry,
        services: target.services,
        tags: target.tags,
        city: target.city,
        profilePhotoUrl: target.profilePhotoUrl,
        companyLogoUrl: target.companyLogoUrl,
        interestedIn: target.interestedIn,
        networkingGoals: target.networkingGoals,
        linkedinUrl: target.linkedinUrl,
        websiteUrl: target.websiteUrl,
        twitterHandle: target.twitterHandle,
        connectionStatus: connection ? 'ACCEPTED' : null,
      };
    }

    return {
      id: target.id,
      firstName: target.firstName,
      lastName: target.lastName,
      designation: target.designation,
      company: target.company,
      businessType: target.businessType,
      industry: target.industry,
      services: target.services,
      city: target.city,
      profilePhotoUrl: target.profilePhotoUrl,
      companyLogoUrl: target.companyLogoUrl,
      connectionStatus: null,
    };
  }
}
