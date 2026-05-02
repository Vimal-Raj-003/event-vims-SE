import { Module } from '@nestjs/common';
import { SmartMatchingController } from './smart-matching.controller';
import { SmartMatchingService } from './smart-matching.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SmartMatchingController],
  providers: [SmartMatchingService],
  exports: [SmartMatchingService],
})
export class SmartMatchingModule {}
