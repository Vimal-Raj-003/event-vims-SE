import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ClsService } from 'nestjs-cls';
import { ConfigService } from '@nestjs/config';

export interface TenantPayload {
  sub: string;
  email: string;
  role: string;
  organiserId?: string;
  eventId?: string;
  isSuperAdmin?: boolean;
  type: 'access' | 'refresh';
}

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantMiddleware.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly cls: ClsService,
    private readonly configService: ConfigService,
  ) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    const skipPaths = [
      '/api/v1/auth/organiser/signup',
      '/api/v1/auth/organiser/verify',
      '/api/v1/auth/organiser/login',
      '/api/v1/auth/attendee/request-otp',
      '/api/v1/auth/attendee/verify-otp',
      '/api/v1/health',
    ];

    if (!authHeader || skipPaths.some((p) => req.path.startsWith(p))) {
      this.cls.set('organiserId', null);
      this.cls.set('eventId', null);
      this.cls.set('isSuperAdmin', false);
      return next();
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      this.cls.set('organiserId', null);
      this.cls.set('eventId', null);
      this.cls.set('isSuperAdmin', false);
      return next();
    }

    try {
      const payload = this.jwtService.verify<TenantPayload>(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      if (payload.type !== 'access') {
        throw new UnauthorizedException('Invalid token type');
      }

      this.cls.set('organiserId', payload.organiserId ?? null);
      this.cls.set('eventId', payload.eventId ?? null);
      this.cls.set('isSuperAdmin', payload.isSuperAdmin ?? false);

      (req as Request & { user: TenantPayload }).user = payload;
    } catch (error) {
      this.cls.set('organiserId', null);
      this.cls.set('eventId', null);
      this.cls.set('isSuperAdmin', false);

      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.debug(`Token verification failed: ${(error as Error).message}`);
    }

    next();
  }
}
