import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  SerializeOptions,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { OtpRateLimitGuard } from './guards/otp-rate-limit.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { CurrentUserData } from './decorators/current-user.decorator';

class OrganiserSignupDto {
  email: string;
  password: string;
  name: string;
  organisation: string;
  mobile: string;
}

class OrganiserLoginDto {
  email: string;
  password: string;
}

class VerifyEmailDto {
  token: string;
}

class RequestOtpDto {
  email: string;
  eventId: string;
}

class VerifyOtpDto {
  email: string;
  eventId: string;
  otp: string;
}

class RefreshTokenDto {
  refreshToken: string;
}

@Controller('auth')
@SerializeOptions({ groups: ['public'] })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ──────────────────────────────────────────────
  // Organiser Endpoints
  // ──────────────────────────────────────────────

  @Post('organiser/signup')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.CREATED)
  async organiserSignup(@Body() dto: OrganiserSignupDto) {
    return this.authService.organiserSignup(dto);
  }

  @Post('organiser/verify')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async verifyOrganiser(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyOrganiser(dto.token);
  }

  @Post('organiser/login')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async organiserLogin(@Body() dto: OrganiserLoginDto) {
    return this.authService.organiserLogin(dto);
  }

  // ──────────────────────────────────────────────
  // Attendee Endpoints
  // ──────────────────────────────────────────────

  @Post('attendee/request-otp')
  @UseGuards(OtpRateLimitGuard)
  @HttpCode(HttpStatus.OK)
  async requestOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestOtp(dto);
  }

  @Post('attendee/verify-otp')
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // ──────────────────────────────────────────────
  // Token Endpoints
  // ──────────────────────────────────────────────

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUser() user: CurrentUserData) {
    return this.authService.logout(user.sub, user.role);
  }
}
