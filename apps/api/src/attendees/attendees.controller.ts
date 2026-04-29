import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Res,
  SetMetadata,
} from '@nestjs/common';
import { Response } from 'express';
import { AttendeesService } from './attendees.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

// ──────────────────────────────────────────────
// DTOs
// ──────────────────────────────────────────────

class RegisterAttendeeDto {
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
}

class UpdateAttendeeProfileDto {
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
}

// ──────────────────────────────────────────────
// Controller
// ──────────────────────────────────────────────

@Controller()
export class AttendeesController {
  constructor(private readonly attendeesService: AttendeesService) {}

  // ──────────────────────────────────────────────
  // PUBLIC: Register Attendee by Event Slug
  // ──────────────────────────────────────────────

  @Post('events/:eventSlug/register')
  @SetMetadata('isPublic', true)
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Param('eventSlug') eventSlug: string,
    @Body() dto: RegisterAttendeeDto,
  ) {
    return this.attendeesService.register(eventSlug, dto);
  }

  // ──────────────────────────────────────────────
  // ORGANISER: List Attendees for Event
  // ──────────────────────────────────────────────

  @Get('events/:eventId/attendees')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANISER')
  async findAll(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    return this.attendeesService.findAll(
      eventId,
      user.organiserId!,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 50,
      search,
    );
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Get Own Profile
  // ──────────────────────────────────────────────

  @Get('attendees/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getProfile(@CurrentUser() user: CurrentUserData) {
    return this.attendeesService.getProfile(user.sub);
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Update Own Profile
  // ──────────────────────────────────────────────

  @Patch('attendees/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async updateProfile(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateAttendeeProfileDto,
  ) {
    return this.attendeesService.updateProfile(user.sub, dto);
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Get Own Business Card
  // ──────────────────────────────────────────────

  @Get('attendees/me/card')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getBusinessCard(@CurrentUser() user: CurrentUserData) {
    return this.attendeesService.getBusinessCard(user.sub);
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Get Another Attendee's vCard
  // ──────────────────────────────────────────────

  @Get('attendees/:attendeeId/vcard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async generateVCard(
    @Param('attendeeId') attendeeId: string,
    @CurrentUser() user: CurrentUserData,
    @Res() res: Response,
  ) {
    const result = await this.attendeesService.generateVCard(
      user.sub,
      attendeeId,
    );

    res.setHeader('Content-Type', result.contentType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.filename}"`,
    );
    res.send(result.content);
  }
}
