import {
  Injectable,
  ExecutionContext,
  HttpException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { ThrottlerGuard, ThrottlerLimitDetail } from '@nestjs/throttler';

@Injectable()
export class OtpRateLimitGuard extends ThrottlerGuard {
  // Key by hashed identifier (email/phone) so an attacker can't enumerate a
  // single user's OTP from many IPs. Falls back to IP only if the body is empty.
  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const body = (req as { body?: { email?: string; phone?: string } }).body;
    const identifier = body?.email?.toLowerCase().trim() || body?.phone?.trim();
    if (identifier) {
      return crypto.createHash('sha256').update(identifier).digest('hex');
    }
    const reqWithIp = req as { ip?: string; ips?: string[] };
    return reqWithIp.ips?.[0] || reqWithIp.ip || 'unknown';
  }

  protected async getThrottlerLimit(
    context: ExecutionContext,
    _limit: number,
    _ttl: number,
  ): Promise<number> {
    const handler = context.getHandler();
    const reflectorLimit = this.reflector.get<number>('otpRateLimit', handler);
    return reflectorLimit ?? 5;
  }

  protected async getThrottlerTtl(
    _context: ExecutionContext,
    _ttl: number,
  ): Promise<number> {
    return 60000;
  }

  protected async throwThrottlingException(
    context: ExecutionContext,
    _throttlerLimitDetail: ThrottlerLimitDetail,
  ): Promise<void> {
    const request = context.switchToHttp().getRequest<{ body: { email?: string; phone?: string } }>();
    const identifier = request.body?.email || request.body?.phone || 'this account';

    throw new HttpException(
      `Too many OTP requests for ${identifier}. Please wait before requesting another code.`,
      429,
    );
  }
}
