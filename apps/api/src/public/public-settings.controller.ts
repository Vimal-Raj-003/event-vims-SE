import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PlatformSettingsService } from '../admin/platform-settings.service';
import { PublicSettingsResponseDto } from '../admin/dto/public-settings-response.dto';

@ApiTags('Public')
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 10_000 } })
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({
    summary:
      'Public platform settings — narrow shape (platformName, supportEmail, selfSignupEnabled). No auth required.',
  })
  async get(): Promise<PublicSettingsResponseDto> {
    return this.settings.getPublic();
  }
}
