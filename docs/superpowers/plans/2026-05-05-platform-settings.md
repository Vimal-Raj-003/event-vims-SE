# Platform Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Super Admin Platform Settings page genuinely functional end-to-end — persist 7 settings, gate organiser self-signup, dynamically use platform name + support email on real downstream surfaces, and represent the 3 not-yet-built feature toggles honestly in the UI.

**Architecture:** Singleton-row `PlatformSettings` Prisma model. NestJS GET/PATCH endpoints under super-admin auth + a single public `GET /public/settings` for branding/signup-gate consumption. 60s in-memory cache on backend + 60s `Cache-Control` on the public endpoint. Frontend uses the existing `apiClient` (axios wrapper) pattern; no react-query introduction. Audit-logged on every PATCH via existing `audit_logs` infrastructure.

**Tech Stack:** NestJS 10, Prisma 5, PostgreSQL (Neon), Next.js 14 App Router, TypeScript, class-validator, custom `apiClient`. Tests: Jest (NestJS unit/integration), Playwright (E2E).

**Spec:** [docs/superpowers/specs/2026-05-05-platform-settings-design.md](../specs/2026-05-05-platform-settings-design.md)

---

## File Structure

### New files

| Path | Purpose |
|---|---|
| `apps/api/prisma/migrations/<TS>_platform_settings/migration.sql` | Create table + seed singleton row |
| `apps/api/src/admin/platform-settings.cache.ts` | In-memory cache (TTL 60s) |
| `apps/api/src/admin/platform-settings.service.ts` | Get / update / audit-log; injected into AdminController + PublicSettingsController + MailService |
| `apps/api/src/admin/dto/update-platform-settings.dto.ts` | PATCH body validation |
| `apps/api/src/admin/dto/platform-settings-response.dto.ts` | Full GET response shape |
| `apps/api/src/admin/dto/public-settings-response.dto.ts` | Narrow public shape |
| `apps/api/src/public/public.module.ts` | Module registering public endpoints |
| `apps/api/src/public/public-settings.controller.ts` | `GET /public/settings` |
| `apps/web/src/hooks/use-platform-settings.ts` | Client-side fetch hook for public settings |
| `apps/web/src/app/error.tsx` | Root error boundary with support contact |
| `apps/web/src/app/not-found.tsx` | Root 404 with support contact |

### Modified files

| Path | Change |
|---|---|
| `apps/api/prisma/schema.prisma` | Add `PlatformSettings` model |
| `apps/api/src/admin/admin.controller.ts` | Add GET + PATCH `/admin/settings` |
| `apps/api/src/admin/admin.module.ts` | Register `PlatformSettingsService` + cache |
| `apps/api/src/app.module.ts` | Import `PublicModule` |
| `apps/api/src/mail/mail.service.ts` | Replace hardcoded `"VIMS Events"` with dynamic platform name; subject prefix |
| `apps/web/src/app/layout.tsx` | Dynamic `title.template` from server-side fetch |
| `apps/web/src/app/(super-admin)/admin/settings/page.tsx` | Full rewrite from static shell to functional |
| `apps/web/src/app/(public)/auth/organiser/signup/page.tsx` | Add disabled-state branch when self-signup is OFF |
| `apps/web/src/app/(super-admin)/layout.tsx` and `apps/web/src/app/(organiser)/layout.tsx` | Replace hardcoded "VIMS Events" brand text with fetched platform name |

### Dropped from spec scope

- **§6 surface 5a (Footer mailto)** — no global footer component exists in the codebase today. Adding one across all route groups is mission creep beyond Option B. Contact line still ships on error pages (surface 5b). Track as TODO for a future spec.

---

## Task overview

| # | Task | Layer | TDD-able? |
|---|---|---|---|
| 1 | Prisma model + migration + seed | DB | Manual verify (schema validate + migrate apply) |
| 2 | `PlatformSettingsCache` utility | Backend | Yes (unit) |
| 3 | `PlatformSettingsService` (get, getPublic, update, audit) | Backend | Yes (unit) |
| 4 | DTOs (update + response shapes) | Backend | Yes (DTO validation tests) |
| 5 | Admin GET + PATCH `/admin/settings` | Backend | Yes (e2e via supertest) |
| 6 | Public `GET /public/settings` + `PublicModule` | Backend | Yes (e2e via supertest) |
| 7 | Frontend `usePlatformSettings` hook | FE | Yes (component-level via Playwright) |
| 8 | Settings page rewrite — full | FE | Playwright |
| 9 | Public organiser signup — disabled-state branch | FE | Playwright |
| 10 | MailService — dynamic from + subject prefix | Backend | Yes (unit) |
| 11 | Root layout `title.template` + brand text in (super-admin) + (organiser) layouts | FE | Manual visual |
| 12 | Root `error.tsx` + `not-found.tsx` with support contact | FE | Manual visual |
| 13 | E2E test sweep — 3 Playwright scenarios | Test | — |

---

## Task 1: Prisma model + migration + seed

**Spec section:** §3.1, §3.2

**Files:**
- Modify: `apps/api/prisma/schema.prisma` (append after `OrganiserSettings` model)
- Create: `apps/api/prisma/migrations/<TS>_platform_settings/migration.sql`

- [ ] **Step 1: Add the model to schema.prisma**

Append after the existing `OrganiserSettings` model:

```prisma
model PlatformSettings {
  id                       String   @id @default("platform")
  platformName             String   @default("VIMS Event Networking") @map("platform_name")
  supportEmail             String   @default("admin@vimsenterprise.com") @map("support_email")
  dataRetentionMonths      Int      @default(12) @map("data_retention_months")
  allowOrganiserSelfSignup Boolean  @default(true) @map("allow_organiser_self_signup")
  cardToCardQrConnections  Boolean  @default(false) @map("card_to_card_qr_connections")
  crossEventNetworks       Boolean  @default(false) @map("cross_event_networks")
  multiLanguageSupport     Boolean  @default(false) @map("multi_language_support")
  updatedAt                DateTime @updatedAt @map("updated_at")
  updatedBy                String?  @map("updated_by")

  @@map("platform_settings")
}
```

- [ ] **Step 2: Validate the schema**

```bash
cd apps/api
npx prisma validate --schema prisma/schema.prisma
```

Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 3: Generate the migration timestamp folder name**

```bash
TS=$(date -u +%Y%m%d%H%M%S)
mkdir -p prisma/migrations/${TS}_platform_settings
echo "Created: prisma/migrations/${TS}_platform_settings"
```

- [ ] **Step 4: Generate the migration SQL**

```bash
npx prisma migrate diff \
  --from-migrations prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "${DATABASE_URL}" \
  --script > prisma/migrations/${TS}_platform_settings/migration.sql
```

If shadow-DB is unavailable, fall back to manual SQL:

```sql
-- CreateTable
CREATE TABLE "platform_settings" (
    "id" TEXT NOT NULL DEFAULT 'platform',
    "platform_name" TEXT NOT NULL DEFAULT 'VIMS Event Networking',
    "support_email" TEXT NOT NULL DEFAULT 'admin@vimsenterprise.com',
    "data_retention_months" INTEGER NOT NULL DEFAULT 12,
    "allow_organiser_self_signup" BOOLEAN NOT NULL DEFAULT true,
    "card_to_card_qr_connections" BOOLEAN NOT NULL DEFAULT false,
    "cross_event_networks" BOOLEAN NOT NULL DEFAULT false,
    "multi_language_support" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- Seed singleton row
INSERT INTO "platform_settings" ("id", "updated_at")
VALUES ('platform', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
```

- [ ] **Step 5: Apply migration locally**

```bash
npx prisma migrate deploy
```

Expected: `Applying migration <TS>_platform_settings` and `All migrations have been successfully applied.`

- [ ] **Step 6: Verify the seed row exists**

```bash
npx prisma studio
# OR
echo "SELECT * FROM platform_settings;" | psql "$DATABASE_URL_DIRECT"
```

Expected: one row with id='platform' and all defaults populated.

- [ ] **Step 7: Generate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 8: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add PlatformSettings singleton model + migration"
```

---

## Task 2: PlatformSettingsCache utility

**Spec section:** §4.2 ("PlatformSettingsCache 60s TTL")

**Files:**
- Create: `apps/api/src/admin/platform-settings.cache.ts`
- Test: `apps/api/src/admin/platform-settings.cache.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `apps/api/src/admin/platform-settings.cache.spec.ts`:

```typescript
import { PlatformSettingsCache } from './platform-settings.cache';

describe('PlatformSettingsCache', () => {
  let cache: PlatformSettingsCache<{ value: number }>;

  beforeEach(() => {
    cache = new PlatformSettingsCache(1000); // 1 second TTL for tests
  });

  it('returns undefined for missing key', () => {
    expect(cache.get('any')).toBeUndefined();
  });

  it('returns set value within TTL', () => {
    cache.set('a', { value: 1 });
    expect(cache.get('a')).toEqual({ value: 1 });
  });

  it('returns undefined after TTL expires', () => {
    jest.useFakeTimers();
    cache.set('a', { value: 1 });
    jest.advanceTimersByTime(1100);
    expect(cache.get('a')).toBeUndefined();
    jest.useRealTimers();
  });

  it('invalidate clears the entry', () => {
    cache.set('a', { value: 1 });
    cache.invalidate('a');
    expect(cache.get('a')).toBeUndefined();
  });

  it('clear removes all entries', () => {
    cache.set('a', { value: 1 });
    cache.set('b', { value: 2 });
    cache.clear();
    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
cd apps/api
npx jest src/admin/platform-settings.cache.spec.ts
```

Expected: `Cannot find module './platform-settings.cache'`

- [ ] **Step 3: Implement minimal cache**

Create `apps/api/src/admin/platform-settings.cache.ts`:

```typescript
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class PlatformSettingsCache<T> {
  private store = new Map<string, CacheEntry<T>>();

  constructor(private readonly ttlMs: number = 60_000) {}

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npx jest src/admin/platform-settings.cache.spec.ts
```

Expected: All 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/platform-settings.cache.ts apps/api/src/admin/platform-settings.cache.spec.ts
git commit -m "feat(api): add PlatformSettingsCache TTL utility"
```

---

## Task 3: PlatformSettingsService (get, getPublic, update, audit)

**Spec section:** §3.3, §4.2, §4.3

**Files:**
- Create: `apps/api/src/admin/platform-settings.service.ts`
- Test: `apps/api/src/admin/platform-settings.service.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/admin/platform-settings.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformSettingsCache } from './platform-settings.cache';
import { PrismaService } from '../prisma/prisma.service';

describe('PlatformSettingsService', () => {
  let service: PlatformSettingsService;
  let prisma: { platformSettings: any; auditLog: any };

  beforeEach(async () => {
    prisma = {
      platformSettings: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PlatformSettingsService,
        PlatformSettingsCache,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = moduleRef.get(PlatformSettingsService);
  });

  describe('get()', () => {
    it('returns settings from DB on cache miss', async () => {
      const row = { id: 'platform', platformName: 'X', supportEmail: 'a@b.com' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(row);

      expect(await service.get()).toEqual(row);
      expect(prisma.platformSettings.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    });

    it('returns settings from cache on hit (no second DB call)', async () => {
      const row = { id: 'platform', platformName: 'X' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(row);

      await service.get();
      await service.get();

      expect(prisma.platformSettings.findUniqueOrThrow).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPublic()', () => {
    it('returns narrowed shape for public consumption', async () => {
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue({
        platformName: 'X',
        supportEmail: 'a@b.com',
        allowOrganiserSelfSignup: true,
        dataRetentionMonths: 12,
        cardToCardQrConnections: false,
      });

      expect(await service.getPublic()).toEqual({
        platformName: 'X',
        supportEmail: 'a@b.com',
        selfSignupEnabled: true,
      });
    });
  });

  describe('update()', () => {
    it('updates only the provided fields, writes audit log, invalidates cache', async () => {
      const before = {
        id: 'platform',
        platformName: 'Old',
        supportEmail: 'old@b.com',
        dataRetentionMonths: 12,
        allowOrganiserSelfSignup: true,
      };
      const after = { ...before, platformName: 'New' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(before);
      prisma.platformSettings.update.mockResolvedValue(after);

      const result = await service.update({ platformName: 'New' }, 'admin-1');

      expect(result).toEqual(after);
      expect(prisma.platformSettings.update).toHaveBeenCalledWith({
        where: { id: 'platform' },
        data: { platformName: 'New', updatedBy: 'admin-1' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'platform_settings.update',
          actorId: 'admin-1',
          actorRole: 'SUPER_ADMIN',
          entityType: 'PlatformSettings',
          entityId: 'platform',
          metadata: expect.objectContaining({
            changed: ['platformName'],
            before: { platformName: 'Old' },
            after: { platformName: 'New' },
          }),
        }),
      });
    });

    it('does nothing when no fields would change', async () => {
      const row = { id: 'platform', platformName: 'X' };
      prisma.platformSettings.findUniqueOrThrow.mockResolvedValue(row);

      const result = await service.update({ platformName: 'X' }, 'admin-1');

      expect(prisma.platformSettings.update).not.toHaveBeenCalled();
      expect(prisma.auditLog.create).not.toHaveBeenCalled();
      expect(result).toEqual(row);
    });
  });
});
```

- [ ] **Step 2: Run tests, confirm fail**

```bash
cd apps/api
npx jest src/admin/platform-settings.service.spec.ts
```

Expected: `Cannot find module './platform-settings.service'`

- [ ] **Step 3: Implement the service**

Create `apps/api/src/admin/platform-settings.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformSettingsCache } from './platform-settings.cache';
import type { PlatformSettings } from '@prisma/client';
import type { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';

const SINGLETON_ID = 'platform';
const CACHE_KEY = 'platform-settings';

export interface PublicPlatformSettings {
  platformName: string;
  supportEmail: string;
  selfSignupEnabled: boolean;
}

@Injectable()
export class PlatformSettingsService {
  private readonly logger = new Logger(PlatformSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: PlatformSettingsCache<PlatformSettings>,
  ) {}

  async get(): Promise<PlatformSettings> {
    const cached = this.cache.get(CACHE_KEY);
    if (cached) return cached;

    const row = await this.prisma.platformSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });
    this.cache.set(CACHE_KEY, row);
    return row;
  }

  async getPublic(): Promise<PublicPlatformSettings> {
    const row = await this.get();
    return {
      platformName: row.platformName,
      supportEmail: row.supportEmail,
      selfSignupEnabled: row.allowOrganiserSelfSignup,
    };
  }

  async update(
    dto: UpdatePlatformSettingsDto,
    actorId: string,
  ): Promise<PlatformSettings> {
    const before = await this.prisma.platformSettings.findUniqueOrThrow({
      where: { id: SINGLETON_ID },
    });

    const changed: string[] = [];
    const beforeDelta: Record<string, unknown> = {};
    const afterDelta: Record<string, unknown> = {};

    for (const key of Object.keys(dto) as (keyof UpdatePlatformSettingsDto)[]) {
      const newValue = dto[key];
      if (newValue === undefined) continue;
      if ((before as any)[key] !== newValue) {
        changed.push(key);
        beforeDelta[key] = (before as any)[key];
        afterDelta[key] = newValue;
      }
    }

    if (changed.length === 0) {
      return before;
    }

    const updated = await this.prisma.platformSettings.update({
      where: { id: SINGLETON_ID },
      data: { ...dto, updatedBy: actorId },
    });

    this.cache.invalidate(CACHE_KEY);

    await this.prisma.auditLog.create({
      data: {
        actorId,
        actorRole: 'SUPER_ADMIN',
        action: 'platform_settings.update',
        entityType: 'PlatformSettings',
        entityId: SINGLETON_ID,
        metadata: { changed, before: beforeDelta, after: afterDelta },
      },
    });

    return updated;
  }
}
```

- [ ] **Step 4: Run tests, confirm pass**

```bash
npx jest src/admin/platform-settings.service.spec.ts
```

Expected: All tests pass.

- [ ] **Step 5: Register service in AdminModule**

Modify `apps/api/src/admin/admin.module.ts`. Add `PlatformSettingsService` and `PlatformSettingsCache` to providers, and `PlatformSettingsService` to exports (so MailService can inject it):

```typescript
import { PlatformSettingsService } from './platform-settings.service';
import { PlatformSettingsCache } from './platform-settings.cache';

@Module({
  // ... existing
  providers: [
    /* existing */
    PlatformSettingsService,
    {
      provide: PlatformSettingsCache,
      useFactory: () => new PlatformSettingsCache(60_000),
    },
  ],
  exports: [/* existing */, PlatformSettingsService],
})
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/admin/platform-settings.service.ts \
        apps/api/src/admin/platform-settings.service.spec.ts \
        apps/api/src/admin/admin.module.ts
git commit -m "feat(api): add PlatformSettingsService with cache and audit logging"
```

---

## Task 4: DTOs (update + response shapes)

**Spec section:** §4.1

**Files:**
- Create: `apps/api/src/admin/dto/update-platform-settings.dto.ts`
- Create: `apps/api/src/admin/dto/platform-settings-response.dto.ts`
- Create: `apps/api/src/admin/dto/public-settings-response.dto.ts`
- Test: `apps/api/src/admin/dto/update-platform-settings.dto.spec.ts`

- [ ] **Step 1: Write the failing DTO validation test**

Create `apps/api/src/admin/dto/update-platform-settings.dto.spec.ts`:

```typescript
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdatePlatformSettingsDto } from './update-platform-settings.dto';

const validateDto = async (input: unknown) => {
  const instance = plainToInstance(UpdatePlatformSettingsDto, input);
  const errors = await validate(instance as object);
  return errors;
};

describe('UpdatePlatformSettingsDto', () => {
  it('accepts an empty object (all fields optional)', async () => {
    expect(await validateDto({})).toHaveLength(0);
  });

  it('accepts a valid full payload', async () => {
    expect(
      await validateDto({
        platformName: 'My Platform',
        supportEmail: 'help@example.com',
        dataRetentionMonths: 24,
        allowOrganiserSelfSignup: false,
        cardToCardQrConnections: false,
        crossEventNetworks: false,
        multiLanguageSupport: false,
      }),
    ).toHaveLength(0);
  });

  it('rejects empty platformName', async () => {
    const errors = await validateDto({ platformName: '' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('platformName');
  });

  it('rejects platformName over 100 chars', async () => {
    const errors = await validateDto({ platformName: 'a'.repeat(101) });
    expect(errors).toHaveLength(1);
  });

  it('rejects invalid supportEmail', async () => {
    const errors = await validateDto({ supportEmail: 'not-an-email' });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('supportEmail');
  });

  it('rejects dataRetentionMonths < 1', async () => {
    const errors = await validateDto({ dataRetentionMonths: 0 });
    expect(errors).toHaveLength(1);
  });

  it('rejects dataRetentionMonths > 120', async () => {
    const errors = await validateDto({ dataRetentionMonths: 121 });
    expect(errors).toHaveLength(1);
  });

  it('rejects setting cardToCardQrConnections to true', async () => {
    const errors = await validateDto({ cardToCardQrConnections: true });
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('cardToCardQrConnections');
  });

  it('rejects setting crossEventNetworks to true', async () => {
    const errors = await validateDto({ crossEventNetworks: true });
    expect(errors).toHaveLength(1);
  });

  it('rejects setting multiLanguageSupport to true', async () => {
    const errors = await validateDto({ multiLanguageSupport: true });
    expect(errors).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
cd apps/api
npx jest src/admin/dto/update-platform-settings.dto.spec.ts
```

Expected: `Cannot find module './update-platform-settings.dto'`

- [ ] **Step 3: Implement the DTOs**

Create `apps/api/src/admin/dto/update-platform-settings.dto.ts`:

```typescript
import {
  Equals,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  platformName?: string;

  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  dataRetentionMonths?: number;

  @IsOptional()
  @IsBoolean()
  allowOrganiserSelfSignup?: boolean;

  @IsOptional()
  @IsBoolean()
  @Equals(false, { message: 'cardToCardQrConnections is not yet available' })
  cardToCardQrConnections?: boolean;

  @IsOptional()
  @IsBoolean()
  @Equals(false, { message: 'crossEventNetworks is not yet available' })
  crossEventNetworks?: boolean;

  @IsOptional()
  @IsBoolean()
  @Equals(false, { message: 'multiLanguageSupport is not yet available' })
  multiLanguageSupport?: boolean;
}
```

Create `apps/api/src/admin/dto/platform-settings-response.dto.ts`:

```typescript
export class PlatformSettingsResponseDto {
  id!: string;
  platformName!: string;
  supportEmail!: string;
  dataRetentionMonths!: number;
  allowOrganiserSelfSignup!: boolean;
  cardToCardQrConnections!: boolean;
  crossEventNetworks!: boolean;
  multiLanguageSupport!: boolean;
  updatedAt!: Date;
  updatedBy!: string | null;
}
```

Create `apps/api/src/admin/dto/public-settings-response.dto.ts`:

```typescript
export class PublicSettingsResponseDto {
  platformName!: string;
  supportEmail!: string;
  selfSignupEnabled!: boolean;
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npx jest src/admin/dto/update-platform-settings.dto.spec.ts
```

Expected: All 10 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/dto/
git commit -m "feat(api): add platform-settings DTOs with validation"
```

---

## Task 5: Admin GET + PATCH `/admin/settings`

**Spec section:** §4.1

**Files:**
- Modify: `apps/api/src/admin/admin.controller.ts` (append two route handlers)
- Test: `apps/api/test/platform-settings.e2e-spec.ts` (NEW)

- [ ] **Step 1: Write the failing e2e test**

Create `apps/api/test/platform-settings.e2e-spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

describe('Platform Settings (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let superAdminToken: string;
  let organiserToken: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);

    // Ensure singleton row exists (migration should have seeded it)
    await prisma.platformSettings.upsert({
      where: { id: 'platform' },
      create: { id: 'platform' },
      update: {},
    });

    superAdminToken = jwt.sign({ sub: 'admin-test', role: 'SUPER_ADMIN' });
    organiserToken = jwt.sign({ sub: 'org-test', role: 'ORGANISER' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /admin/settings', () => {
    it('returns 401 without auth', async () => {
      await request(app.getHttpServer()).get('/admin/settings').expect(401);
    });

    it('returns 403 for non-super-admin', async () => {
      await request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${organiserToken}`)
        .expect(403);
    });

    it('returns settings for super admin', async () => {
      const res = await request(app.getHttpServer())
        .get('/admin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .expect(200);
      expect(res.body).toMatchObject({
        id: 'platform',
        platformName: expect.any(String),
        supportEmail: expect.any(String),
        allowOrganiserSelfSignup: expect.any(Boolean),
      });
    });
  });

  describe('PATCH /admin/settings', () => {
    it('updates platformName', async () => {
      const res = await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ platformName: 'Updated Platform' })
        .expect(200);
      expect(res.body.platformName).toBe('Updated Platform');
    });

    it('rejects setting cardToCardQrConnections=true with 422', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ cardToCardQrConnections: true })
        .expect(422);
    });

    it('writes audit log row on successful update', async () => {
      await request(app.getHttpServer())
        .patch('/admin/settings')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ platformName: 'Audit Test' })
        .expect(200);

      const log = await prisma.auditLog.findFirst({
        where: { action: 'platform_settings.update' },
        orderBy: { createdAt: 'desc' },
      });
      expect(log).not.toBeNull();
      expect(log!.actorRole).toBe('SUPER_ADMIN');
      expect((log!.metadata as any).changed).toContain('platformName');
    });
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
cd apps/api
npx jest --config test/jest-e2e.json platform-settings.e2e-spec.ts
```

Expected: 404 errors (route not registered yet).

- [ ] **Step 3: Add route handlers**

Modify `apps/api/src/admin/admin.controller.ts`. Find the controller class and add two new methods (place them near the top of the class, before existing handlers):

```typescript
import { Body, Get, Patch } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator'; // confirm exact path during execution
import { PlatformSettingsService } from './platform-settings.service';
import { UpdatePlatformSettingsDto } from './dto/update-platform-settings.dto';
import { PlatformSettingsResponseDto } from './dto/platform-settings-response.dto';

// Inside AdminController class — add to constructor:
constructor(
  /* existing services */
  private readonly platformSettings: PlatformSettingsService,
) {}

@Get('settings')
async getSettings(): Promise<PlatformSettingsResponseDto> {
  return this.platformSettings.get();
}

@Patch('settings')
async updateSettings(
  @CurrentUser() user: { id: string },
  @Body() dto: UpdatePlatformSettingsDto,
): Promise<PlatformSettingsResponseDto> {
  return this.platformSettings.update(dto, user.id);
}
```

- [ ] **Step 4: Run test, confirm pass**

```bash
npx jest --config test/jest-e2e.json platform-settings.e2e-spec.ts
```

Expected: All tests pass (auth gating, update succeeds, 422 on flag, audit log written).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/admin/admin.controller.ts apps/api/test/platform-settings.e2e-spec.ts
git commit -m "feat(api): add GET and PATCH /admin/settings endpoints"
```

---

## Task 6: Public `GET /public/settings` + PublicModule

**Spec section:** §4.3

**Files:**
- Create: `apps/api/src/public/public.module.ts`
- Create: `apps/api/src/public/public-settings.controller.ts`
- Modify: `apps/api/src/app.module.ts`
- Test: append to `apps/api/test/platform-settings.e2e-spec.ts`

- [ ] **Step 1: Append failing tests to the e2e spec**

Append to the existing `platform-settings.e2e-spec.ts`:

```typescript
describe('GET /public/settings', () => {
  it('returns narrow public shape without auth', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/settings')
      .expect(200);
    expect(res.body).toEqual({
      platformName: expect.any(String),
      supportEmail: expect.any(String),
      selfSignupEnabled: expect.any(Boolean),
    });
    // Confirm internal fields are NOT leaked
    expect(res.body).not.toHaveProperty('cardToCardQrConnections');
    expect(res.body).not.toHaveProperty('dataRetentionMonths');
    expect(res.body).not.toHaveProperty('updatedBy');
  });

  it('sets Cache-Control: public, max-age=60', async () => {
    const res = await request(app.getHttpServer())
      .get('/public/settings')
      .expect(200);
    expect(res.headers['cache-control']).toMatch(/public/);
    expect(res.headers['cache-control']).toMatch(/max-age=60/);
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
npx jest --config test/jest-e2e.json platform-settings.e2e-spec.ts
```

Expected: 404 (no /public/settings route).

- [ ] **Step 3: Create the public controller**

Create `apps/api/src/public/public-settings.controller.ts`:

```typescript
import { Controller, Get, Header } from '@nestjs/common';
import { PlatformSettingsService } from '../admin/platform-settings.service';
import { PublicSettingsResponseDto } from '../admin/dto/public-settings-response.dto';

@Controller('public/settings')
export class PublicSettingsController {
  constructor(private readonly settings: PlatformSettingsService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=60')
  async get(): Promise<PublicSettingsResponseDto> {
    return this.settings.getPublic();
  }
}
```

- [ ] **Step 4: Create the PublicModule**

Create `apps/api/src/public/public.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PublicSettingsController } from './public-settings.controller';

@Module({
  imports: [AdminModule], // for PlatformSettingsService
  controllers: [PublicSettingsController],
})
export class PublicModule {}
```

- [ ] **Step 5: Register PublicModule in AppModule**

Modify `apps/api/src/app.module.ts`. Add `PublicModule` to the imports array:

```typescript
import { PublicModule } from './public/public.module';

@Module({
  imports: [
    /* existing modules */
    PublicModule,
  ],
  // ...
})
export class AppModule {}
```

- [ ] **Step 6: Run test, confirm pass**

```bash
npx jest --config test/jest-e2e.json platform-settings.e2e-spec.ts
```

Expected: All tests in the file pass.

- [ ] **Step 7: Verify auth NOT required (no global guard side effect)**

```bash
# Quick smoke check
curl -i http://localhost:4000/api/v1/public/settings 2>&1 | head -10
```

Expected: HTTP/1.1 200 OK (not 401). If you see 401, a global JwtAuthGuard is in play; check `apps/api/src/main.ts` and `apps/api/src/app.module.ts` for `APP_GUARD` providers. If a global guard exists, add `@Public()` decorator (create one in `apps/api/src/auth/decorators/public.decorator.ts` using `SetMetadata`) and update the JwtAuthGuard to skip routes marked public.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/public/ apps/api/src/app.module.ts apps/api/test/platform-settings.e2e-spec.ts
git commit -m "feat(api): add GET /public/settings public endpoint"
```

---

## Task 7: Frontend `usePlatformSettings` hook

**Spec section:** §5.3

**Files:**
- Create: `apps/web/src/hooks/use-platform-settings.ts`

- [ ] **Step 1: Implement the hook**

Create `apps/web/src/hooks/use-platform-settings.ts`:

```typescript
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client"; // confirm exact import path during execution

export interface PublicPlatformSettings {
  platformName: string;
  supportEmail: string;
  selfSignupEnabled: boolean;
}

const FALLBACK: PublicPlatformSettings = {
  platformName: "VIMS Events",
  supportEmail: "admin@vimsenterprise.com",
  selfSignupEnabled: true,
};

export function usePlatformSettings() {
  const [data, setData] = useState<PublicPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<PublicPlatformSettings>("/public/settings")
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err);
        setData(FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data: data ?? FALLBACK, loading, error };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd apps/web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-platform-settings.ts
git commit -m "feat(web): add usePlatformSettings hook"
```

---

## Task 8: Settings page rewrite — full

**Spec section:** §5.1

**Files:**
- Modify (full rewrite): `apps/web/src/app/(super-admin)/admin/settings/page.tsx`

- [ ] **Step 1: Read the current file to confirm imports / styling utilities**

```bash
cat apps/web/src/app/\(super-admin\)/admin/settings/page.tsx
```

Note the existing component imports (Switch, Input, Label, Button, Badge, etc.) and toast pattern. The rewrite preserves this UI shell.

- [ ] **Step 2: Replace the page contents**

Overwrite `apps/web/src/app/(super-admin)/admin/settings/page.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client"; // confirm path

interface PlatformSettings {
  id: string;
  platformName: string;
  supportEmail: string;
  dataRetentionMonths: number;
  allowOrganiserSelfSignup: boolean;
  cardToCardQrConnections: boolean;
  crossEventNetworks: boolean;
  multiLanguageSupport: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

type Editable = Pick<
  PlatformSettings,
  "platformName" | "supportEmail" | "dataRetentionMonths" | "allowOrganiserSelfSignup"
>;

export default function PlatformSettingsPage() {
  const [loaded, setLoaded] = useState<PlatformSettings | null>(null);
  const [form, setForm] = useState<Editable | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    apiClient
      .get<PlatformSettings>("/admin/settings")
      .then((data) => {
        setLoaded(data);
        setForm({
          platformName: data.platformName,
          supportEmail: data.supportEmail,
          dataRetentionMonths: data.dataRetentionMonths,
          allowOrganiserSelfSignup: data.allowOrganiserSelfSignup,
        });
      })
      .catch(() => showToast("Failed to load settings."));
  }, []);

  const isDirty = useMemo(() => {
    if (!loaded || !form) return false;
    return (
      loaded.platformName !== form.platformName ||
      loaded.supportEmail !== form.supportEmail ||
      loaded.dataRetentionMonths !== form.dataRetentionMonths ||
      loaded.allowOrganiserSelfSignup !== form.allowOrganiserSelfSignup
    );
  }, [loaded, form]);

  const handleSave = async () => {
    if (!loaded || !form || !isDirty) return;
    setIsSaving(true);

    const delta: Partial<Editable> = {};
    if (loaded.platformName !== form.platformName) delta.platformName = form.platformName;
    if (loaded.supportEmail !== form.supportEmail) delta.supportEmail = form.supportEmail;
    if (loaded.dataRetentionMonths !== form.dataRetentionMonths)
      delta.dataRetentionMonths = form.dataRetentionMonths;
    if (loaded.allowOrganiserSelfSignup !== form.allowOrganiserSelfSignup)
      delta.allowOrganiserSelfSignup = form.allowOrganiserSelfSignup;

    try {
      const updated = await apiClient.patch<PlatformSettings>("/admin/settings", delta);
      setLoaded(updated);
      setForm({
        platformName: updated.platformName,
        supportEmail: updated.supportEmail,
        dataRetentionMonths: updated.dataRetentionMonths,
        allowOrganiserSelfSignup: updated.allowOrganiserSelfSignup,
      });
      showToast("Settings saved.");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save settings.";
      showToast(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (!form || !loaded) {
    return <div className="p-8 text-sm text-slate-500">Loading settings…</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-semibold mb-1">Platform Settings</h1>
      <p className="text-sm text-slate-500 mb-6">Configuration & data exports</p>

      {/* Section: General */}
      <section className="border rounded-lg p-6 mb-6 bg-white">
        <label className="block text-sm font-medium mb-1">Platform Name</label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={form.platformName}
          onChange={(e) => setForm({ ...form, platformName: e.target.value })}
          maxLength={100}
        />

        <label className="block text-sm font-medium mb-1 mt-4">Support Email</label>
        <input
          type="email"
          className="w-full border rounded px-3 py-2"
          value={form.supportEmail}
          onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
        />
      </section>

      {/* Section: Data Retention */}
      <section className="border rounded-lg p-6 mb-6 bg-white">
        <h2 className="text-lg font-semibold mb-1">Data Retention</h2>
        <p className="text-sm text-slate-500 mb-4">
          Attendee data is automatically purged after the retention period per DPDP storage limitation requirements.
        </p>
        <label className="block text-sm font-medium mb-1">Retention Period (months)</label>
        <input
          type="number"
          min={1}
          max={120}
          className="w-32 border rounded px-3 py-2"
          value={form.dataRetentionMonths}
          onChange={(e) =>
            setForm({ ...form, dataRetentionMonths: parseInt(e.target.value, 10) || 1 })
          }
        />
        <p className="text-xs text-slate-500 mt-2 italic">
          Saved. Automatic purging will activate in a future release.
        </p>
      </section>

      {/* Section: Feature Flags */}
      <section className="border rounded-lg p-6 mb-6 bg-white">
        <h2 className="text-lg font-semibold mb-4">Feature Flags</h2>

        <FlagRow
          label="Allow organiser self-signup"
          checked={form.allowOrganiserSelfSignup}
          onChange={(v) => setForm({ ...form, allowOrganiserSelfSignup: v })}
        />

        <FlagRow
          label="Card-to-card QR connections"
          checked={false}
          disabled
          comingSoon
        />
        <FlagRow
          label="Cross-event networks (opt-in)"
          checked={false}
          disabled
          comingSoon
        />
        <FlagRow
          label="Multi-language support"
          checked={false}
          disabled
          comingSoon
        />
      </section>

      <button
        onClick={handleSave}
        disabled={!isDirty || isSaving}
        className="w-full bg-indigo-600 text-white py-3 rounded font-medium disabled:opacity-50"
      >
        {isSaving ? "Saving…" : "Save Settings"}
      </button>

      <p className="text-xs text-slate-400 mt-3">
        Last updated by {loaded.updatedBy ?? "system"} on{" "}
        {new Date(loaded.updatedAt).toLocaleString()}. Public surfaces (emails, signup
        page) reflect changes within a minute.
      </p>

      {toast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded shadow">
          {toast}
        </div>
      )}
    </div>
  );
}

function FlagRow({
  label,
  checked,
  onChange,
  disabled,
  comingSoon,
}: {
  label: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex items-center gap-2">
        <span className={disabled ? "text-slate-400" : "text-slate-900"}>{label}</span>
        {comingSoon && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
            Coming soon
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
          checked ? "bg-indigo-600" : "bg-slate-300"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd apps/web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev   # in apps/web
# In another terminal: start API
cd apps/api && npm run dev
```

Open `http://localhost:3000/admin/settings` (super-admin login first). Verify:
- Form prefills with current values from API
- Save button disabled until you change a field
- Editing Platform Name and clicking Save → toast "Settings saved." → reload page → value persists
- The 3 disabled toggles cannot be flipped (cursor: not-allowed, no state change)
- Footer shows last-updated info

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(super-admin\)/admin/settings/page.tsx
git commit -m "feat(web): rewrite Platform Settings page to be functional"
```

---

## Task 9: Public organiser signup — disabled-state branch

**Spec section:** §5.2

**Files:**
- Modify: `apps/web/src/app/(public)/auth/organiser/signup/page.tsx`

- [ ] **Step 1: Read the current file**

```bash
cat apps/web/src/app/\(public\)/auth/organiser/signup/page.tsx
```

Note where the form JSX begins. The disabled branch wraps the form's parent.

- [ ] **Step 2: Add the conditional disabled state**

At the top of the component, add:

```tsx
import { usePlatformSettings } from "@/hooks/use-platform-settings";

// Inside component, after existing useState hooks:
const { data: platformSettings, loading: settingsLoading } = usePlatformSettings();
```

Wrap the form's outermost JSX node. If `selfSignupEnabled === false`, render the disabled UI instead:

```tsx
if (!settingsLoading && !platformSettings.selfSignupEnabled) {
  const subject = encodeURIComponent(
    `Organiser account request — ${platformSettings.platformName}`,
  );
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to request an organiser account for ${platformSettings.platformName}.\n\nName:\nOrganisation:\nReason:\n\nThanks.`,
  );
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg p-8 shadow">
        <h1 className="text-xl font-semibold mb-2">
          Organiser self-signup is currently disabled
        </h1>
        <p className="text-slate-600 text-sm mb-6">
          To request an organiser account, please contact us — we'll get you set up.
        </p>
        <a
          href={`mailto:${platformSettings.supportEmail}?subject=${subject}&body=${body}`}
          className="block w-full text-center bg-indigo-600 text-white py-3 rounded font-medium mb-3"
        >
          Request access
        </a>
        <a
          href="/auth/organiser/login"
          className="block text-center text-sm text-slate-500 hover:text-slate-700"
        >
          Already have an account? Sign in
        </a>
      </div>
    </div>
  );
}

// existing form return stays below this guard
```

Place this guard **after** any other early returns (loading state) but **before** the main form return.

- [ ] **Step 3: Defense-in-depth — handle 403 from signup submission**

In the existing form `handleSubmit` (or equivalent submit handler), find the `catch` block. If the error is HTTP 403 with the disabled message, re-render or show a clear toast:

```typescript
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : "Signup failed";
  // If the backend rejects because self-signup is disabled, point user to support
  if (message.toLowerCase().includes("self-signup") || message.toLowerCase().includes("disabled")) {
    showToast(`Self-signup is disabled. Contact ${platformSettings.supportEmail}.`);
  } else {
    showToast(message);
  }
}
```

- [ ] **Step 4: Add the backend signup gate**

This is the actual `allowOrganiserSelfSignup` implementation — the FE branch in Steps 2–3 is the visible UX, but the API check is the source of truth.

Modify `apps/api/src/auth/auth.service.ts` — find `organiserSignup` and add a check at the start:

```typescript
import { ForbiddenException } from '@nestjs/common';
import { PlatformSettingsService } from '../admin/platform-settings.service';

// Inject in constructor:
constructor(
  /* existing */
  private readonly platformSettings: PlatformSettingsService,
) {}

async organiserSignup(dto: OrganiserSignupDto) {
  const settings = await this.platformSettings.get();
  if (!settings.allowOrganiserSelfSignup) {
    throw new ForbiddenException(
      'Self-signup is currently disabled. Please contact the platform administrator.',
    );
  }
  // ... existing logic
}
```

Make sure `AuthModule` imports `AdminModule` (which exports `PlatformSettingsService`).

- [ ] **Step 5: Manual smoke test**

```bash
# Toggle self-signup off via Settings page (or directly in DB):
# UPDATE platform_settings SET allow_organiser_self_signup = false WHERE id = 'platform';

# Open public signup page
# Expected: disabled UI with "Request access" button
# Click "Request access" → opens mailto with platformName in subject
```

Then re-enable: `UPDATE platform_settings SET allow_organiser_self_signup = true WHERE id = 'platform';`. Reload signup page after 60s — form returns.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/\(public\)/auth/organiser/signup/page.tsx \
        apps/api/src/auth/auth.service.ts \
        apps/api/src/auth/auth.module.ts
git commit -m "feat: gate organiser self-signup on PlatformSettings.allowOrganiserSelfSignup"
```

---

## Task 10: MailService — dynamic from + subject prefix

**Spec section:** §6 surfaces #1 and #2

**Files:**
- Modify: `apps/api/src/mail/mail.service.ts`
- Modify: `apps/api/src/mail/mail.module.ts` (to import AdminModule for PlatformSettingsService)
- Test: `apps/api/src/mail/mail.service.spec.ts` (NEW or extend existing)

- [ ] **Step 1: Write failing tests for the from/subject helpers**

Create `apps/api/src/mail/mail.service.spec.ts` (or extend existing if present):

```typescript
import { Test } from '@nestjs/testing';
import { MailService } from './mail.service';
import { PlatformSettingsService } from '../admin/platform-settings.service';
import { ConfigService } from '@nestjs/config';

describe('MailService — branding', () => {
  let service: MailService;
  let platformSettings: { get: jest.Mock };

  beforeEach(async () => {
    platformSettings = {
      get: jest.fn().mockResolvedValue({ platformName: 'Acme Events' }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        MailService,
        { provide: PlatformSettingsService, useValue: platformSettings },
        {
          provide: ConfigService,
          useValue: { get: (k: string) => (k === 'MAIL_USERNAME' ? 'noreply@x.com' : undefined) },
        },
      ],
    }).compile();

    service = moduleRef.get(MailService);
  });

  it('builds from header using platformName from settings', async () => {
    expect(await service.buildFromHeader()).toBe('"Acme Events" <noreply@x.com>');
  });

  it('falls back to "VIMS Events" if settings throw', async () => {
    platformSettings.get.mockRejectedValue(new Error('db down'));
    expect(await service.buildFromHeader()).toBe('"VIMS Events" <noreply@x.com>');
  });

  it('prefixes non-OTP subjects with [platformName]', async () => {
    expect(await service.formatSubject('Welcome', false)).toBe('[Acme Events] Welcome');
  });

  it('does NOT prefix OTP subjects', async () => {
    expect(await service.formatSubject('Your OTP: 1234', true)).toBe('Your OTP: 1234');
  });
});
```

- [ ] **Step 2: Run test, confirm fail**

```bash
cd apps/api
npx jest src/mail/mail.service.spec.ts
```

Expected: `buildFromHeader is not a function` etc.

- [ ] **Step 3: Add the helper methods + refactor sends**

Modify `apps/api/src/mail/mail.service.ts`. Inject `PlatformSettingsService`:

```typescript
import { PlatformSettingsService } from '../admin/platform-settings.service';

constructor(
  private readonly config: ConfigService,
  private readonly platformSettings: PlatformSettingsService,
) {}

async buildFromHeader(): Promise<string> {
  const fromAddress = this.config.get<string>('MAIL_USERNAME');
  let name = 'VIMS Events';
  try {
    const settings = await this.platformSettings.get();
    name = settings.platformName;
  } catch (err) {
    this.logger.warn('Failed to read platform settings for from header; using fallback');
  }
  return `"${name}" <${fromAddress}>`;
}

async formatSubject(rawSubject: string, isOtp: boolean): Promise<string> {
  if (isOtp) return rawSubject;
  try {
    const settings = await this.platformSettings.get();
    return `[${settings.platformName}] ${rawSubject}`;
  } catch {
    return rawSubject;
  }
}
```

Then update each `sendXxxEmail` method to use these:

```typescript
// BEFORE (line ~32):
from: `"VIMS Events" <${fromAddress}>`,
subject: 'Verify your email',

// AFTER:
from: await this.buildFromHeader(),
subject: await this.formatSubject('Verify your email', false),
```

For OTP send (line ~28-32 area):

```typescript
from: await this.buildFromHeader(),
subject: await this.formatSubject(`Your OTP code`, true),
```

Apply this pattern to all four methods: `sendOtpEmail`, `sendVerificationEmail`, `sendInviteEmail`, `sendWelcomeEmail`.

- [ ] **Step 4: Update MailModule imports**

Modify `apps/api/src/mail/mail.module.ts`. Import `AdminModule`:

```typescript
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [AdminModule, /* existing */],
  // ...
})
```

If this creates a circular dependency (AdminModule may import MailModule), use `forwardRef`:

```typescript
imports: [forwardRef(() => AdminModule), /* existing */],
```

And in the constructor:

```typescript
constructor(
  /* ... */
  @Inject(forwardRef(() => PlatformSettingsService))
  private readonly platformSettings: PlatformSettingsService,
) {}
```

- [ ] **Step 5: Run tests, confirm pass**

```bash
npx jest src/mail/mail.service.spec.ts
```

Expected: All 4 tests pass.

- [ ] **Step 6: Manual smoke test (optional)**

Send a real test email (e.g., trigger an organiser welcome email). Confirm the From header reads `"VIMS Event Networking" <noreply@…>` and subject is `[VIMS Event Networking] Welcome to VIMS Events`.

- [ ] **Step 7: Commit**

```bash
git add apps/api/src/mail/
git commit -m "feat(api): mail from-header and subject prefix now read from PlatformSettings"
```

---

## Task 11: Layout title.template + brand text in route-group layouts

**Spec section:** §6 surfaces #3 and #4

**Files:**
- Modify: `apps/web/src/app/layout.tsx` (root)
- Modify: `apps/web/src/app/(super-admin)/layout.tsx`
- Modify: `apps/web/src/app/(organiser)/layout.tsx`

- [ ] **Step 1: Update root layout title.template**

Modify `apps/web/src/app/layout.tsx`. Convert the metadata export to a `generateMetadata` function:

```typescript
import type { Metadata } from "next";
import { cache } from "react";

interface PublicSettings {
  platformName: string;
  supportEmail: string;
  selfSignupEnabled: boolean;
}

const fetchPublicSettings = cache(async (): Promise<PublicSettings> => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/public/settings`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as PublicSettings;
  } catch {
    return {
      platformName: "VIMS Events",
      supportEmail: "admin@vimsenterprise.com",
      selfSignupEnabled: true,
    };
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchPublicSettings();
  return {
    title: {
      default: settings.platformName,
      template: `%s | ${settings.platformName}`,
    },
    description: "Event networking platform",
  };
}

// Keep the existing default export RootLayout component below
```

If a `metadata` export already exists, replace it with the `generateMetadata` function above.

- [ ] **Step 2: Replace hardcoded brand text in (super-admin) layout**

Modify `apps/web/src/app/(super-admin)/layout.tsx`. The layout currently has hardcoded text "VIMS Admin" or similar; locate it via grep:

```bash
grep -nE "VIMS Admin|VIMS Events|Super Admin Panel" apps/web/src/app/\(super-admin\)/layout.tsx
```

Since the existing layout is a Client Component, fetch via the hook:

```tsx
"use client";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

// Inside the layout component:
const { data: settings } = usePlatformSettings();

// Replace hardcoded "VIMS Admin" with:
{`${settings.platformName} Admin`}

// And any logo aria-label:
aria-label={`${settings.platformName} home`}
```

Keep the "Super Admin Panel" subtitle hardcoded — it's a role label, not a brand label.

- [ ] **Step 3: Replace hardcoded brand text in (organiser) layout**

Same approach for `apps/web/src/app/(organiser)/layout.tsx`. Find the brand text node and replace with `{settings.platformName}` via the hook.

- [ ] **Step 4: TypeScript check**

```bash
cd apps/web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual visual check**

```bash
npm run dev
```

- Open `/admin/overview` (super-admin) → header reads "VIMS Event Networking Admin" (or whatever's in DB).
- Browser tab title reads "Overview | VIMS Event Networking".
- Change Platform Name on the Settings page → wait 60s → reload → new name appears in header + tab title.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/app/layout.tsx \
        apps/web/src/app/\(super-admin\)/layout.tsx \
        apps/web/src/app/\(organiser\)/layout.tsx
git commit -m "feat(web): brand text and tab title pulled from PlatformSettings"
```

---

## Task 12: Root error.tsx + not-found.tsx with support contact

**Spec section:** §6 surface 5b

**Files:**
- Create: `apps/web/src/app/error.tsx`
- Create: `apps/web/src/app/not-found.tsx`

- [ ] **Step 1: Create not-found.tsx (Server Component, uses cached fetch)**

Create `apps/web/src/app/not-found.tsx`:

```tsx
import { cache } from "react";
import Link from "next/link";

interface PublicSettings {
  platformName: string;
  supportEmail: string;
}

const fetchSettings = cache(async (): Promise<PublicSettings> => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/public/settings`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) throw new Error();
    return await res.json();
  } catch {
    return { platformName: "VIMS Events", supportEmail: "admin@vimsenterprise.com" };
  }
});

export default async function NotFound() {
  const { supportEmail } = await fetchSettings();
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2">404</h1>
        <p className="text-slate-600 mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/" className="inline-block bg-indigo-600 text-white px-5 py-2 rounded">
          Go home
        </Link>
        <p className="text-xs text-slate-500 mt-6">
          If you believe this is an error, contact{" "}
          <a href={`mailto:${supportEmail}`} className="underline">{supportEmail}</a>.
        </p>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create error.tsx (Client Component, uses hook)**

Create `apps/web/src/app/error.tsx`:

```tsx
"use client";

import { useEffect } from "react";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { data: settings } = usePlatformSettings();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-2">Something went wrong</h1>
        <p className="text-slate-600 mb-6">
          Try again, or refresh the page. If this keeps happening, contact{" "}
          <a href={`mailto:${settings.supportEmail}`} className="underline">
            {settings.supportEmail}
          </a>
          .
        </p>
        <button
          onClick={reset}
          className="bg-indigo-600 text-white px-5 py-2 rounded"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd apps/web
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual visual check**

- Visit `/this-route-does-not-exist` → 404 page with mailto link to `supportEmail`.
- Trigger an error (temporarily throw in a page component) → error page with reset button + supportEmail.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/error.tsx apps/web/src/app/not-found.tsx
git commit -m "feat(web): add root 404 and error pages with support contact"
```

---

## Task 13: E2E tests — 3 Playwright scenarios

**Spec section:** §8 (e2e tests)

**Files:**
- Create: `apps/web/tests/e2e/platform-settings.spec.ts`

- [ ] **Step 1: Confirm Playwright config + existing test patterns**

```bash
ls apps/web/tests/e2e/ 2>&1 | head -10
cat apps/web/playwright.config.ts 2>&1 | head -30
```

Match the existing fixture/setup pattern (login helper, baseURL, etc.).

- [ ] **Step 2: Write the three scenarios**

Create `apps/web/tests/e2e/platform-settings.spec.ts`:

```typescript
import { test, expect } from "@playwright/test";

// Scenario 1: super admin saves Platform Name → persists across reload
test("super admin saves Platform Name and value persists", async ({ page }) => {
  await page.goto("/auth/super-admin/login");
  await page.fill('input[type="email"]', process.env.SUPER_ADMIN_EMAIL!);
  await page.fill('input[type="password"]', process.env.SUPER_ADMIN_PASSWORD!);
  await page.click('button:has-text("Login")');
  await page.waitForURL("**/admin/**");

  await page.goto("/admin/settings");
  const newName = `E2E Test ${Date.now()}`;
  await page.fill('input[type="text"]:near(:text("Platform Name"))', newName);
  await page.click('button:has-text("Save Settings")');
  await expect(page.locator("text=Settings saved.")).toBeVisible();

  await page.reload();
  await expect(page.locator(`input[value="${newName}"]`)).toBeVisible();
});

// Scenario 2: toggle self-signup off → public signup page shows disabled state
test("disabling self-signup shows the disabled UI on public signup page", async ({ page, request }) => {
  // Setup: log in as super admin and disable
  await page.goto("/auth/super-admin/login");
  await page.fill('input[type="email"]', process.env.SUPER_ADMIN_EMAIL!);
  await page.fill('input[type="password"]', process.env.SUPER_ADMIN_PASSWORD!);
  await page.click('button:has-text("Login")');
  await page.waitForURL("**/admin/**");
  await page.goto("/admin/settings");

  // Click the self-signup switch off
  const switchEl = page.locator('button[role="switch"]:near(:text("Allow organiser self-signup"))');
  if (await switchEl.getAttribute("aria-checked") === "true") {
    await switchEl.click();
  }
  await page.click('button:has-text("Save Settings")');
  await expect(page.locator("text=Settings saved.")).toBeVisible();

  // Visit public signup in new context (no auth) — wait for cache
  await page.waitForTimeout(2000);
  await page.goto("/auth/organiser/signup");
  await expect(page.locator("text=Organiser self-signup is currently disabled")).toBeVisible();
  await expect(page.locator("a:has-text(\"Request access\")")).toBeVisible();

  // Cleanup: re-enable
  await page.goto("/admin/settings");
  await switchEl.click();
  await page.click('button:has-text("Save Settings")');
});

// Scenario 3: API rejects setting an unbuilt flag to true with 422
test("PATCH /admin/settings rejects cardToCardQrConnections=true", async ({ request }) => {
  // Login to get token
  const loginRes = await request.post("/api/v1/auth/super-admin/login", {
    data: {
      email: process.env.SUPER_ADMIN_EMAIL,
      password: process.env.SUPER_ADMIN_PASSWORD,
    },
  });
  const { accessToken } = await loginRes.json();

  const res = await request.patch("/api/v1/admin/settings", {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { cardToCardQrConnections: true },
  });
  expect(res.status()).toBe(422);
  const body = await res.json();
  expect(JSON.stringify(body)).toMatch(/not yet available/);
});
```

- [ ] **Step 3: Run E2E tests**

```bash
cd apps/web
npx playwright test tests/e2e/platform-settings.spec.ts
```

Expected: All 3 scenarios pass.

- [ ] **Step 4: Commit**

```bash
git add apps/web/tests/e2e/platform-settings.spec.ts
git commit -m "test(web): e2e coverage for platform settings end-to-end"
```

---

## Self-review checklist (run after all tasks complete)

- [ ] Spec §3.1 (Prisma model) → Task 1 ✓
- [ ] Spec §3.2 (migration) → Task 1 ✓
- [ ] Spec §3.3 (audit logging) → Task 3 ✓
- [ ] Spec §4.1 (admin endpoints + DTO + @Equals(false)) → Tasks 4, 5 ✓
- [ ] Spec §4.2 (cache + service) → Tasks 2, 3 ✓
- [ ] Spec §4.3 (public endpoint) → Task 6 ✓
- [ ] Spec §5.1 (Settings page rewrite) → Task 8 ✓
- [ ] Spec §5.2 (signup disabled state) → Task 9 ✓
- [ ] Spec §5.3 (shared hook) → Task 7 ✓
- [ ] Spec §6 surface #1 (email From) → Task 10 ✓
- [ ] Spec §6 surface #2 (email subject) → Task 10 ✓
- [ ] Spec §6 surface #3 (browser tab title) → Task 11 ✓
- [ ] Spec §6 surface #4 (header aria-label / brand) → Task 11 ✓
- [ ] Spec §6 surface #5a (footer mailto) → **DROPPED** (no global footer; documented above)
- [ ] Spec §6 surface #5b (error pages) → Task 12 ✓
- [ ] Spec §7 (caching) → Tasks 2, 6 ✓
- [ ] Spec §8 (testing) → Tasks 2, 3, 4, 5, 6, 10, 13 ✓
- [ ] Spec §9 (rollout) — no separate task; covered by sequencing (DB migration → API deploy → web deploy)

---

## Open questions deferred to execution

1. **Exact import path of `apiClient`** — confirm during Task 5 / Task 7. Likely `@/lib/api-client` or `@/utils/api-client`.
2. **Exact `CurrentUser` decorator path** — confirm during Task 5.
3. **Global JwtAuthGuard via APP_GUARD** — handle in Task 6 Step 7 by adding a `@Public()` decorator if needed.
4. **Forward-ref between AdminModule and MailModule** — handle in Task 10 Step 4 if a circular dependency surfaces.
