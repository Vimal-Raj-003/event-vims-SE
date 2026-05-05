import { Controller, Get, Header } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlatformSettingsService } from '../admin/platform-settings.service';
import { PublicSettingsResponseDto } from '../admin/dto/public-settings-response.dto';

@ApiTags('Public')
@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  @ApiOperation({
    summary:
      'Public platform settings — narrow shape (platformName, supportEmail, selfSignupEnabled). No auth required.',
  })
  async get(): Promise<PublicSettingsResponseDto> {
    return this.settings.getPublic();
  }
}
