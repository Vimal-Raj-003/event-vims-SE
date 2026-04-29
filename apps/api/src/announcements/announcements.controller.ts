import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dtos/create-announcement.dto';
import { PaginationQueryDto } from './dtos/pagination-query.dto';

@Controller('events/:eventId/announcements')
@UseGuards(JwtAuthGuard)
@Roles('ORGANISER')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('eventId') eventId: string,
    @Body() dto: CreateAnnouncementDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.announcementsService.create(
      eventId,
      user.organiserId!,
      dto,
    );
  }

  @Get()
  async findAll(
    @Param('eventId') eventId: string,
    @Query() query: PaginationQueryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.announcementsService.findAll(
      eventId,
      user.organiserId!,
      query,
    );
  }
}
