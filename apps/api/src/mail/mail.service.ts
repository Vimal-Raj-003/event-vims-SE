import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PlatformSettingsService } from '../admin/platform-settings.service';

const FALLBACK_PLATFORM_NAME = 'VIMS Events';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private readonly configService: ConfigService,
    private readonly platformSettings: PlatformSettingsService,
  ) {
    const secure = this.configService.get<string>('MAIL_USE_SSL', 'false') === 'true';
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_SERVER', 'smtppro.zoho.in'),
      port: Number(this.configService.get<string>('MAIL_PORT', '587')),
      secure, // true = implicit TLS (465); false = STARTTLS upgrade (587)
      requireTLS: !secure,
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
      // Fail fast instead of hanging the OTP request for ~12s on socket close.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  /**
   * Read the platform name from live PlatformSettings, falling back to
   * "VIMS Events" on failure with a warn log. Used by the From header and
   * the body templates where a fallback brand is preferable to a missing
   * brand. NOT used by formatSubject — that helper deliberately falls
   * back to the raw subject (no prefix) on settings failure so we don't
   * stamp "[VIMS Events]" onto emails when the actual brand may be
   * something else.
   */
  private async getPlatformNameOrFallback(): Promise<string> {
    try {
      const settings = await this.platformSettings.get();
      return settings.platformName;
    } catch {
      this.logger.warn(
        'Failed to read platform settings; using fallback platform name',
      );
      return FALLBACK_PLATFORM_NAME;
    }
  }

  /**
   * Build the From header from live PlatformSettings.
   * Falls back to "VIMS Events" via getPlatformNameOrFallback if the
   * settings read fails — emails must never fail because of a settings read.
   */
  async buildFromHeader(): Promise<string> {
    const fromAddress = this.configService.get<string>('MAIL_USERNAME');
    const name = await this.getPlatformNameOrFallback();
    return `"${name}" <${fromAddress}>`;
  }

  /**
   * Prefix non-OTP subjects with [platformName]. OTP subjects are left
   * unchanged so the short code stays visible in mobile previews.
   * Falls back to the raw subject (no prefix) if the settings read fails,
   * so we don't risk mis-branding outgoing email under uncertainty.
   */
  async formatSubject(rawSubject: string, isOtp: boolean): Promise<string> {
    if (isOtp) return rawSubject;
    try {
      const settings = await this.platformSettings.get();
      return `[${settings.platformName}] ${rawSubject}`;
    } catch {
      this.logger.warn(
        'Failed to read platform settings for subject prefix; using raw subject',
      );
      return rawSubject;
    }
  }

  async sendOtpEmail(to: string, otp: string, eventName: string): Promise<void> {
    const platformName = await this.getPlatformNameOrFallback();
    try {
      await this.transporter.sendMail({
        from: await this.buildFromHeader(),
        to,
        subject: await this.formatSubject(
          `Your login code for ${this.escapeHtml(eventName)}`,
          true,
        ),
        html: this.otpTemplate(otp, eventName, platformName),
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}: ${(error as Error).message}`);
      // Rethrow so callers (OTP request flow) can surface a real failure to the user
      // instead of returning a misleading 200 success.
      throw error;
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const verifyUrl = `${frontendUrl}/auth/organiser/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(to)}`;
    const platformName = await this.getPlatformNameOrFallback();
    try {
      await this.transporter.sendMail({
        from: await this.buildFromHeader(),
        to,
        subject: await this.formatSubject('Verify your email', false),
        html: this.verificationTemplate(verifyUrl, platformName),
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}: ${(error as Error).message}`);
      throw error;
    }
  }

  async sendInviteEmail(
    to: string,
    firstName: string,
    eventName: string,
    loginLink: string,
  ): Promise<void> {
    const safeName = this.escapeHtml(firstName);
    const safeEvent = this.escapeHtml(eventName);
    const html = `
      <p>Hi ${safeName},</p>
      <p>You've been invited to <b>${safeEvent}</b>. Open your digital business card and start connecting with attendees:</p>
      <p>
        <a href="${loginLink}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;border-radius:8px;text-decoration:none;font-weight:600;">
          Open your business card →
        </a>
      </p>
      <p>If the button doesn't work, paste this link into your browser:<br>
      <span style="color:#64748b;">${loginLink}</span></p>
      <p style="color:#64748b;font-size:12px;">— The ${safeEvent} organising team</p>
    `;
    try {
      await this.transporter.sendMail({
        from: await this.buildFromHeader(),
        to,
        subject: await this.formatSubject(
          `You're invited to ${eventName}`,
          false,
        ),
        html,
      });
      this.logger.log(`Invite email sent to ${to} for ${eventName}`);
    } catch (error) {
      this.logger.error(
        `Failed to send invite email to ${to}: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  async sendWelcomeEmail(to: string, name: string, eventName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: await this.buildFromHeader(),
        to,
        subject: await this.formatSubject(
          `Welcome to ${this.escapeHtml(eventName)}!`,
          false,
        ),
        html: this.welcomeTemplate(name, eventName),
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}: ${(error as Error).message}`);
      throw error;
    }
  }

  // Escape HTML special chars before interpolating user-controlled values into templates.
  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private otpTemplate(otp: string, eventName: string, platformName: string): string {
    const safeEvent = this.escapeHtml(eventName);
    const safeOtp = this.escapeHtml(otp);
    const safePlatform = this.escapeHtml(platformName);
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0;">${safePlatform}</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Your event networking platform</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 16px 0;">
            Use this code to join <strong>${safeEvent}</strong>:
          </p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1; margin: 16px 0;">
            ${safeOtp}
          </div>
          <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0 0;">
            This code expires in 5 minutes. If you didn't request this, ignore this email.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
          Tip: Check your spam/junk folder if you don't see the email in your inbox.
        </p>
      </div>`;
  }

  private verificationTemplate(verifyUrl: string, platformName: string): string {
    const safePlatform = this.escapeHtml(platformName);
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0;">${safePlatform}</h2>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 20px 0;">
            Click the button below to verify your email address and activate your organiser account.
          </p>
          <a href="${verifyUrl}" style="display: inline-block; background: #6366f1; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Verify Email
          </a>
          <p style="color: #94a3b8; font-size: 13px; margin: 16px 0 0 0;">
            This link expires in 24 hours.
          </p>
        </div>
        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
          Tip: Check your spam/junk folder if you don't see the email in your inbox.
        </p>
      </div>`;
  }

  private welcomeTemplate(name: string, eventName: string): string {
    const safeName = this.escapeHtml(name);
    const safeEvent = this.escapeHtml(eventName);
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0;">Welcome to ${safeEvent}!</h2>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">
            Hi ${safeName},
          </p>
          <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">
            You're all set! Start networking with other attendees at <strong>${safeEvent}</strong>.
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 12px 0 0 0;">
            Complete your profile to get better networking suggestions and connect with the right people.
          </p>
        </div>
      </div>`;
  }
}
