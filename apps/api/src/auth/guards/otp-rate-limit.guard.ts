import {
  Injectable,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';
import { Reflector } from '@nestjs/core';

@Injectable()
export class OtpRateLimitGuard extends ThrottlerGuard {
  protected async getThrottlerLimit(
    context: ExecutionContext,
    _limit: number,
    _ttl: number,
  ): Promise<number> {
    const request = context.switchToHttp().getRequest<{ body: { email?: string; phone?: string } }>();
    const identifier = request.body?.email || request.body?.phone || 'unknown';

    const handler = context.getHandler();
    const reflectorLimit = this.reflector.get<number>('otpRateLimit', handler);

    return reflectorLimit ?? 5;
  }

  protected async getThrottlerTtl(
    context: ExecutionContext,
    _ttl: number,
  ): Promise<number> {
    return 60000;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<{ body: { email?: string; phone?: string } }>();
    const identifier = request.body?.email || request.body?.phone || 'unknown';

    throw new HttpException(
      `Too many OTP requests for ${identifier}. Please wait before requesting another code.`,
      429,
    );
  }
}
