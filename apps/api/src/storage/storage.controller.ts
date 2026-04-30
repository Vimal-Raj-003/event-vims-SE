import {
  Controller,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
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
  'organiser-photo',
] as const;

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const UPLOADS_DIR = join(process.cwd(), 'uploads');

class PresignDto {
  @IsString()
  @IsIn(UPLOAD_CONTEXTS)
  context: (typeof UPLOAD_CONTEXTS)[number];

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

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
          cb(null, UPLOADS_DIR);
        },
        filename: (req, file, cb) => {
          const ext = extname(file.originalname).toLowerCase() || '.jpg';
          cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only JPEG, PNG and WebP images are allowed'), false);
        }
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('context') context?: string,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (context && !UPLOAD_CONTEXTS.includes(context as (typeof UPLOAD_CONTEXTS)[number])) {
      throw new BadRequestException(`Invalid context. Allowed: ${UPLOAD_CONTEXTS.join(', ')}`);
    }
    const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:4000';
    const url = `${backendUrl}/uploads/${file.filename}`;
    return { url, filename: file.filename, size: file.size, mimetype: file.mimetype };
  }
}
