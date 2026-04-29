import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule } from 'nestjs-cls';

import { AppConfigModule } from './config/config.module';
import { configuration } from './config/config.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { AttendeesModule } from './attendees/attendees.module';
import { DirectoryModule } from './directory/directory.module';
import { ConnectionsModule } from './connections/connections.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { ExportModule } from './export/export.module';
import { AdminModule } from './admin/admin.module';
import { ComplianceModule } from './compliance/compliance.module';
import { NotificationsModule } from './notifications/notifications.module';
import { StorageModule } from './storage/storage.module';
import { QrModule } from './qr/qr.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      cache: true,
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport:
          process.env.NODE_ENV !== 'production'
            ? { target: 'pino-pretty', options: { colorize: true } }
            : undefined,
        level: process.env.LOG_LEVEL || 'info',
        serializers: {
          req: (req: any) => ({
            id: req.id,
            method: req.method,
            url: req.url,
          }),
        },
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          censor: '[REDACTED]',
        },
      },
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true },
    }),
    AppConfigModule,
    PrismaModule,
    AuthModule,
    EventsModule,
    AttendeesModule,
    DirectoryModule,
    ConnectionsModule,
    AnnouncementsModule,
    ExportModule,
    AdminModule,
    ComplianceModule,
    NotificationsModule,
    StorageModule,
    QrModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
