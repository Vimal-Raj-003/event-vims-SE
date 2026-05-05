import { Test } from '@nestjs/testing';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformSettingsCache } from './platform-settings.cache';
import { PrismaService } from '../prisma/prisma.service';

describe('PlatformSettingsService', () => {
  let service: PlatformSettingsService;
  let prisma: { platformSettings: any; auditLog: any };

  beforeEach(async () => {
    prisma = {
      platformSettings: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlatformSettingsService,
        PlatformSettingsCache,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(PlatformSettingsService);
  });

  describe('get()', () => {
    it('returns settings from DB on cache miss', async () => {
      const row = { id: 'platform', platformName: 'X', supportEmail: 'a@b.com' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(row);

      expect(await service.get()).toEqual(row);
      expect(prisma.platformSettings.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    });

    it('returns settings from cache on hit (no second DB call)', async () => {
      const row = { id: 'platform', platformName: 'X' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(row);

      await service.get();
      await service.get();

      expect(prisma.platformSettings.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPublic()', () => {
    it('returns narrowed shape for public consumption', async () => {
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue({
        platformName: 'X',
        supportEmail: 'a@b.com',
        allowOrganiserSelfSignup: true,
        dataRetentionMonths: 12,
        cardToCardQrConnections: false,
      });

      expect(await service.getPublic()).toEqual({
        platformName: 'X',
        supportEmail: 'a@b.com',
        selfSignupEnabled: true,
      });
    });
  });

  describe('update()', () => {
    it('updates only the provided fields, writes audit log, invalidates cache', async () => {
      const before = {
        id: 'platform',
        platformName: 'Old',
        supportEmail: 'old@b.com',
        dataRetentionMonths: 12,
        allowOrganiserSelfSignup: true,
      };
      const after = { ...before, platformName: 'New' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(before);
      prisma.platformSettings.update.mockResolvedValue(after);

      const result = await service.update({ platformName: 'New' }, 'admin-1');

      expect(result).toEqual(after);
      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'platform' },
        data: { platformName: 'New', updatedBy: 'admin-1' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'platform_settings.update',
          actorId: 'admin-1',
          actorRole: 'SUPER_ADMIN',
          entityType: 'PlatformSettings',
          entityId: 'platform',
          metadata: expect.objectContaining({
            changed: ['platformName'],
            before: { platformName: 'Old' },
            after: { platformName: 'New' },
          }),
        }),
      });
    });

    it('does nothing when no fields would change', async () => {
      const row = { id: 'platform', platformName: 'X' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(row);

      const result = await service.update({ platformName: 'X' }, 'admin-1');

      expect(prisma.platformSettings.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
      expect(result).toEqual(row);
    });
  });
});
