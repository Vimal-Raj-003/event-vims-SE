import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Health check — returns service and database readiness' })
  async check() {
    const startTime = Date.now();
    let dbStatus: string;
    let dbLatency: number;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
      dbLatency = Date.now() - startTime;
    } catch {
      dbStatus = 'disconnected';
      dbLatency = -1;
    }

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '0.0.1',
      services: {
        database: {
          status: dbStatus,
          latencyMs: dbLatency,
        },
      },
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe — confirms the process is responsive' })
  async liveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — confirms the service can accept traffic' })
  async readiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch {
      return {
        status: 'not_ready',
        reason: 'database_unavailable',
        timestamp: new Date().toISOString(),
      };
    }
  }
}
