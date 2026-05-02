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
import { IsString, IsEmail, IsBoolean, IsOptional, IsNotEmpty, IsInt, IsNumber, ValidateIf } from 'class-validator';
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
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsEmail() email: string;
  @IsString() @IsNotEmpty() phone: string;
  @IsString() @IsNotEmpty() designation: string;
  @IsString() @IsNotEmpty() company: string;
  @IsString() @IsNotEmpty() businessType: string;
  @IsString() @IsNotEmpty() industry: string;
  @IsOptional() services?: unknown;
  @IsString() @IsNotEmpty() city: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() companySize?: string;
  @IsOptional() tags?: unknown;
  @IsOptional() @IsString() profilePhotoUrl?: string;
  @IsOptional() @IsString() companyLogoUrl?: string;
  @IsBoolean() consentGiven: boolean;
}

class UpdateAttendeeProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() designation?: string;
  @IsOptional() @IsString() company?: string;
  @IsOptional() @IsString() businessType?: string;
  @IsOptional() @IsString() industry?: string;
  @IsOptional() services?: unknown;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() companySize?: string;
  @IsOptional() tags?: unknown;
  @IsOptional() @IsString() profilePhotoUrl?: string;
  @IsOptional() @IsString() companyLogoUrl?: string;
}

class WizardStepDto {
  @IsInt() step: 1 | 2 | 3 | 4;
  data: Record<string, unknown>;
}

class TrackCardShareDto {
  @IsString() @IsNotEmpty() method: string;
}

class TrackProfileViewDto {
  @IsString() @IsNotEmpty() source: string;
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
  // ATTENDEE: Get Profile Status
  // ──────────────────────────────────────────────

  @Get('attendees/me/profile-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getProfileStatus(@CurrentUser() user: CurrentUserData) {
    return this.attendeesService.getProfileStatus(user.sub);
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Save Wizard Step
  // ──────────────────────────────────────────────

  @Patch('attendees/me/wizard-step')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async saveWizardStep(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: WizardStepDto,
  ) {
    return this.attendeesService.saveWizardStep(user.sub, dto.step, dto.data);
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Track Card Share
  // ──────────────────────────────────────────────

  @Post('attendees/me/card/shared')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  @HttpCode(HttpStatus.OK)
  async trackCardShare(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TrackCardShareDto,
  ) {
    return this.attendeesService.trackCardShare(user.sub, dto.method);
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Track Profile View
  // ──────────────────────────────────────────────

  @Post('attendees/:attendeeId/view')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  @HttpCode(HttpStatus.OK)
  async trackProfileView(
    @Param('attendeeId') attendeeId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: TrackProfileViewDto,
  ) {
    return this.attendeesService.trackProfileView(user.sub, attendeeId, dto.source);
  }

  // ──────────────────────────────────────────────
  // ATTENDEE: Get Public Profile
  // ──────────────────────────────────────────────

  @Get('attendees/:attendeeId/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getPublicProfile(
    @Param('attendeeId') attendeeId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.attendeesService.getPublicProfile(user.sub, attendeeId);
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
