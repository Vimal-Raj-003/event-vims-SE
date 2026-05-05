import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformSettingsCache } from './platform-settings.cache';

@Module({
  controllers: [AdminController],
  providers: [
    AdminService,
    PlatformSettingsService,
    {
      provide: PlatformSettingsCache,
      useFactory: () => new PlatformSettingsCache(60_000),
    },
  ],
  exports: [AdminService, PlatformSettingsService],
})
export class AdminModule {}
