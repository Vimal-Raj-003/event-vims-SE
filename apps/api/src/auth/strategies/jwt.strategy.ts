import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  organiserId?: string;
  eventId?: string;
  isSuperAdmin?: boolean;
  type: 'access' | 'refresh';
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET')!,
      algorithms: ['HS256'],
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type. Expected access token.');
    }

    if (!payload.sub || !payload.email || !payload.role) {
      throw new UnauthorizedException('Invalid token payload.');
    }

    // Check suspended organiser accounts on every request
    if (payload.role.toLowerCase() === 'organiser') {
      const organiser = await this.prisma.organiser.findUnique({
        where: { id: payload.sub },
        select: { status: true },
      });
      if (!organiser || organiser.status === 'SUSPENDED') {
        throw new UnauthorizedException('Account is suspended or not found.');
      }
    }

    return payload;
  }
}
