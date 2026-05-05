import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

const ACTIVE_WINDOW_MIN = 30;

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('stats')
  @UseGuards(ThrottlerGuard)
  @Throttle({ medium: { limit: 60, ttl: 10_000 } })
  @Header('Cache-Control', 'public, max-age=15, stale-while-revalidate=30')
  @ApiOperation({
    summary:
      'Public landing-page stats — currently-networking attendee count across published, in-progress events',
  })
  async stats() {
    const now = new Date();
    const activeSince = new Date(now.getTime() - ACTIVE_WINDOW_MIN * 60 * 1000);

    const networkingNow = await this.prisma.attendee.count({
      where: {
        isPaused: false,
        lastActiveAt: { gte: activeSince },
        event: {
          status: 'PUBLISHED',
          startAt: { lte: now },
          endAt: { gte: now },
        },
      },
    });

    return {
      networkingNow,
      asOf: now.toISOString(),
    };
  }
}
