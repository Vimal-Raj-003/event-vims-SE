import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { OrganiserService } from './organiser.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';

class UpdateProfileDto {
  @IsOptional() @IsString() @IsNotEmpty() name?: string;
  @IsOptional() @IsString() @IsNotEmpty() organisation?: string;
  @IsOptional() @IsString() @IsNotEmpty() mobile?: string;
}

class ChangePasswordDto {
  @IsString() @IsNotEmpty() currentPassword: string;
  @IsString() @MinLength(8) newPassword: string;
}

class UpdateSettingsDto {
  @IsOptional() @IsString() defaultBrandPrimary?: string;
  @IsOptional() @IsString() defaultBrandSecondary?: string;
  @IsOptional() @IsString() defaultMaxConnections?: string;
  @IsOptional() @IsBoolean() defaultShowAddress?: boolean;
  @IsOptional() @IsBoolean() defaultAllowVcard?: boolean;
  @IsOptional() @IsBoolean() notifyAttendeeRegister?: boolean;
  @IsOptional() @IsBoolean() notifyConnectionMilestone?: boolean;
  @IsOptional() @IsBoolean() notifyAnnouncementDelivery?: boolean;
}

@Controller('organiser')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANISER')
export class OrganiserController {
  constructor(private readonly service: OrganiserService) {}

  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserData) {
    return this.service.getProfile(user.sub);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(user.sub, dto);
  }

  @Patch('password')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  changePassword(@CurrentUser() user: CurrentUserData, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(user.sub, dto);
  }

  @Get('settings')
  getSettings(@CurrentUser() user: CurrentUserData) {
    return this.service.getSettings(user.sub);
  }

  @Patch('settings')
  updateSettings(@CurrentUser() user: CurrentUserData, @Body() dto: UpdateSettingsDto) {
    return this.service.updateSettings(user.sub, dto);
  }
}
