import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsCache } from './platform-settings.cache';
import type { PlatformSettings, Prisma } from '@prisma/client';
import type { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

const SINGLETON_ID = 'platform';
const CACHE_KEY = 'platform-settings';

export interface PublicPlatformSettings {
  platformName: string;
  supportEmail: string;
  selfSignupEnabled: boolean;
}

@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: PlatformSettingsCache<PlatformSettings>,
  ) {}

  async get(): Promise<PlatformSettings> {
    const cached = this.cache.get(CACHE_KEY);
    if (cached) return cached;

    const row = await this.prisma.platformSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });
    this.cache.set(CACHE_KEY, row);
    return row;
  }

  async getPublic(): Promise<PublicPlatformSettings> {
    const row = await this.get();
    return {
      platformName: row.platformName,
      supportEmail: row.supportEmail,
      selfSignupEnabled: row.allowOrganiserSelfSignup,
    };
  }

  async update(
    dto: UpdatePlatformSettingsDto,
    actorId: string,
  ): Promise<PlatformSettings> {
    const before = await this.prisma.platformSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });

    const changed: string[] = [];
    const beforeDelta: Record<string, Prisma.InputJsonValue> = {};
    const afterDelta: Record<string, Prisma.InputJsonValue> = {};

    for (const key of Object.keys(dto) as (keyof UpdatePlatformSettingsDto)[]) {
      const newValue = dto[key];
      if (newValue === undefined) continue;
      if ((before as any)[key] !== newValue) {
        changed.push(key);
        beforeDelta[key] = (before as any)[key] as Prisma.InputJsonValue;
        afterDelta[key] = newValue as Prisma.InputJsonValue;
      }
    }

    if (changed.length === 0) {
      return before;
    }

    const updated = await this.prisma.platformSettings.update({
      where: { id: SINGLETON_ID },
      data: { ...dto, updatedBy: actorId },
    });

    this.cache.invalidate(CACHE_KEY);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole: 'SUPER_ADMIN',
        action: 'platform_settings.update',
        entityType: 'PlatformSettings',
        entityId: SINGLETON_ID,
        metadata: { changed, before: beforeDelta, after: afterDelta },
      },
    });

    return updated;
  }
}
