import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface JwtTokenPayload {
  sub: string;
  email: string;
  role: string;
  organiserId?: string;
  eventId?: string;
  isSuperAdmin?: boolean;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly cls: ClsService,
    private readonly mailService: MailService,
  ) {}

  // ──────────────────────────────────────────────
  // Organiser Authentication
  // ──────────────────────────────────────────────

  async organiserSignup(dto: {
    email: string;
    password: string;
    name: string;
    organisation: string;
    mobile: string;
  }) {
    const existing = await this.prisma.organiser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const saltRounds = this.configService.get<number>('BCRYPT_SALT_ROUNDS', 12);
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    const verificationToken = this.generateSecureToken();
    const verificationTokenHash = this.hashToken(verificationToken);
    const verificationExpires = new Date(
      Date.now() + 24 * 60 * 60 * 1000,
    );

    const organiser = await this.prisma.organiser.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        name: dto.name,
        organisation: dto.organisation,
        mobile: dto.mobile,
      },
    });

    await this.prisma.otpVerification.create({
      data: {
        email: organiser.email,
        otpHash: verificationTokenHash,
        purpose: 'email_verification',
        expiresAt: verificationExpires,
      },
    });

    this.logger.log(`Organiser signup initiated: ${organiser.email}`);

    await this.mailService.sendVerificationEmail(organiser.email, verificationToken);

    return {
      id: organiser.id,
      email: organiser.email,
      message: 'Verification email sent. Please check your inbox (and spam folder).',
      verificationToken:
        this.configService.get<string>('NODE_ENV') !== 'production'
          ? verificationToken
          : undefined,
    };
  }

  async resendOrganiserVerification(email: string) {
    const normalized = email.toLowerCase();
    const organiser = await this.prisma.organiser.findUnique({
      where: { email: normalized },
    });

    // Already verified — tell the user explicitly so they stop waiting
    // for an email that won't (and shouldn't) come.
    if (organiser?.emailVerifiedAt) {
      return {
        message: 'This email is already verified. Please log in.',
        alreadyVerified: true,
      };
    }

    // No account at all — generic response (the only place we still hide
    // existence; signup itself would 409 Conflict so we're not leaking new
    // information here).
    if (!organiser) {
      return {
        message:
          'If an account exists for this email, a new verification link has been sent.',
      };
    }

    // Account exists but is not verified. Generate a fresh token. We do NOT
    // invalidate prior tokens — the link in the user's existing inbox stays
    // valid until it expires, so they're not locked out if the new email
    // gets blocked or delayed.
    const verificationToken = this.generateSecureToken();
    const verificationTokenHash = this.hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newRecord = await this.prisma.otpVerification.create({
      data: {
        email: normalized,
        otpHash: verificationTokenHash,
        purpose: 'email_verification',
        expiresAt: verificationExpires,
      },
    });

    try {
      await this.mailService.sendVerificationEmail(normalized, verificationToken);
    } catch (error) {
      // SMTP failed — clean up the orphan token row so it doesn't sit
      // around as dead data, then surface the failure to the caller.
      await this.prisma.otpVerification.delete({ where: { id: newRecord.id } });
      throw error;
    }

    this.logger.log(`Verification email resent to: ${normalized}`);

    return {
      message: 'Verification email sent. Check your inbox (and spam folder).',
      verificationToken:
        this.configService.get<string>('NODE_ENV') !== 'production'
          ? verificationToken
          : undefined,
    };
  }

  async verifyOrganiser(token: string, email?: string) {
    const tokenHash = this.hashToken(token);

    // Look for ANY record with this hash (used or not). This makes the
    // endpoint idempotent under React StrictMode double-firing and double
    // clicks — finding a previously-used record is fine; we just check
    // whether the user is already verified below.
    const verificationRecord = await this.prisma.otpVerification.findFirst({
      where: {
        otpHash: tokenHash,
        purpose: 'email_verification',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!verificationRecord) {
      // Email-aware fallback: if the URL also carries the email and that
      // organiser is already verified, the link is just stale — guide them
      // to login instead of throwing a scary error.
      if (email) {
        const organiser = await this.prisma.organiser.findUnique({
          where: { email: email.toLowerCase() },
        });
        if (organiser?.emailVerifiedAt) {
          return {
            message: 'This email is already verified. Please log in.',
            alreadyVerified: true,
          };
        }
      }
      throw new BadRequestException(
        'Invalid verification token. Please request a new link.',
      );
    }

    const organiser = await this.prisma.organiser.findUnique({
      where: { email: verificationRecord.email },
    });

    // Idempotency: already verified → success, regardless of token usedAt.
    if (organiser?.emailVerifiedAt) {
      return {
        message: 'This email is already verified. Please log in.',
        alreadyVerified: true,
      };
    }

    if (verificationRecord.expiresAt < new Date()) {
      throw new BadRequestException(
        'Verification token has expired. Please request a new one.',
      );
    }

    await this.prisma.organiser.update({
      where: { email: verificationRecord.email },
      data: { emailVerifiedAt: new Date() },
    });

    if (!verificationRecord.usedAt) {
      await this.prisma.otpVerification.update({
        where: { id: verificationRecord.id },
        data: { usedAt: new Date() },
      });
    }

    this.logger.log(`Organiser verified: ${verificationRecord.email}`);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async superAdminLogin(dto: { email: string; password: string }) {
    const admin = await this.prisma.superAdmin.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!admin) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await bcrypt.compare(dto.password, admin.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokenPair({
      sub: admin.id,
      email: admin.email,
      role: 'super_admin',
      isSuperAdmin: true,
    });

    await this.storeRefreshToken(admin.id, 'super_admin', tokens.refreshToken);

    this.logger.log(`Super Admin logged in: ${admin.email}`);

    return {
      ...tokens,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: 'super_admin',
      },
    };
  }

  async organiserLogin(dto: { email: string; password: string }) {
    const organiser = await this.prisma.organiser.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!organiser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!organiser.emailVerifiedAt) {
      throw new UnauthorizedException(
        'Email not verified. Please verify your email first.',
      );
    }

    if (organiser.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account is suspended. Contact support.');
    }

    const passwordValid = await bcrypt.compare(dto.password, organiser.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokens = await this.generateTokenPair({
      sub: organiser.id,
      email: organiser.email,
      role: 'organiser',
      organiserId: organiser.id,
      isSuperAdmin: false,
    });

    await this.storeRefreshToken(organiser.id, 'organiser', tokens.refreshToken);

    this.logger.log(`Organiser logged in: ${organiser.email}`);

    return {
      ...tokens,
      user: {
        id: organiser.id,
        email: organiser.email,
        name: organiser.name,
        organisation: organiser.organisation,
        role: 'organiser',
      },
    };
  }

  // ──────────────────────────────────────────────
  // Attendee Authentication
  // ──────────────────────────────────────────────

  async requestOtp(dto: { email: string; eventId: string }) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });

    if (!event) {
      throw new BadRequestException('Event not found');
    }

    const otpLength = this.configService.get<number>('OTP_LENGTH', 6);
    const otpExpirySeconds = this.configService.get<number>('OTP_EXPIRY_SECONDS', 300);

    const otp = this.generateOtp(otpLength);
    const otpHash = this.hashToken(otp);
    const expiresAt = new Date(Date.now() + otpExpirySeconds * 1000);

    // Create or find attendee - attendees register through the event organiser
    let attendee = await this.prisma.attendee.findUnique({
      where: {
        eventId_email: {
          eventId: dto.eventId,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (!attendee) {
      // Create a minimal attendee for OTP-based auth
      attendee = await this.prisma.attendee.create({
        data: {
          email: dto.email.toLowerCase(),
          eventId: dto.eventId,
          firstName: '',
          lastName: '',
          phone: '',
          designation: '',
          company: '',
          businessType: '',
          industry: '',
          city: '',
        },
      });
    }

    await this.prisma.otpVerification.create({
      data: {
        email: dto.email.toLowerCase(),
        otpHash,
        purpose: `attendee_otp_${dto.eventId}`,
        expiresAt,
      },
    });

    this.logger.log(`OTP requested for: ${dto.email} (event: ${dto.eventId})`);

    const eventName = event.name ?? 'VIMS Event';
    await this.mailService.sendOtpEmail(dto.email, otp, eventName);

    return {
      message: 'OTP sent to your email address. Please check your inbox and spam folder.',
      otp:
        this.configService.get<string>('NODE_ENV') !== 'production'
          ? otp
          : undefined,
    };
  }

  async verifyOtp(dto: { email: string; eventId: string; otp: string }) {
    const attendee = await this.prisma.attendee.findUnique({
      where: {
        eventId_email: {
          eventId: dto.eventId,
          email: dto.email.toLowerCase(),
        },
      },
    });

    if (!attendee) {
      throw new UnauthorizedException('No account found for this email and event');
    }

    const latestOtp = await this.prisma.otpVerification.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        purpose: `attendee_otp_${dto.eventId}`,
        expiresAt: { gt: new Date() },
        usedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestOtp) {
      throw new UnauthorizedException('OTP has expired or no valid OTP found. Please request a new one.');
    }

    const otpHash = this.hashToken(dto.otp);
    if (otpHash !== latestOtp.otpHash) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    await this.prisma.otpVerification.update({
      where: { id: latestOtp.id },
      data: { usedAt: new Date() },
    });

    const tokens = await this.generateTokenPair({
      sub: attendee.id,
      email: attendee.email,
      role: 'attendee',
      eventId: dto.eventId,
      isSuperAdmin: false,
    });

    await this.storeRefreshToken(attendee.id, 'attendee', tokens.refreshToken);

    this.logger.log(`Attendee verified: ${attendee.email} (event: ${dto.eventId})`);

    return {
      ...tokens,
      user: {
        id: attendee.id,
        email: attendee.email,
        role: 'attendee',
        eventId: dto.eventId,
        profileCompleted: attendee.profileCompleted,
      },
    };
  }

  // ──────────────────────────────────────────────
  // Token Management
  // ──────────────────────────────────────────────

  async refreshToken(refreshToken: string) {
    let payload: JwtTokenPayload;

    try {
      payload = this.jwtService.verify<JwtTokenPayload>(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const isValid = await this.validateRefreshToken(payload.sub, refreshToken);

    if (!isValid) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    const tokens = await this.generateTokenPair({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      organiserId: payload.organiserId,
      eventId: payload.eventId,
      isSuperAdmin: payload.isSuperAdmin,
    });

    // Revoke the old refresh token and store the new one
    await this.revokeRefreshToken(refreshToken);
    await this.storeRefreshToken(payload.sub, payload.role, tokens.refreshToken);

    return tokens;
  }

  async logout(userId: string, role: string) {
    // Revoke all refresh tokens for this user
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        userRole: role,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    this.logger.log(`User logged out: ${userId} (${role})`);
    return { message: 'Logged out successfully' };
  }

  // ──────────────────────────────────────────────
  // Private Helpers
  // ──────────────────────────────────────────────

  private generateOtp(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return crypto.randomInt(min, max + 1).toString();
  }

  private generateSecureToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async generateTokenPair(payload: Omit<JwtTokenPayload, 'type'>): Promise<TokenPair> {
    const accessPayload: JwtTokenPayload = { ...payload, type: 'access' };
    const refreshPayload: JwtTokenPayload = { ...payload, type: 'refresh' };

    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRY', '15m') as any,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshExpiry as any,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, userRole: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRY', '7d');
    // Parse the expiry string (e.g., '7d') into seconds
    const expiresAt = this.parseExpiryToDate(refreshExpiry);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        userRole,
        tokenHash,
        expiresAt,
      },
    });
  }

  private async validateRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<boolean> {
    const tokenHash = this.hashToken(refreshToken);

    const record = await this.prisma.refreshToken.findFirst({
      where: {
        userId,
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    return !!record;
  }

  private async revokeRefreshToken(refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private parseExpiryToDate(expiry: string): Date {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      // Default to 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's': return new Date(Date.now() + value * 1000);
      case 'm': return new Date(Date.now() + value * 60 * 1000);
      case 'h': return new Date(Date.now() + value * 60 * 60 * 1000);
      case 'd': return new Date(Date.now() + value * 24 * 60 * 60 * 1000);
      default: return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}
