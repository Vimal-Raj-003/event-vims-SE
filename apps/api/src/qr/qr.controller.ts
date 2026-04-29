import {
  Controller,
  Get,
  Param,
  NotFoundException,
  Res,
  SetMetadata,
} from '@nestjs/common';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EventStatus } from '@prisma/client';
import * as QRCode from 'qrcode';

@Controller('qr')
export class QrController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  // ──────────────────────────────────────────────
  // Resolve QR short hash → event data + join URL
  // ──────────────────────────────────────────────

  @Get(':shortHash')
  @SetMetadata('isPublic', true)
  async resolveQr(@Param('shortHash') shortHash: string) {
    const event = await this.prisma.event.findUnique({
      where: { shortHash },
      select: {
        id: true,
        name: true,
        slug: true,
        shortHash: true,
        description: true,
        venue: true,
        startAt: true,
        endAt: true,
        status: true,
        brandLogoUrl: true,
        brandPrimary: true,
        brandSecondary: true,
        bannerUrl: true,
      },
    });

    if (!event) {
      throw new NotFoundException('QR code is invalid or has expired');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('This event is not currently accepting registrations');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const registrationUrl = `${frontendUrl}/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`;

    return {
      event: {
        id: event.id,
        name: event.name,
        slug: event.slug,
        description: event.description,
        venue: event.venue,
        startAt: event.startAt,
        endAt: event.endAt,
        brandLogoUrl: event.brandLogoUrl,
        brandPrimary: event.brandPrimary,
        brandSecondary: event.brandSecondary,
        bannerUrl: event.bannerUrl,
      },
      registrationUrl,
    };
  }

  // ──────────────────────────────────────────────
  // Serve QR code as PNG image
  // ──────────────────────────────────────────────

  @Get(':shortHash/image')
  @SetMetadata('isPublic', true)
  async getQrImage(
    @Param('shortHash') shortHash: string,
    @Res() res: Response,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { shortHash },
      select: { id: true, name: true, status: true, qrUrl: true },
    });

    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new NotFoundException('Event not found or not published');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const joinUrl = `${frontendUrl}/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`;

    const buffer = await QRCode.toBuffer(joinUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#1e1b4b', light: '#ffffff' },
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  }
}
