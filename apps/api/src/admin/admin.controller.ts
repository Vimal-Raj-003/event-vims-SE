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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { Request } from 'express';
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { TicketStatus, TicketPriority } from '@prisma/client';

import { Req } from '@nestjs/common';

class RejectDeletionDto {
  @IsString() @IsNotEmpty() reason: string;
}

class UpdateTicketDto {
  @IsOptional() @IsEnum(TicketStatus) status?: TicketStatus;
  @IsOptional() @IsEnum(TicketPriority) priority?: TicketPriority;
  @IsOptional() @IsString() adminNote?: string;
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

  // ──────────────────────────────────────────────
  // Export Endpoints (Excel downloads)
  // ──────────────────────────────────────────────

  @Get('export/organisers')
  async exportOrganisers(@Res() res: Response) {
    const buffer = await this.adminService.exportOrganisers();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="vims_organisers_${date}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('export/events')
  async exportEvents(@Res() res: Response) {
    const buffer = await this.adminService.exportEvents();
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="vims_events_${date}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  @Get('export/attendees')
  async exportAttendees(
    @Res() res: Response,
    @Query('eventId') eventId?: string,
  ) {
    const buffer = await this.adminService.exportAttendees(eventId);
    const date = new Date().toISOString().slice(0, 10);
    const suffix = eventId ? `_event_${eventId.slice(0, 8)}` : '_all';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="vims_attendees${suffix}_${date}.xlsx"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }

  // ──────────────────────────────────────────────
  // Support Tickets
  // ──────────────────────────────────────────────

  @Get('support-tickets')
  async listSupportTickets(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
    @Query('status') status?: string,
    @Query('category') category?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.listSupportTickets({ page, pageSize, status, category, search });
  }

  @Get('support-tickets/:id')
  async getSupportTicket(@Param('id') id: string) {
    return this.adminService.getSupportTicket(id);
  }

  @Patch('support-tickets/:id')
  async updateSupportTicket(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.adminService.updateSupportTicket(id, dto);
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
