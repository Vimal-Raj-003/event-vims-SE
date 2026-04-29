import { ClsService, ClsStore } from 'nestjs-cls';
import { Prisma } from '@prisma/client';

export interface RlsContext extends ClsStore {
  organiserId: string | null;
  eventId: string | null;
  isSuperAdmin: boolean;
}

const RLS_QUERY = Prisma.sql`
  SELECT set_config('app.current_organiser_id', $1::text, false),
         set_config('app.current_event_id', $2::text, false),
         set_config('app.is_super_admin', $3::text, false)
`;

export function createRlsExtension(cls: ClsService<RlsContext>) {
  return Prisma.defineExtension({
    name: 'rlsExtension',
    query: {
      $allModels: {
        async $allOperations({ args, query, model, operation }) {
          const organiserId = cls.get('organiserId') ?? '';
          const eventId = cls.get('eventId') ?? '';
          const isSuperAdmin = cls.get('isSuperAdmin') ?? false;

          const prisma = Prisma.getExtensionContext(this);

          await (prisma as unknown as { $executeRaw: (query: Prisma.Sql) => Promise<void> }).$executeRaw(
            Prisma.sql`${RLS_QUERY} ${organiserId} ${eventId} ${isSuperAdmin ? 'true' : 'false'}`,
          );

          const startTime = Date.now();
          try {
            const result = await query(args);
            return result;
          } finally {
            const duration = Date.now() - startTime;
            if (duration > 500) {
              console.warn(
                `[RLS] Slow query detected: ${model}.${operation} took ${duration}ms`,
              );
            }
          }
        },
      },
    },
  });
}

export function buildRlsParameters(context: RlsContext): Prisma.Sql {
  return Prisma.sql`
    SELECT set_config('app.current_organiser_id', ${context.organiserId ?? ''}, false),
           set_config('app.current_event_id', ${context.eventId ?? ''}, false),
           set_config('app.is_super_admin', ${context.isSuperAdmin ? 'true' : 'false'}, false)
  `;
}
