import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type CurrentUserData } from '../auth/decorators/current-user.decorator';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

class PushSubscribeDto {
  @IsString() @IsNotEmpty() endpoint: string;
  @IsString() @IsNotEmpty() p256dh: string;
  @IsString() @IsNotEmpty() auth: string;
}

class PaginationQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) pageSize?: number = 20;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @Roles('attendee')
  getNotifications(
    @CurrentUser() user: CurrentUserData,
    @Query() query: PaginationQueryDto,
  ) {
    return this.notificationsService.getNotifications(
      user.sub,
      query.page,
      query.pageSize,
    );
  }

  @Patch(':id/read')
  @Roles('attendee')
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Patch('read-all')
  @Roles('attendee')
  markAllAsRead(@CurrentUser() user: CurrentUserData) {
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Post('push/subscribe')
  @Roles('attendee')
  subscribePush(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: PushSubscribeDto,
  ) {
    return this.notificationsService.subscribePush(user.sub, dto);
  }
}
