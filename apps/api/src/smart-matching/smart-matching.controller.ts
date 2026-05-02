import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SmartMatchingService } from './smart-matching.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

@Controller()
export class SmartMatchingController {
  constructor(private readonly matchingService: SmartMatchingService) {}

  @Get('events/:eventId/suggestions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async getSuggestions(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.matchingService.getSuggestions(
      user.sub,
      eventId,
      limit ? parseInt(limit, 10) : 10,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Post('events/:eventId/suggestions/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ATTENDEE')
  async refreshSuggestions(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.matchingService.refreshSuggestions(user.sub, eventId);
  }
}
