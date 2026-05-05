// Stub env BEFORE importing AppModule — ConfigModule's loader validates
// process.env at module-init time and would otherwise throw.
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';
process.env.DATABASE_URL_DIRECT ??= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_SECRET ??= 'test-secret-public-settings-must-be-long-enough-32';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-public-settings-long-enough-32';

import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsCache } from '../admin/platform-settings.cache';

describe('Public Settings (e2e)', () => {
  let app: INestApplication;
  let prisma: { platformSettings: { findUniqueOrThrow: jest.Mock } };

  const baseSettings = {
    id: 'platform',
    platformName: 'Test Platform',
    supportEmail: 'support@test.com',
    dataRetentionMonths: 12,
    allowOrganiserSelfSignup: true,
    cardToCardQrConnections: false,
    crossEventNetworks: false,
    multiLanguageSupport: false,
    updatedAt: new Date(),
    updatedBy: null,
  };

  beforeAll(async () => {
    prisma = {
      platformSettings: { findUniqueOrThrow: jest.fn() },
    };

    // Use a 0-TTL cache so each test sees a fresh Prisma read.
    const noopCache = new PlatformSettingsCache(0);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(PlatformSettingsCache)
      .useValue(noopCache)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        errorHttpStatusCode: 422,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  beforeEach(() => {
    prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(baseSettings);
  });

  it('returns the narrow public shape without auth', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/settings')
      .expect(200);

    expect(res.body).toEqual({
      platformName: 'Test Platform',
      supportEmail: 'support@test.com',
      selfSignupEnabled: true,
    });

    // confirm internal fields NOT leaked
    expect(res.body).not.toHaveProperty('cardToCardQrConnections');
    expect(res.body).not.toHaveProperty('dataRetentionMonths');
    expect(res.body).not.toHaveProperty('updatedBy');
    expect(res.body).not.toHaveProperty('id');
  });

  it('sets Cache-Control: public, max-age=60', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/public/settings')
      .expect(200);

    expect(res.headers['cache-control']).toMatch(/public/);
    expect(res.headers['cache-control']).toMatch(/max-age=60/);
  });

  it('reflects allowOrganiserSelfSignup=false as selfSignupEnabled=false', async () => {
    prisma.platformSettings.findUniqueOrThrow.mockResolvedValue({
      ...baseSettings,
      allowOrganiserSelfSignup: false,
    });

    const res = await request(app.getHttpServer())
      .get('/api/v1/public/settings')
      .expect(200);

    expect(res.body.selfSignupEnabled).toBe(false);
  });
});
