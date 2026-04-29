import { Module } from '@nestjs/common';
import { QrController } from './qr.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [QrController],
})
export class QrModule {}
