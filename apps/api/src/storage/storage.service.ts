import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const ALLOWED_CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

type UploadContext = 'event-logo' | 'event-banner' | 'event-qr' | 'attendee-photo' | 'attendee-company-logo';

const CONTEXT_SIZE_LIMITS: Record<UploadContext, number> = {
  'event-logo': 2 * 1024 * 1024,
  'event-banner': MAX_FILE_SIZE_BYTES,
  'event-qr': MAX_FILE_SIZE_BYTES,
  'attendee-photo': 2 * 1024 * 1024,
  'attendee-company-logo': 2 * 1024 * 1024,
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {}

  async generatePresignedUrl(dto: {
    context: UploadContext;
    entityId: string;
    contentType: string;
    fileSize: number;
  }) {
    if (!ALLOWED_CONTENT_TYPES.includes(dto.contentType)) {
      throw new BadRequestException(
        `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      );
    }

    const sizeLimit = CONTEXT_SIZE_LIMITS[dto.context];
    if (dto.fileSize > sizeLimit) {
      throw new BadRequestException(
        `File too large. Maximum size for ${dto.context}: ${sizeLimit / (1024 * 1024)} MB`,
      );
    }

    const extension = this.contentTypeToExtension(dto.contentType);
    const objectKey = this.buildObjectKey(dto.context, dto.entityId, extension);
    const publicUrl = `${this.configService.get<string>('R2_PUBLIC_URL', 'https://storage.vims-events.com')}/${objectKey}`;

    // Build a mock presigned URL in dev mode, real one in production
    // In production you would use AWS S3 SDK or Cloudflare R2 SDK
    const uploadUrl = this.buildPresignedUrl(objectKey, dto.contentType);

    this.logger.log(`Presigned URL generated: ${objectKey}`);

    return {
      uploadUrl,
      objectKey,
      publicUrl,
      expiresIn: 300, // 5 minutes
    };
  }

  private buildObjectKey(context: UploadContext, entityId: string, ext: string): string {
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(4).toString('hex');
    const contextPathMap: Record<UploadContext, string> = {
      'event-logo': `events/${entityId}/logo`,
      'event-banner': `events/${entityId}/banner`,
      'event-qr': `events/${entityId}/qr`,
      'attendee-photo': `attendees/${entityId}/photo`,
      'attendee-company-logo': `attendees/${entityId}/company-logo`,
    };
    return `${contextPathMap[context]}/${timestamp}-${randomSuffix}.${ext}`;
  }

  private buildPresignedUrl(objectKey: string, contentType: string): string {
    const bucketName = this.configService.get<string>('R2_BUCKET_NAME', 'vims-events-media');
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID', '');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID', 'dev-key');

    if (!accountId || this.configService.get('NODE_ENV') === 'development') {
      // Return a mock URL for development
      return `https://dev-storage.example.com/${bucketName}/${objectKey}?X-Mock=true&content-type=${encodeURIComponent(contentType)}`;
    }

    // Production: Cloudflare R2 uses S3-compatible presigned URLs
    const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
    const expires = Math.floor(Date.now() / 1000) + 300;
    return `${endpoint}/${bucketName}/${objectKey}?X-Amz-Expires=${expires}&X-Amz-Key=${accessKeyId}`;
  }

  private contentTypeToExtension(contentType: string): string {
    const map: Record<string, string> = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/webp': 'webp',
    };
    return map[contentType] ?? 'bin';
  }
}
