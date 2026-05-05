import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import request from 'supertest';

import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PlatformSettingsService } from './platform-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const TEST_JWT_SECRET = 'test-secret-platform-settings';

describe('AdminController platform settings endpoints', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let platformSettings: jest.Mocked<PlatformSettingsService>;
  let prisma: { platformSettings: any; auditLog: any; organiser: any };

  const baseSettings = {
    id: 'platform',
    platformName: 'VIMS Events',
    supportEmail: 'support@example.com',
    dataRetentionMonths: 12,
    allowOrganiserSelfSignup: true,
    cardToCardQrConnections: false,
    crossEventNetworks: false,
    multiLanguageSupport: false,
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    updatedBy: null,
  };

  const signAccess = (claims: Record<string, unknown>) =>
    jwt.sign({ type: 'access', email: 'x@y.com', ...claims });

  beforeAll(async () => {
    prisma = {
      platformSettings: { findUniqueOrThrow: jest.fn(), update: jest.fn() },
      auditLog: { create: jest.fn(), findFirst: jest.fn() },
      organiser: { findUnique: jest.fn().mockResolvedValue({ status: 'ACTIVE' }) },
    };

    const platformSettingsMock = {
      get: jest.fn(),
      update: jest.fn(),
    };

    const adminServiceMock: Partial<AdminService> = {};

    const configServiceMock = {
      get: (key: string) => (key === 'JWT_SECRET' ? TEST_JWT_SECRET : undefined),
    };

    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt', session: false }),
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { algorithm: 'HS256', expiresIn: '15m' },
        }),
      ],
      controllers: [AdminController],
      providers: [
        Reflector,
        JwtAuthGuard,
        RolesGuard,
        JwtStrategy,
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AdminService, useValue: adminServiceMock },
        { provide: PlatformSettingsService, useValue: platformSettingsMock },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        errorHttpStatusCode: 422,
      }),
    );
    await app.init();

    jwt = app.get(JwtService);
    platformSettings = moduleRef.get(PlatformSettingsService) as jest.Mocked<PlatformSettingsService>;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.organiser.findUnique.mockResolvedValue({ status: 'ACTIVE' });
  });

  describe('GET /admin/settings', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer()).get('/admin/settings').expect(401);
    });

    it('returns 403 for non-super-admin', async () => {
      const token = signAccess({ sub: 'org-1', role: 'ORGANISER' });
      await request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
    });

    it('returns settings for super admin', async () => {
      platformSettings.get.mockResolvedValue(baseSettings as any);
      const token = signAccess({ sub: 'admin-1', role: 'SUPER_ADMIN', isSuperAdmin: true });

      const res = await request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toMatchObject({
        id: 'platform',
        platformName: 'VIMS Events',
        supportEmail: 'support@example.com',
        allowOrganiserSelfSignup: true,
      });
      expect(platformSettings.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /admin/settings', () => {
    it('updates platformName and calls service with actor sub', async () => {
      platformSettings.update.mockResolvedValue({
        ...baseSettings,
        platformName: 'Updated Platform',
      } as any);
      const token = signAccess({ sub: 'admin-1', role: 'SUPER_ADMIN', isSuperAdmin: true });

      const res = await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ platformName: 'Updated Platform' })
        .expect(200);

      expect(res.body.platformName).toBe('Updated Platform');
      expect(platformSettings.update).toHaveBeenCalledWith(
        { platformName: 'Updated Platform' },
        'admin-1',
      );
    });

    it('rejects setting cardToCardQrConnections=true with 422', async () => {
      const token = signAccess({ sub: 'admin-1', role: 'SUPER_ADMIN', isSuperAdmin: true });

      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ cardToCardQrConnections: true })
        .expect(422);

      expect(platformSettings.update).not.toHaveBeenCalled();
    });

    it('returns 401 without auth', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .send({ platformName: 'X' })
        .expect(401);
    });

    it('returns 403 for non-super-admin', async () => {
      const token = signAccess({ sub: 'org-1', role: 'ORGANISER' });
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${token}`)
        .send({ platformName: 'X' })
        .expect(403);
    });
  });
});
