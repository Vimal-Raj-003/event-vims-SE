import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { DirectoryService } from './directory.service';

@Controller('events/:eventId/directory')
@UseGuards(JwtAuthGuard)
@Roles('ATTENDEE')
export class DirectoryController {
  constructor(private readonly directoryService: DirectoryService) {}

  @Get()
  async findAttendees(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('search') search?: string,
    @Query('businessType') businessType?: string,
    @Query('industry') industry?: string,
    @Query('city') city?: string,
    @Query('services') services?: string,
    @Query('companySize') companySize?: string,
    @Query('tags') tags?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('pageSize', new DefaultValuePipe(50), ParseIntPipe)
    pageSize?: number,
  ) {
    return this.directoryService.findAttendees(eventId, user, {
      search,
      businessType,
      industry,
      city,
      services,
      companySize,
      tags,
      page: page ?? 1,
      pageSize: pageSize ?? 50,
    });
  }
}
