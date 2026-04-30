import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' },
      ],
    });
    this.registerLogging();
  }

  private registerLogging(): void {
    (this as any).$on('error', (e: { message: string }) => {
      this.logger.error(`Prisma error: ${e.message}`);
    });
    (this as any).$on('warn', (e: { message: string }) => {
      this.logger.warn(`Prisma warning: ${e.message}`);
    });
  }

  async onModuleInit(): Promise<void> {
    const maxRetries = 8;
    const delayMs = 3000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        await this.$executeRaw`SELECT 1`;
        this.logger.log(`Database connected (attempt ${attempt})`);
        return;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt < maxRetries) {
          this.logger.warn(
            `DB not ready (attempt ${attempt}/${maxRetries}) — Neon may be waking up. Retrying in ${delayMs / 1000}s… ${msg.slice(0, 80)}`,
          );
          await new Promise((r) => setTimeout(r, delayMs));
        } else {
          this.logger.error(`Database unreachable after ${maxRetries} attempts: ${msg}`);
          throw err;
        }
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
