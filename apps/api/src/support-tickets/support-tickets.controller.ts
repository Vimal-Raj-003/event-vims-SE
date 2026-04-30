import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsEnum, MaxLength } from 'class-validator';
import { TicketCategory } from '@prisma/client';
import { SupportTicketsService } from './support-tickets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

class CreateTicketDto {
  @IsString() @IsNotEmpty() subject: string;
  @IsString() @IsNotEmpty() @MaxLength(1000) description: string;
  @IsEnum(TicketCategory) category: TicketCategory;
}

@Controller('support-tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANISER')
export class SupportTicketsController {
  constructor(private readonly service: SupportTicketsService) {}

  @Post()
  async create(
    @Body() dto: CreateTicketDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.create(user.sub, dto);
  }

  @Get()
  async listMine(
    @CurrentUser() user: CurrentUserData,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('pageSize', new ParseIntPipe({ optional: true })) pageSize = 20,
  ) {
    return this.service.listByOrganiser(user.sub, page, pageSize);
  }

  @Get(':id')
  async getOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.service.findOneByOrganiser(id, user.sub);
  }
}
