import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@Controller('organiser')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('events/:eventId/activity')
  @Roles('ORGANISER')
  async getEventActivity(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.activityService.getEventActivity(
      eventId,
      user,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(parseInt(pageSize, 10), 50) : 25,
    );
  }
}
