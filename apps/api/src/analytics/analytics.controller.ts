import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('attendees/me/analytics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getAnalytics(@CurrentUser() user: CurrentUserData) {
    return this.analyticsService.getDashboardData(user.sub);
  }

  @Get('attendees/me/analytics/trends')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getTrends(
    @CurrentUser() user: CurrentUserData,
    @Query('period') period?: string,
  ) {
    return this.analyticsService.getTrends(user.sub, period ?? '7d');
  }
}
