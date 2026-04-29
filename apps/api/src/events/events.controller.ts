import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { EventsService } from './events.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

class CreateEventDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @MaxLength(500) description: string;
  @IsDateString() startAt: string;
  @IsDateString() endAt: string;
  @IsString() @IsNotEmpty() venue: string;
  @IsOptional() @IsString() venueMapUrl?: string;
  @IsOptional() @Type(() => Number) @IsNumber() expectedCount?: number;
  @IsOptional() @IsString() brandPrimary?: string;
  @IsOptional() @IsString() brandSecondary?: string;
}

class UpdateEventDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsString() venueMapUrl?: string;
  @IsOptional() @Type(() => Number) @IsNumber() expectedCount?: number;
  @IsOptional() @IsString() brandPrimary?: string;
  @IsOptional() @IsString() brandSecondary?: string;
}

@Controller('events')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANISER')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() user: CurrentUserData,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(user.organiserId!, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.eventsService.findAll(user.organiserId!);
  }

  @Get(':eventId')
  async findOne(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.eventsService.findOne(eventId, user.organiserId!);
  }

  @Patch(':eventId')
  async update(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(eventId, user.organiserId!, dto);
  }

  @Post(':eventId/publish')
  @HttpCode(HttpStatus.OK)
  async publish(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.eventsService.publish(eventId, user.organiserId!);
  }

  @Delete(':eventId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.eventsService.remove(eventId, user.organiserId!);
  }

  @Get(':eventId/stats')
  async getStats(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.eventsService.getStats(eventId, user.organiserId!);
  }
}
