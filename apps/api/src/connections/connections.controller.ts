import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ConnectionsService } from './connections.service';

class SendConnectionDto {
  @IsString() @IsNotEmpty() receiverId: string;
  @IsOptional() @IsString() @MaxLength(200) message?: string;
}

@Controller('events/:eventId/connections')
@UseGuards(JwtAuthGuard)
@Roles('ATTENDEE')
export class ConnectionsController {
  constructor(private readonly connectionsService: ConnectionsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async sendRequest(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: SendConnectionDto,
  ) {
    return this.connectionsService.sendRequest(
      eventId,
      user,
      dto.receiverId,
      dto.message,
    );
  }

  @Get()
  async findAccepted(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.connectionsService.findAccepted(eventId, user);
  }

  @Get('requests')
  async findPendingRequests(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.connectionsService.findPendingRequests(eventId, user);
  }

  @Patch(':connectionId/accept')
  async acceptRequest(
    @Param('eventId') eventId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.connectionsService.acceptRequest(eventId, user, connectionId);
  }

  @Patch(':connectionId/decline')
  async declineRequest(
    @Param('eventId') eventId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.connectionsService.declineRequest(eventId, user, connectionId);
  }

  @Patch(':connectionId/withdraw')
  async withdrawRequest(
    @Param('eventId') eventId: string,
    @Param('connectionId') connectionId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.connectionsService.withdrawRequest(eventId, user, connectionId);
  }
}
