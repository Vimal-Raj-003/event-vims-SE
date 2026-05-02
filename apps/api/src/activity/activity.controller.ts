import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('events/:eventId/activities')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getActivities(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.activityService.getActivities(
      user.sub,
      eventId,
      page ? parseInt(page, 10) : 1,
      pageSize ? parseInt(pageSize, 10) : 20,
    );
  }
}
