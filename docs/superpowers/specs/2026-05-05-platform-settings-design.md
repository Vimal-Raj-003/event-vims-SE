# Platform Settings — Design Spec

**Date:** 2026-05-05
**Author:** Claude (collaborating with Vimal Raj)
**Status:** Approved for planning

---

## 1. Context

The Super Admin "Platform Settings" page (`/admin/settings`) currently renders a UI with platform name, support email, retention period, and four feature-flag toggles (organiser self-signup, card-to-card QR, cross-event networks, multi-language). An audit on 2026-05-05 found that **none of the page works end-to-end**:

- The form has no `useState` and no `onClick` on Save — purely static defaults.
- No GET / PATCH endpoints exist on the backend.
- No `PlatformSettings` Prisma model exists.
- No code in the codebase reads any of the flag values.

This spec covers the work required to make the page genuinely functional for the **realistically deliverable subset** (Option B from the scoping discussion):

- Persist and serve the four scalar settings (`platformName`, `supportEmail`, `dataRetentionMonths`, `allowOrganiserSelfSignup`).
- Wire `allowOrganiserSelfSignup` end-to-end.
- Wire `platformName` and `supportEmail` to five real downstream surfaces.
- Mark the three not-yet-built capabilities (`cardToCardQrConnections`, `crossEventNetworks`, `multiLanguageSupport`) honestly in the UI.
- Store `dataRetentionMonths` for future cron consumption; do not enforce yet.

Out of scope: implementing card-to-card QR, cross-event networks, multi-language i18n, or the data-retention cron itself. Each of those deserves its own spec.

---

## 2. Decisions log

| # | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | When self-signup is OFF, what does the public signup page show? | Static "disabled" page with a `mailto:` "Request access" button. Defense-in-depth: backend also returns 403. | Cleanest UX; uses `supportEmail` on a real surface. |
| Q2 | How wide is the downstream wiring of `platformName` / `supportEmail`? | Five surfaces: email From + email subject prefix + browser tab title + header `aria-label` + footer mailto + error pages. | Hits the places users actually look without sprawling into PDF/export templating. |
| Q3 | What do the three unbuilt feature toggles look like in the form? | Rendered, but disabled with a "Coming soon" pill next to the label. | Preserves visual hierarchy; signals roadmap; one CSS-prop change to enable later. |
| Q4 | What does the Retention Period field do? | Saves to DB (compliance value), with inline note that automatic purging is pending. | Lets admins configure it now so the cron picks up correct value when shipped. |

---

## 3. Data model

### 3.1 Prisma model

```prisma
model PlatformSettings {
  id                          String   @id @default("platform")
  platformName                String   @default("VIMS Event Networking") @map("platform_name")
  supportEmail                String   @default("admin@vimsenterprise.com") @map("support_email")
  dataRetentionMonths         Int      @default(12) @map("data_retention_months")
  allowOrganiserSelfSignup    Boolean  @default(true) @map("allow_organiser_self_signup")
  cardToCardQrConnections     Boolean  @default(false) @map("card_to_card_qr_connections")
  crossEventNetworks          Boolean  @default(false) @map("cross_event_networks")
  multiLanguageSupport        Boolean  @default(false) @map("multi_language_support")
  updatedAt                   DateTime @updatedAt @map("updated_at")
  updatedBy                   String?  @map("updated_by")

  @@map("platform_settings")
}
```

Singleton row enforced by:
- Fixed primary key `"platform"`.
- Service layer always uses `findUniqueOrThrow({ where: { id: "platform" } })` and `update({ where: { id: "platform" }, ... })` — never `findFirst` / list / create.
- Migration seeds the row on creation.

### 3.2 Migration

New timestamped migration on top of the squashed `_init`:
`apps/api/prisma/migrations/<TS>_platform_settings/migration.sql`

Two statements:
```sql
CREATE TABLE "platform_settings" ( ... );
INSERT INTO "platform_settings" ("id", "updated_at") VALUES ('platform', CURRENT_TIMESTAMP)
  ON CONFLICT ("id") DO NOTHING;
```

### 3.3 Audit logging

Each successful `updatePlatformSettings` call writes one row to the existing `audit_logs` table:

```ts
{
  action: "platform_settings.update",
  actorId: <super_admin id from JWT>,
  actorRole: "SUPER_ADMIN",
  entityType: "PlatformSettings",
  entityId: "platform",
  metadata: { changed: ["platformName","allowOrganiserSelfSignup"], before: {...}, after: {...} }
}
```

`metadata.before` and `metadata.after` only include the fields that changed — keeps the audit row tight and avoids logging unchanged values.

---

## 4. API endpoints

### 4.1 Private (super-admin only)

Live in `apps/api/src/admin/admin.controller.ts` under existing `@UseGuards(JwtAuthGuard, RolesGuard) @Roles('SUPER_ADMIN')` patterns.

```
GET   /admin/settings    → 200 PlatformSettingsResponseDto
PATCH /admin/settings    → 200 PlatformSettingsResponseDto
                            422 ValidationError
                            401/403 if not super admin
```

**Update DTO** — `apps/api/src/admin/dto/update-platform-settings.dto.ts`:

```ts
export class UpdatePlatformSettingsDto {
  @IsString() @IsOptional() @MinLength(1) @MaxLength(100)
  platformName?: string;

  @IsEmail() @IsOptional()
  supportEmail?: string;

  @IsInt() @IsOptional() @Min(1) @Max(120)
  dataRetentionMonths?: number;

  @IsBoolean() @IsOptional()
  allowOrganiserSelfSignup?: boolean;

  // Three unbuilt flags — accepted in payload (so the form can submit
  // the full state) but rejected if set to true. Until the underlying
  // feature ships, these must remain false.
  @IsBoolean() @IsOptional() @Equals(false, { message: "cardToCardQrConnections is not yet available" })
  cardToCardQrConnections?: boolean;

  @IsBoolean() @IsOptional() @Equals(false, { message: "crossEventNetworks is not yet available" })
  crossEventNetworks?: boolean;

  @IsBoolean() @IsOptional() @Equals(false, { message: "multiLanguageSupport is not yet available" })
  multiLanguageSupport?: boolean;
}
```

The `@Equals(false)` guard is the API-level equivalent of the disabled UI toggle. Even if a client bypasses the disabled control, the API rejects.

### 4.2 Service methods (in `admin.service.ts`)

```ts
getPlatformSettings(): Promise<PlatformSettings>
updatePlatformSettings(dto: UpdatePlatformSettingsDto, actorId: string): Promise<PlatformSettings>
```

Both are wrapped by a small `PlatformSettingsCache` (in-memory, TTL 60s). `update` invalidates the cache after writing and after audit log creation.

### 4.3 Public endpoint

New small controller `apps/api/src/public/public-settings.controller.ts`:

```
GET /public/settings    → 200 { platformName, supportEmail, selfSignupEnabled }
                          Cache-Control: public, max-age=60
```

No auth. Returns a deliberately narrow shape — never the full settings object — so internal config doesn't leak. Used by:

- Public organiser signup page (gate render).
- Web app root layout (browser title template, header, footer).
- Error pages (404 / 500).

The public response is also served from the same `PlatformSettingsCache` to avoid extra DB load.

---

## 5. Frontend changes

### 5.1 Settings page — `apps/web/src/app/(super-admin)/admin/settings/page.tsx`

Full rewrite from static shell to functional. Data-fetching pattern matches whatever the rest of the super-admin pages use (TanStack Query / SWR / direct fetch — confirm during planning before coding; this spec stays library-agnostic).

Behavior:

- **On mount:** `GET /admin/settings`, prefill all fields.
- **State:** single form-values object mirroring the DTO. `isDirty` derived by deep-equal vs last-loaded values.
- **Save Settings button:** disabled when `!isDirty || isSaving`. Sends only changed fields (smaller diffs in audit log). On success → toast + refetch; on error → toast with server message, no field reset.
- **Three "Coming soon" toggles** (Q3): rendered with `disabled` + small `<Badge>Coming soon</Badge>` next to label. Switch visually greyed.
- **Retention field** (Q4): editable. Inline helper text below input: *"Saved. Automatic purging will activate in a future release."*
- **Footer:** muted line below the Save row: *"Last updated by {updatedBy ?? 'system'} on {updatedAt}"*. From the same GET response — no extra round-trip.

### 5.2 Organiser signup page — public route (path confirmed during planning)

- **On mount:** `GET /public/settings`. 60s client cache.
- **If `selfSignupEnabled === true`:** existing form unchanged.
- **If `selfSignupEnabled === false`:** new disabled state (Q1):
  - Heading: *"Organiser self-signup is currently disabled"*
  - Body: *"To request an organiser account, please contact us — we'll get you set up."*
  - **Primary CTA:** *"Request access"* → `mailto:${supportEmail}?subject=Organiser%20account%20request%20—%20${platformName}&body=...`
  - **Secondary link:** *"Already have an account? Sign in"* → `/organiser/login`
- **Defense in depth:** if the form does render (network race / stale cache), submission gets a 403 from the backend and surfaces a toast. The disabled message is not double-rendered.

### 5.3 Shared hook

`apps/web/src/hooks/use-public-settings.ts` — single fetch hook used by every public-facing client component that needs branding (signup page, error.tsx). Server Components fetch directly with React `cache()`.

---

## 6. Downstream wiring — five surfaces

| # | Surface | Layer | File | Reads from |
|---|---|---|---|---|
| 1 | Email "From" display name | Backend | `apps/api/src/mail/mail.service.ts` | `PlatformSettingsCache` |
| 2 | Email subject prefix | Backend | `apps/api/src/mail/mail.service.ts` | `PlatformSettingsCache` |
| 3 | Browser tab title template | Frontend (server) | `apps/web/src/app/layout.tsx` | `GET /public/settings` via React `cache()` |
| 4 | Header logo `aria-label` | Frontend (server or client — TBC during planning) | `<TopNav>` / `<Header>` component | Same cached fetch as #3 |
| 5a | Footer "Contact support" mailto | Frontend (server) | `<Footer>` component | Same cached fetch as #3 |
| 5b | 404 / 500 error pages | Frontend (mixed) | `app/not-found.tsx` (server) + `app/error.tsx` (client via hook) | Cached fetch / `usePublicSettings()` |

### Surface details

**1 — Email From display name:** `from: \`${settings.platformName} <${env.EMAIL_FROM_ADDRESS}>\``. Fallback to `"VIMS Events"` if the cached read throws — transactional emails must never fail because of a settings read.

**2 — Email subject prefix:** wrapper in MailService prepends `[${platformName}] ` to all transactional subjects EXCEPT OTP emails. OTP subjects stay short to maximise mobile preview real estate.

**3 — Browser tab title:** Next.js `metadata.title.template` in root layout: `\`%s | ${platformName}\``. Per-page `title: "Settings"` then renders as `Settings | VIMS Event Networking`. Fallback template `"%s | VIMS"` if the public settings fetch fails.

**4 — Header `aria-label`:** `aria-label={\`${platformName} home\`}`.

**5a — Footer:** `<a href={\`mailto:${supportEmail}\`}>Contact support</a>`.

**5b — Error pages:** both 404 and 500 render *"If this keeps happening, contact `{supportEmail}`."* `not-found.tsx` is a Server Component (uses cached fetch). `error.tsx` is a Client Component (uses `usePublicSettings()` hook).

---

## 7. Caching summary

| Layer | Strategy | TTL |
|---|---|---|
| Backend `PlatformSettingsCache` | Per-process in-memory Map with timestamp | 60s |
| HTTP `Cache-Control` on `GET /public/settings` | `public, max-age=60` | 60s |
| Next.js Server Component fetch | React `cache()` per request + `next: { revalidate: 60 }` | 60s |

Settings change rarely. 60s lag from save → public surfaces is acceptable. Cache-busting on write is internal to the backend (private GET) but not propagated to public clients — they pick up changes within the next minute. This is documented in the Settings page UI: small text below Save button — *"Public surfaces (footer, emails) reflect changes within a minute."*

---

## 8. Testing approach (high level — details in implementation plan)

- **Unit:** `PlatformSettingsService` get/update; cache invalidation on write; audit-log delta calculation.
- **Integration (NestJS):** GET / PATCH endpoints — auth gating, validation rejects (`@Equals(false)` for unbuilt flags), full request → audit log row written.
- **End-to-end (Playwright, mirror existing patterns):**
  - Super admin saves Platform Name → reload page → value persisted → audit log shows entry.
  - Toggle `allowOrganiserSelfSignup` off → public signup page shows disabled state with mailto.
  - Try to PATCH `cardToCardQrConnections: true` directly → 422.
- **Manual smoke:** Email "From" displays new platform name after save (Mailhog / Zoho test inbox).

---

## 9. Rollout

The change is additive: a new model, new endpoints, no schema breaks. Steps:

1. Apply migration (creates table + seeds singleton row with current hard-coded defaults).
2. Deploy API.
3. Deploy web (Settings page now works, public surfaces start reading from `/public/settings`).
4. Existing behaviour is preserved because the seed row's defaults match what was hardcoded.

No data backfill or maintenance window needed. Rollback = revert deployments + drop the new table (no other code references it). Existing `audit_logs` rows referencing the table aren't a problem — `audit_logs.entity_id` is a free-form TEXT field with no foreign key.

---

## 10. Open items (resolve during planning, not blocking design approval)

- **Frontend data-fetching library:** confirm whether the codebase uses TanStack Query, SWR, or direct fetch. Match the existing pattern.
- **Exact path of the public organiser signup page:** likely `apps/web/src/app/(public)/organiser/signup/page.tsx` but will verify.
- **Header / Footer component locations:** confirm during planning before editing.
- **Whether `error.tsx` already exists or needs to be created:** check before adding 404/500 wiring.

These are file-location lookups, not architecture decisions. They get resolved in the writing-plans pass and don't block this design.
