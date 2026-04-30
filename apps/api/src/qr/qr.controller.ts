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

/* ─── QR generation helper ──────────────────────────────────────── */
async function buildQrBuffer(url: string, size: number): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    width: size,
    margin: 3,
    errorCorrectionLevel: 'H',
    color: { dark: '#1e1b4b', light: '#ffffff' },
  });
}

@Controller('qr')
export class QrController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  /* ── resolve shortHash → event data + join URL ─────────────────── */
  @Get(':shortHash')
  @SetMetadata('isPublic', true)
  async resolveQr(@Param('shortHash') shortHash: string) {
    const event = await this.prisma.event.findUnique({
      where: { shortHash },
      select: {
        id: true, name: true, slug: true, shortHash: true,
        description: true, venue: true, startAt: true, endAt: true,
        status: true, brandLogoUrl: true, brandPrimary: true,
        brandSecondary: true, bannerUrl: true,
      },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('QR code is invalid or has expired');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const registrationUrl = `${frontendUrl}/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`;

    return {
      event: {
        id: event.id, name: event.name, slug: event.slug,
        description: event.description, venue: event.venue,
        startAt: event.startAt, endAt: event.endAt,
        status: event.status,
        brandPrimary: event.brandPrimary, brandSecondary: event.brandSecondary,
      },
      registrationUrl,
    };
  }

  /* ── serve QR as inline PNG image (any non-deleted event) ─────── */
  @Get(':shortHash/image')
  @SetMetadata('isPublic', true)
  async getQrImage(@Param('shortHash') shortHash: string, @Res() res: Response) {
    const event = await this.prisma.event.findUnique({
      where: { shortHash },
      select: { id: true, name: true, status: true },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const joinUrl = `${frontendUrl}/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`;

    const buffer = await buildQrBuffer(joinUrl, 400);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }

  /* ── download high-quality QR PNG (600px, for printing) ─────────── */
  @Get(':shortHash/download')
  @SetMetadata('isPublic', true)
  async downloadQr(@Param('shortHash') shortHash: string, @Res() res: Response) {
    const event = await this.prisma.event.findUnique({
      where: { shortHash },
      select: { id: true, name: true, status: true },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const joinUrl = `${frontendUrl}/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`;

    /* 800px with highest error correction — print-ready */
    const buffer = await buildQrBuffer(joinUrl, 800);
    const safeName = event.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="qr_${safeName}.png"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
