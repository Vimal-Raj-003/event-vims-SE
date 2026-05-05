import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PublicSettingsController } from './public-settings.controller';

@Module({
  imports: [AdminModule], // for PlatformSettingsService
  controllers: [PublicSettingsController],
})
export class PublicModule {}
