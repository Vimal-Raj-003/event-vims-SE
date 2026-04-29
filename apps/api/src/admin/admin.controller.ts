import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Request } from 'express';
import { IsString, IsNotEmpty } from 'class-validator';

import { Req } from '@nestjs/common';

class RejectDeletionDto {
  @IsString() @IsNotEmpty() reason: string;
}

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ──────────────────────────────────────────────
  // Platform Analytics
  // ──────────────────────────────────────────────

  @Get('analytics')
  async getAnalytics() {
    return this.adminService.getAnalytics();
  }

  // ──────────────────────────────────────────────
  // Organisers Management
  // ──────────────────────────────────────────────

  @Get('organisers')
  async listOrganisers(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
  ) {
    return this.adminService.listOrganisers({ page, pageSize });
  }

  @Patch('organisers/:organiserId/suspend')
  async suspendOrganiser(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    return this.adminService.suspendOrganiser(
      organiserId,
      user.sub,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }

  @Patch('organisers/:organiserId/reactivate')
  async reactivateOrganiser(
    @Param('organiserId') organiserId: string,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    return this.adminService.reactivateOrganiser(
      organiserId,
      user.sub,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }

  // ──────────────────────────────────────────────
  // Events Management
  // ──────────────────────────────────────────────

  @Get('events')
  async listEvents(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listEvents({ page, pageSize, status, search });
  }

  @Get('events/:eventId')
  async getEvent(@Param('eventId') eventId: string) {
    return this.adminService.getEvent(eventId);
  }

  @Delete('events/:eventId')
  @HttpCode(HttpStatus.OK)
  async deleteEvent(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    return this.adminService.deleteEvent(
      eventId,
      user.sub,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }

  // ──────────────────────────────────────────────
  // Deletion Requests
  // ──────────────────────────────────────────────

  @Get('deletion-requests')
  async listDeletionRequests(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
  ) {
    return this.adminService.listDeletionRequests({ page, pageSize });
  }

  @Patch('deletion-requests/:id/approve')
  async approveDeletionRequest(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    return this.adminService.approveDeletionRequest(
      id,
      user.sub,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }

  @Patch('deletion-requests/:id/reject')
  async rejectDeletionRequest(
    @Param('id') id: string,
    @Body() dto: RejectDeletionDto,
    @CurrentUser() user: CurrentUserData,
    @Req() req: Request,
  ) {
    return this.adminService.rejectDeletionRequest(
      id,
      dto.reason,
      user.sub,
      req.ip ?? req.socket.remoteAddress ?? 'unknown',
      req.headers['user-agent'] ?? 'unknown',
    );
  }

  // ──────────────────────────────────────────────
  // Audit Log
  // ──────────────────────────────────────────────

  @Get('audit-log')
  async searchAuditLog(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 50,
    @Query('action') action?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.adminService.searchAuditLog({
      page,
      pageSize,
      action,
      entityType,
    });
  }
}
