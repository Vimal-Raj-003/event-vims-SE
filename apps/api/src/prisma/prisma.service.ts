import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });

    this.registerLogging();
  }

  private registerLogging(): void {
    (this as any).$on('query', (e: { query: string; duration: number }) => {
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(`Query: ${e.query} — ${e.duration}ms`);
      }
    });

    (this as any).$on('error', (e: { message: string }) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });

    (this as any).$on('warn', (e: { message: string }) => {
      this.logger.warn(`Prisma warning: ${e.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection established');

    await this.$executeRaw`SELECT 1`;
    this.logger.log('Database connectivity verified');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
    this.logger.log('Database connection closed');
  }
}
