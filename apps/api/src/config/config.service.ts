import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z, ZodError } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'staging', 'production', 'test'])
    .default('development'),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_URL_DIRECT: z.string().min(1, 'DATABASE_URL_DIRECT is required'),

  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Email — Zoho SMTP (via nodemailer). Legacy Resend kept optional for backward compat.
  MAIL_SERVER: z.string().optional(),
  MAIL_PORT: z.coerce.number().optional(),
  MAIL_USERNAME: z.string().optional(),
  MAIL_PASSWORD: z.string().optional(),
  MAIL_USE_SSL: z.coerce.boolean().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM_ADDRESS: z.string().email().default('noreply@vims.events'),
  EMAIL_FROM_NAME: z.string().default('VIMS Events'),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET_NAME: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email().optional(),

  CORS_ORIGIN: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  OTP_LENGTH: z.coerce.number().min(4).max(8).default(6),
  OTP_EXPIRY_SECONDS: z.coerce.number().min(60).default(300),

  BCRYPT_SALT_ROUNDS: z.coerce.number().min(10).max(14).default(12),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const configuration = () => {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const formatted = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs as string[]).join(', ')}`)
      .join('\n');
    throw new Error(`Environment validation failed:\n${formatted}`);
  }
  return result.data;
};

@Injectable()
export class AppConfigService {
  private readonly envConfig: EnvConfig;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    this.envConfig = configuration();
  }

  get nodeEnv(): string {
    return this.envConfig.NODE_ENV;
  }

  get port(): number {
    return this.envConfig.PORT;
  }

  get databaseUrl(): string {
    return this.envConfig.DATABASE_URL;
  }

  get databaseUrlDirect(): string {
    return this.envConfig.DATABASE_URL_DIRECT;
  }

  get jwtSecret(): string {
    return this.envConfig.JWT_SECRET;
  }

  get jwtRefreshSecret(): string {
    return this.envConfig.JWT_REFRESH_SECRET;
  }

  get jwtAccessExpiry(): string {
    return this.envConfig.JWT_ACCESS_EXPIRY;
  }

  get jwtRefreshExpiry(): string {
    return this.envConfig.JWT_REFRESH_EXPIRY;
  }

  get resendApiKey(): string {
    return this.envConfig.RESEND_API_KEY ?? '';
  }

  get emailFromAddress(): string {
    return this.envConfig.EMAIL_FROM_ADDRESS;
  }

  get emailFromName(): string {
    return this.envConfig.EMAIL_FROM_NAME;
  }

  get r2AccountId(): string {
    return this.envConfig.R2_ACCOUNT_ID ?? '';
  }

  get r2AccessKeyId(): string {
    return this.envConfig.R2_ACCESS_KEY_ID ?? '';
  }

  get r2SecretAccessKey(): string {
    return this.envConfig.R2_SECRET_ACCESS_KEY ?? '';
  }

  get r2BucketName(): string {
    return this.envConfig.R2_BUCKET_NAME ?? '';
  }

  get r2PublicUrl(): string {
    return this.envConfig.R2_PUBLIC_URL ?? '';
  }

  get vapidPublicKey(): string {
    return this.envConfig.VAPID_PUBLIC_KEY ?? '';
  }

  get vapidPrivateKey(): string {
    return this.envConfig.VAPID_PRIVATE_KEY ?? '';
  }

  get vapidSubject(): string {
    return this.envConfig.VAPID_SUBJECT ?? '';
  }

  get corsOrigin(): string {
    return this.envConfig.CORS_ORIGIN;
  }

  get logLevel(): string {
    return this.envConfig.LOG_LEVEL;
  }

  get otpLength(): number {
    return this.envConfig.OTP_LENGTH;
  }

  get otpExpirySeconds(): number {
    return this.envConfig.OTP_EXPIRY_SECONDS;
  }

  get bcryptSaltRounds(): number {
    return this.envConfig.BCRYPT_SALT_ROUNDS;
  }

  get isProduction(): boolean {
    return this.envConfig.NODE_ENV === 'production';
  }

  get isDevelopment(): boolean {
    return this.envConfig.NODE_ENV === 'development';
  }
}
