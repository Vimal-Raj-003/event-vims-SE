import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsNotEmpty, IsNumber, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

const UPLOAD_CONTEXTS = [
  'event-logo',
  'event-banner',
  'event-qr',
  'attendee-photo',
  'attendee-company-logo',
] as const;

class PresignDto {
  @IsString()
  @IsIn(UPLOAD_CONTEXTS)
  context: typeof UPLOAD_CONTEXTS[number];

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsNumber()
  @Type(() => Number)
  @Min(1)
  @Max(5 * 1024 * 1024)
  fileSize: number;
}

@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('presign')
  presign(@Body() dto: PresignDto) {
    return this.storageService.generatePresignedUrl(dto);
  }
}
