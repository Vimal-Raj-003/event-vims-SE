import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ComplianceService } from './compliance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

class RequestDeletionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

@Controller('attendees/me')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ATTENDEE')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  // ──────────────────────────────────────────────
  // Right to Access — DPDP Section 4
  // ──────────────────────────────────────────────

  @Get('data-export')
  async exportData(@CurrentUser() user: CurrentUserData) {
    return this.complianceService.exportData(user);
  }

  // ──────────────────────────────────────────────
  // Right to Erasure — DPDP Section 5
  // ──────────────────────────────────────────────

  @Post('request-deletion')
  @HttpCode(HttpStatus.CREATED)
  async requestDeletion(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: RequestDeletionDto,
  ) {
    return this.complianceService.requestDeletion(user, dto);
  }
}
