import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_SERVER', 'smtppro.zoho.in'),
      port: Number(this.configService.get<string>('MAIL_PORT', '465')),
      secure: this.configService.get<string>('MAIL_USE_SSL', 'true') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USERNAME'),
        pass: this.configService.get<string>('MAIL_PASSWORD'),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string, eventName: string): Promise<void> {
    const fromAddress = this.configService.get<string>('MAIL_USERNAME');
    try {
      await this.transporter.sendMail({
        from: `"VIMS Events" <${fromAddress}>`,
        to,
        subject: `Your login code for ${eventName}`,
        html: this.otpTemplate(otp, eventName),
      });
      this.logger.log(`OTP email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}: ${error.message}`);
    }
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const fromAddress = this.configService.get<string>('MAIL_USERNAME');
    const frontendUrl = this.configService.get<string>('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    const verifyUrl = `${frontendUrl}/auth/organiser/verify?token=${token}`;
    try {
      await this.transporter.sendMail({
        from: `"VIMS Events" <${fromAddress}>`,
        to,
        subject: 'Verify your email — VIMS Events',
        html: this.verificationTemplate(verifyUrl),
      });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}: ${error.message}`);
    }
  }

  async sendWelcomeEmail(to: string, name: string, eventName: string): Promise<void> {
    const fromAddress = this.configService.get<string>('MAIL_USERNAME');
    try {
      await this.transporter.sendMail({
        from: `"VIMS Events" <${fromAddress}>`,
        to,
        subject: `Welcome to ${eventName}!`,
        html: this.welcomeTemplate(name, eventName),
      });
      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}: ${error.message}`);
    }
  }

  private otpTemplate(otp: string, eventName: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0;">VIMS Events</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Your event networking platform</p>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 16px 0;">
            Use this code to join <strong>${eventName}</strong>:
          </p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #6366f1; margin: 16px 0;">
            ${otp}
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

  private verificationTemplate(verifyUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0;">VIMS Events</h2>
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
    return `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #6366f1; margin: 0;">Welcome to ${eventName}!</h2>
        </div>
        <div style="background: #f8fafc; border-radius: 12px; padding: 24px;">
          <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">
            Hi ${name},
          </p>
          <p style="color: #334155; font-size: 15px; margin: 0 0 12px 0;">
            You're all set! Start networking with other attendees at <strong>${eventName}</strong>.
          </p>
          <p style="color: #64748b; font-size: 14px; margin: 12px 0 0 0;">
            Complete your profile to get better networking suggestions and connect with the right people.
          </p>
        </div>
      </div>`;
  }
}
