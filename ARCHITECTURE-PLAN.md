# Event Networking Platform — Complete Architectural Plan

**Version:** 1.0
**Date:** 29 April 2026
**For:** Gowthamraj M, VIMS Enterprise
**Scope:** Full-stack architecture from frontend to backend, landing page to deployment

---

## Context

The PRD (25-page document) defines a **multi-tenant PWA** for live event contact exchange and digital business cards. The platform replaces paper visiting cards at business events. Three user roles (Super Admin / Event Organiser / Attendee) interact through privacy-first connection flows. The database is already provisioned on Neon (serverless PostgreSQL 16, us-east-1). This plan covers every requirement from the PRD — nothing is omitted.

---

## 1. System Architecture Overview

```
+---------------------------------------------------------------+
|                        CLIENT LAYER                            |
|  Next.js 14 App Router PWA (Vercel Edge Network CDN)          |
|  - Landing/Public Pages (SSG)                                 |
|  - Organiser Dashboard (CSR + SSR hybrid)                     |
|  - Attendee App (CSR + PWA offline shell)                     |
|  - Super Admin Panel (CSR + SSR hybrid)                       |
+-----------------------------+---------------------------------+
                              |
                        HTTPS / TLS 1.3
                              |
+-----------------------------v---------------------------------+
|                     API GATEWAY LAYER                          |
|  Cloudflare (DNS + WAF + Rate Limiting + DDoS)                |
+-----------------------------+---------------------------------+
                              |
+-----------------------------v---------------------------------+
|                    BACKEND API LAYER                            |
|  NestJS (TypeScript) on Railway/Render                        |
|  - RESTful JSON API                                           |
|  - JWT Auth Guards                                            |
|  - Request-scoped Tenant Context (nestjs-cls)                 |
|  - Prisma Client Extensions with RLS session injection        |
+-----------------------------+---------------------------------+
                              |
          +-------------------+-------------------+
          |                   |                   |
+---------v--------+ +-------v-------+ +---------v---------+
|   PostgreSQL 16   | |  S3 / R2      | |  Resend / SES     |
|  (Neon Serverless)| |  (File Storage)| |  (Email + OTP)    |
|  RLS-enabled      | |  CDN-backed   | |                   |
+-------------------+ +---------------+ +-------------------+
          |
          +-------------------+-------------------+
                              |
+-----------------------------v---------------------------------+
|                     SHARED SERVICES                            |
|  - Sentry (Error Monitoring)                                  |
|  - Better Stack / Grafana Cloud (Uptime + Logs)               |
|  - GitHub Actions (CI/CD)                                     |
+---------------------------------------------------------------+
```

### Request Flow

1. Client makes HTTPS request to `app.vims-events.com`
2. Cloudflare: DNS, WAF filtering, rate limiting
3. Static/SSG pages from Vercel Edge CDN. API routes on NestJS backend
4. NestJS middleware extracts JWT, resolves tenant context, stores in `nestjs-cls`
5. Prisma Client Extension calls `set_config('app.current_event_id', ...)` before each query
6. PostgreSQL RLS policies enforce row filtering at the database level
7. Files (photos, logos, banners) go to R2 via presigned URLs

---

## 2. Frontend Architecture

### Framework

**Next.js 14 App Router** with TypeScript. Single Next.js project with four UI surfaces via route groups. PWA via **Serwist** (production-grade successor to next-pwa with App Router support).

### Route Structure

```
app/
  (public)/                          # Landing + auth, no auth required
    page.tsx                         # Landing page
    pricing/page.tsx                 # Pricing section
    about/page.tsx                   # About VIMS Enterprise
    contact/page.tsx                 # Contact form
    auth/
      organiser/
        signup/page.tsx              # Organiser self-signup form
        verify/page.tsx              # Email OTP verification
        login/page.tsx               # Organiser password + OTP login
      attendee/
        register/page.tsx            # Attendee registration (scoped to event)
        verify/page.tsx              # Attendee OTP verification
      layout.tsx                     # Auth layout (centered card, no nav)

  (organiser)/                       # Organiser dashboard, auth required
    layout.tsx                       # Sidebar + topbar layout
    dashboard/
      page.tsx                       # Dashboard home (event cards, stats)
    events/
      page.tsx                       # Event list
      new/page.tsx                   # 4-step wizard
      [eventId]/
        page.tsx                     # Event detail: live stats
        attendees/page.tsx           # Attendee table
        announcements/page.tsx       # Announcement composer + history
        settings/page.tsx            # Edit branding, details, QR download
        export/page.tsx              # Excel export trigger
    notifications/page.tsx           # Organiser notification inbox

  (attendee)/                        # Attendee app, event-scoped auth
    layout.tsx                       # Bottom tab bar layout (mobile-first)
    e/[eventSlug]/
      page.tsx                       # Event branded welcome/register
    directory/
      page.tsx                       # Attendee directory with search/filters
    card/
      page.tsx                       # "My Card" — digital business card view
    connections/
      page.tsx                       # Sent/received connection requests
    requests/
      page.tsx                       # Incoming requests (accept/decline)
    settings/
      page.tsx                       # Edit profile, download data, request deletion

  (super-admin)/                     # Super Admin panel
    layout.tsx                       # Admin sidebar layout
    overview/page.tsx                # Platform-wide analytics
    organisers/
      page.tsx                       # Organiser list (manage, suspend)
    events/
      page.tsx                       # Cross-event search/list
      [eventId]/page.tsx             # Event detail (read-only)
    deletion-requests/
      page.tsx                       # DPDP deletion queue
    audit-log/
      page.tsx                       # Audit log search/filter
    settings/page.tsx                # Platform config
```

### PWA Configuration (Serwist)

Service worker caching strategies:
- **App shell:** CacheFirst — layout files, CSS, core JS
- **Directory pages:** StaleWhileRevalidate — works on flaky venue Wi-Fi
- **API responses:** NetworkFirst with 30-second timeout
- **Static assets:** CacheFirst, 30-day expiry

Manifest at `app/manifest.ts`:
- `name`: "VIMS Event Networking"
- `short_name`: "VIMS Events"
- `display`: "standalone"
- `theme_color`: "#4F46E5" (VIMS brand)

### State Management

- **Server state:** TanStack Query v5. Query keys: `['events', eventId, 'attendees', filterParams]`. Stale time: 30s for live data, 5 min for profile data.
- **Local UI state:** Three Zustand stores:
  - `useAuthStore` — JWT tokens, user role, event context, organiser ID
  - `useFilterStore` — Directory search/filters (persisted to localStorage)
  - `useUIStore` — Sidebar, active tab, modals, toasts

### Component Hierarchy

```
components/
  ui/                    # shadcn/ui primitives
  shared/
    Header.tsx, Sidebar.tsx, BottomNav.tsx
    Avatar.tsx, BrandProvider.tsx, QrScanner.tsx
  landing/
    Hero.tsx, Features.tsx, Testimonials.tsx, CTA.tsx, Footer.tsx
  organiser/
    EventCard.tsx, EventWizard/{StepBasics, StepBranding, StepFields, StepRules}.tsx
    LiveStats.tsx, AttendeeTable.tsx, AnnouncementComposer.tsx
  attendee/
    DirectoryCard.tsx, DirectoryFilters.tsx, BusinessCard.tsx
    ConnectionRequestCard.tsx, VCardDownload.tsx
  admin/
    PlatformStats.tsx, OrganiserRow.tsx, DeletionRequestCard.tsx, AuditLogTable.tsx
```

---

## 3. Backend Architecture (NestJS)

### Module Structure

```
src/
  main.ts
  app.module.ts
  config/                     # Typed env config via @nestjs/config
  prisma/                     # PrismaService + RLS Client Extension
  auth/                       # OTP, JWT, signup/login controllers + services
    guards/                   # jwt-auth, roles, otp-rate-limit
    strategies/               # JWT strategy
    decorators/               # @Roles(), @CurrentUser()
  organisers/                 # Organiser CRUD
  events/                     # Event CRUD + publish + live stats
  qr/                         # QR generation (PNG 300 DPI + SVG) + resolution
  attendees/                  # Attendee registration + profile
  directory/                  # Search + filter query builder
  connections/                # Connection lifecycle + anti-spam guard
  announcements/              # Broadcast + delivery reports
  notifications/              # Web Push (VAPID) + email (Resend)
  storage/                    # S3/R2 presigned URL generation
  export/                     # Excel generation via exceljs
  admin/                      # Super Admin endpoints
  audit/                      # Append-only audit log + interceptor
  compliance/                 # Right to access + right to erasure
  vcard/                      # vCard 3.0 generation
  health/                     # Readiness/liveness probes
```

### Complete API Endpoint Catalogue

**Authentication**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/organiser/signup` | Public | Create organiser account |
| POST | `/api/v1/auth/organiser/verify-email` | Public | Verify email with OTP |
| POST | `/api/v1/auth/organiser/login` | Public | Password login, triggers OTP |
| POST | `/api/v1/auth/organiser/verify-login` | Public | Verify login OTP |
| POST | `/api/v1/auth/attendee/request-otp` | Public | Request OTP (email + eventSlug) |
| POST | `/api/v1/auth/attendee/verify-otp` | Public | Verify OTP, returns JWT pair |
| POST | `/api/v1/auth/refresh` | Refresh token | Exchange refresh for new access |
| POST | `/api/v1/auth/logout` | Access token | Invalidate refresh token |

**Events**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/events` | Organiser | Create event (draft) |
| GET | `/api/v1/events` | Organiser | List own events |
| GET | `/api/v1/events/:eventId` | Organiser | Get event detail |
| PATCH | `/api/v1/events/:eventId` | Organiser | Update event |
| POST | `/api/v1/events/:eventId/publish` | Organiser | Publish + generate QR |
| DELETE | `/api/v1/events/:eventId` | Organiser | Request deletion |
| GET | `/api/v1/events/:eventId/stats` | Organiser | Live stats (30s polling) |

**Attendees**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/events/:eventSlug/register` | Public | Register attendee profile |
| GET | `/api/v1/events/:eventId/attendees` | Organiser | List all attendees |
| GET | `/api/v1/attendees/me` | Attendee | Get own profile |
| PATCH | `/api/v1/attendees/me` | Attendee | Update own profile |
| GET | `/api/v1/attendees/me/card` | Attendee | Get digital business card data |
| GET | `/api/v1/attendees/:attendeeId/vcard` | Attendee (connected) | Download vCard |

**Directory**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/events/:eventId/directory` | Attendee | Search/filter directory |

**Connections**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/events/:eventId/connections` | Attendee | Send connection request |
| GET | `/api/v1/events/:eventId/connections` | Attendee | List own connections |
| GET | `/api/v1/events/:eventId/connections/requests` | Attendee | List incoming requests |
| PATCH | `/api/v1/events/:eventId/connections/:id/accept` | Attendee | Accept request |
| PATCH | `/api/v1/events/:eventId/connections/:id/decline` | Attendee | Decline request |
| PATCH | `/api/v1/events/:eventId/connections/:id/withdraw` | Attendee | Withdraw sent request |

**Announcements**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/events/:eventId/announcements` | Organiser | Send announcement |
| GET | `/api/v1/events/:eventId/announcements` | Organiser | Announcement history |

**Export**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/events/:eventId/export` | Organiser | Download Excel (.xlsx) |

**Storage**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/storage/presign` | Authenticated | Get presigned upload URL |

**Super Admin**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/admin/organisers` | Super Admin | List all organisers |
| PATCH | `/api/v1/admin/organisers/:id/suspend` | Super Admin | Suspend organiser |
| PATCH | `/api/v1/admin/organisers/:id/reactivate` | Super Admin | Reactivate organiser |
| GET | `/api/v1/admin/events` | Super Admin | Cross-event list |
| GET | `/api/v1/admin/events/:eventId` | Super Admin | Event detail |
| DELETE | `/api/v1/admin/events/:eventId` | Super Admin | Hard-delete event |
| GET | `/api/v1/admin/deletion-requests` | Super Admin | List deletion requests |
| PATCH | `/api/v1/admin/deletion-requests/:id` | Super Admin | Approve/reject deletion |
| GET | `/api/v1/admin/audit-log` | Super Admin | Search audit log |
| GET | `/api/v1/admin/analytics` | Super Admin | Platform-wide stats |

**Compliance**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/attendees/me/data-export` | Attendee | Download own data as JSON |
| POST | `/api/v1/attendees/me/request-deletion` | Attendee | Submit erasure request |

**QR Resolution**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/qr/:eventSlug-:shortHash` | Public | Resolve QR to event registration page |

**Push Subscriptions**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/push/subscribe` | Attendee | Register push subscription |

### Middleware Stack (Execution Order)

1. **Helmet** — Security headers (CSP, X-Frame-Options, HSTS)
2. **Compression** — gzip responses
3. **Rate Limiter** — `@nestjs/throttler`: 100/min public, 1000/min authenticated
4. **Request Logger** — Pino structured JSON logs
5. **Tenant Middleware** — Extracts organiser_id/event_id from JWT, stores in `nestjs-cls`
6. **Audit Interceptor** — Mutating requests logged to `audit_logs`
7. **JWT Auth Guard** — Validates access token
8. **Roles Guard** — Checks `@Roles()` decorator against JWT role claim
9. **Prisma RLS Extension** — `set_config()` calls before each query

---

## 4. Database Architecture

### Complete Prisma Schema

**Core models:** SuperAdmin, Organiser, Event, EventFieldConfig, EventRule, Attendee, ConnectionRequest, Announcement, AuditLog, DataDeletionRequest, OtpVerification, RefreshToken, PushSubscription

**Key design decisions:**
- Every attendee/connection/announcement row carries `event_id` for RLS scoping
- `@@unique([eventId, email])` on Attendee prevents duplicate registration per event
- Same person at two events = two separate rows (multi-tenant isolation)
- JSON fields for `services` and `tags` with GIN indexes for array containment queries
- All connection requests have `@@unique([eventId, senderId, receiverId])`

### RLS Policies (Critical Security Layer)

```sql
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_field_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rules ENABLE ROW LEVEL SECURITY;

-- Organiser sees only own events
CREATE POLICY organiser_own_events ON events
  FOR ALL USING (organiser_id = current_setting('app.current_organiser_id', true)::text);

-- Event-scoped tables
CREATE POLICY event_scoped_attendees ON attendees
  FOR ALL USING (event_id = current_setting('app.current_event_id', true)::text);

-- Super Admin bypass
CREATE POLICY super_admin_bypass ON events
  FOR ALL USING (current_setting('app.is_super_admin', true)::boolean = true);
-- (repeat for each tenant-scoped table)
```

### Prisma RLS Client Extension

File: `src/prisma/prisma-rls.extension.ts` — bridges nestjs-cls tenant context to PostgreSQL `set_config()` calls before every query.

### Database Roles (Least Privilege)

- `app_read` — SELECT on all tables
- `app_write` — INSERT, UPDATE on business tables; SELECT on all
- `app_admin` — Full DML; used for migrations
- Application NEVER connects as `neondb_owner`

### Indexing Strategy

- Composite: `attendees(eventId, businessType, industry, city)` — common filter combo
- GIN: `attendees.services`, `attendees.tags` — JSONB array containment
- Partial: `connection_requests(eventId, status) WHERE status = 'PENDING'`
- BRIN: `audit_logs(createdAt)` — append-only time-series

---

## 5. Authentication & Authorization

### JWT Token Design

**Access Token (15-min TTL):**
```json
{
  "sub": "cuid_xxx",
  "role": "attendee | organiser | super_admin",
  "email": "user@example.com",
  "eventId": "cuid_yyy",
  "attendeeId": "cuid_zzz",
  "organiserId": "cuid_www"
}
```

**Refresh Token (7-day TTL):** SHA-256 hash stored in `refresh_tokens` table. Rotation on use. Revoked on logout.

### Auth Flows

**Organiser:** Password + email OTP (two-factor). bcrypt work factor 12.

**Attendee:** Passwordless OTP only. 6-digit code, SHA-256 hashed, single-use, 10-min TTL, rate-limited to 3 per email per hour. Resend button after 30s.

### RBAC (Three Layers)

1. NestJS Guards — `@Roles()` decorator on controllers
2. Tenant Middleware — populates `nestjs-cls` from JWT
3. Database RLS — even bypassed application cannot leak cross-tenant data

---

## 6. Multi-Tenancy Strategy

### Two Tenant Dimensions

- **Organiser tenant:** Organiser sees only own events/data
- **Event tenant:** All operations within an event are scoped to that event

### Isolation Guarantees

1. **Database:** RLS policies on every tenant-scoped table
2. **Application:** JWT contains exactly one eventId (attendee) or organiserId
3. **API:** Every `:eventId` route validates ownership
4. **QR binding:** `shortHash` unique per event, server-side validated

### Super Admin Cross-Tenant Access

- Sets `app.is_super_admin = true` in session
- Every cross-tenant read logged to `audit_logs`
- Never writes directly to tenant data

---

## 7. QR Code System

### Generation (on event publish)

1. Generate `slug` from event name (lowercased, hyphenated, deduplicated)
2. Generate `shortHash` — 8 cryptographically random alphanumeric chars
3. Construct URL: `https://app.vims-events.com/e/{slug}-{shortHash}`
4. Generate PNG (300 DPI, 1024x1024) + SVG via `qrcode` npm package
5. Upload to R2 at `events/{eventId}/qr/`
6. QR is **immutable** for event lifetime — print once, use throughout

### Resolution Flow

1. Attendee scans QR → browser opens URL
2. Next.js catches route at `app/(public)/e/[eventSlug]/page.tsx`
3. API validates slug + shortHash against `events` table
4. If PUBLISHED and not ended: return event branding + registration page
5. Critical: QR from Event A **can never** resolve to Event B

### Card-to-Card QR (Phase 3)

Each attendee's business card embeds a QR encoding: `https://app.vims-events.com/connect/{eventId}/{attendeeId}`. Scan by another attendee in the same event triggers instant connection request.

---

## 8. Notifications

### Web Push (VAPID)

- VAPID key pair stored as env vars
- Push subscriptions stored in `push_subscriptions` table
- Payload encrypted per Web Push protocol
- Used for: connection requests, acceptances, announcements

### Email (Resend)

Templates: OTP, connection-request, connection-accepted, announcement, organiser-welcome, deletion-status

### In-App Notifications

- `notifications` table: id, userId, eventType, title, body, isRead, createdAt
- Polled every 30 seconds via TanStack Query during active sessions

---

## 9. File Storage

**Cloudflare R2** (zero egress fees, S3-compatible).

**Upload Flow:** Client requests presigned PUT URL → uploads directly to R2 → confirms with backend.

**Paths:** `events/{id}/logo/`, `events/{id}/banner/`, `events/{id}/qr/`, `attendees/{id}/photo/`, `attendees/{id}/company-logo/`

**Validation:** PNG/JPG/JPEG only. 2 MB for logos, 5 MB for banners. Client-side validation before upload.

---

## 10. Deployment Architecture

### Infrastructure Map

```
GitHub Repo → GitHub Actions
  → Vercel (Next.js frontend, auto-deploy on main)
  → Railway (NestJS backend, Docker-based)
  → Neon (PostgreSQL, already provisioned)
  → Cloudflare R2 (file storage)
  → Resend (email)
  → Sentry (errors) + Better Stack (uptime)
```

### Environments

| Env | Frontend | Backend | Database |
|-----|----------|---------|----------|
| Dev | localhost:3000 | localhost:4000 | Neon dev branch |
| Staging | staging.app.vims-events.com | staging-api... | Neon staging branch |
| Prod | app.vims-events.com | api.vims-events.com | Neon production (us-east-1) |

### CI/CD (GitHub Actions)

**On PR:** lint → type-check → test → build → preview deploy
**On merge:** all checks → Docker build → Railway deploy → Vercel auto-deploy → Prisma migrate deploy → smoke test

---

## 11. Security Architecture

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Cross-tenant data leak | RLS + app guards + JWT scoping |
| OTP brute force | 6-digit + 3 attempts + rate limiting |
| Connection spam | Auto-pause at 50 req/hr + organiser review |
| JWT theft | 15-min TTL + refresh rotation + httpOnly cookies |
| SQL injection | Prisma parameterized queries |
| XSS | React auto-escape + CSP headers |
| CSRF | SameSite cookies + CSRF tokens |
| File upload attack | Presigned URLs + type/size validation |
| DDoS | Cloudflare WAF + rate limiting + autoscaling |

### DPDP Compliance Implementation

1. **Consent:** Mandatory checkbox at registration. Timestamp in `attendees.consentedAt`
2. **Right to access:** `GET /attendees/me/data-export` returns JSON of all data
3. **Right to erasure:** `POST /attendees/me/request-deletion` → Super Admin approves → 30-day soft delete → hard delete
4. **Purpose limitation:** Data used only for event networking
5. **Storage limitation:** 12-month retention post-event, automated cleanup
6. **Audit trail:** All admin actions in immutable `audit_logs`

---

## 12. Landing Page Design

Route: `app/(public)/page.tsx` — fully SSG, zero client-side data fetching.

**Sections:**
1. Hero — "Transform Every Event Into a Professional Network" + CTA
2. How It Works — 3 steps: Create QR → Scan & Register → Connect
3. Features — 6 cards: Digital Cards, Privacy-First, Live Dashboard, Smart Directory, Excel Export, DPDP Compliant
4. For Attendees — Phone mockup showing business card + directory
5. For Organisers — Dashboard preview + stats
6. Pricing — Free during launch / "Contact us" CTA
7. Footer — "Powered by VIMS Enterprise" (non-removable), privacy, terms, contact

**Performance target:** LCP < 1.5s, Lighthouse > 95

---

## 13. Development Phases

### Phase 1: MVP (Weeks 1–6)

**Sprint 1-2: Foundation**
- Monorepo setup (Turborepo, CI/CD, linting)
- Database schema (Prisma, RLS policies, migrations)
- Auth system (OTP, JWT, organiser signup/login)
- Landing page (SSG)
- NestJS scaffold with all modules stubbed

**Sprint 3-4: Core Features**
- Event creation wizard (4-step form)
- QR code generation + download (PNG, SVG)
- Attendee registration via QR scan
- Digital business card auto-generation
- Attendee directory with search + filters
- Connection request flow (send/accept/decline/withdraw)
- Phone/email reveal logic

**Sprint 5-6: Dashboard + Polish**
- Organiser dashboard (live stats, attendee list, Excel export)
- Super Admin panel (organiser list, events, audit log)
- In-app notifications + email
- PWA setup (Serwist, manifest, offline shell)
- DPDP consent capture
- E2E testing with Playwright

### Phase 2: Operational Polish (Weeks 7–10)

- Per-event field configuration wizard
- Announcement broadcasting + delivery reports
- Additional filters (Company Size, Tags)
- Anti-spam (auto-pause, flag/report)
- Event deletion workflow with Super Admin approval
- Right-to-Erasure self-service
- Data export (JSON) for attendees
- Audit log search/filter
- Accessibility audit (WCAG 2.1 AA)

### Phase 3: Scale & Insight (Weeks 11–14)

- Performance hardening (read replicas, edge caching, virtualized lists)
- Advanced analytics (engagement heatmaps, peak hours)
- Card-to-card QR scan for instant connection
- Bulk attendee import
- Cross-event "My Networks" view (opt-in)
- Multi-language (English + Tamil + Hindi)
- Load testing at 5,000 concurrent users
- Security penetration test

---

## 14. Monorepo Structure

```
event-ORGANIZATION/
  .github/workflows/           # CI/CD pipelines
  apps/
    web/                        # Next.js 14 frontend
      src/app/                  # Route groups (see Section 2)
      src/components/           # Shared + domain components
      src/hooks/                # useAuth, useDirectory, useConnections
      src/lib/                  # API client, query client, Zustand stores
      src/types/                # API response types
      src/utils/                # vCard generation, formatting
      public/                   # PWA icons, static images
    api/                        # NestJS backend
      src/                      # All modules (see Section 3)
      prisma/                   # schema.prisma, migrations, seed.ts
  packages/
    shared/                     # Shared types, constants, Zod validators
  infrastructure/
    docker-compose.yml          # Local dev services
    Dockerfile.api              # Backend Docker image
  docs/                         # Architecture, API reference, runbook
  turbo.json                    # Turborepo config
  package.json                  # Root workspaces
  .env.example                  # Env var template
```

---

## 15. Performance Strategy

### Frontend
- SSG landing page (zero client fetch, instant load)
- ISR for event pages (`revalidate: 60`)
- Virtualized lists (`@tanstack/react-virtual`) for directories > 100 items
- `next/image` auto WebP + lazy loading + responsive srcsets
- Route-based code splitting (App Router automatic)
- 200 KB first-load JS budget per route
- PWA offline shell for flaky venue Wi-Fi

### Backend
- Neon PgBouncer connection pooling
- Indexed directory queries (composite + GIN + partial)
- PostgreSQL `pg_trgm` for sub-500ms fuzzy search
- gzip response compression
- Phase 3: Redis caching (30s TTL for directory during live events)

### CDN & Edge
- Vercel Edge Network (300+ PoPs) for static assets + SSG pages
- Cloudflare CDN for R2 media
- Cache headers: static=immutable, API=no-cache, SSG=60s+stale-while-revalidate=300s

### Scalability Path (to 50 events, 5,000 attendees each)
1. Neon read replicas for directory queries
2. Redis caching for hot data
3. Horizontal scaling (stateless NestJS + JWT)
4. Queue-based email dispatch (BullMQ + Redis)
5. PgBouncer handles up to 10,000 connections

---

## Appendix A: Environment Variables

```
DATABASE_URL=postgresql://app_write:xxx@ep-shy-frog-am8fc2il-pooler...
DATABASE_URL_DIRECT=postgresql://app_admin:xxx@ep-shy-frog-am8fc2il...
JWT_SECRET=xxx
JWT_REFRESH_SECRET=xxx
RESEND_API_KEY=re_xxx
R2_ACCOUNT_ID=xxx / R2_ACCESS_KEY_ID=xxx / R2_SECRET_ACCESS_KEY=xxx
R2_BUCKET_NAME=vims-events-media
R2_PUBLIC_URL=https://storage.vims-events.com
VAPID_PUBLIC_KEY=xxx / VAPID_PRIVATE_KEY=xxx
VAPID_SUBJECT=mailto:admin@vims-enterprise.com
SENTRY_DSN=https://xxx@sentry.io/xxx
BETTER_STACK_SOURCE_TOKEN=xxx
NEXT_PUBLIC_APP_URL=https://app.vims-events.com
API_BASE_URL=https://api.vims-events.com
```

## Appendix B: Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monorepo vs polyrepo | Turborepo monorepo | Shared types, single CI, atomic commits |
| RLS vs app-level filtering | PostgreSQL RLS | Defense in depth; compromised app can't leak data |
| Presigned URLs vs proxied uploads | Presigned URLs | No backend bottleneck; direct-to-R2 |
| OTP over password for attendees | Passwordless OTP | Low friction; in-event use case |
| Serwist over next-pwa | Serwist | Active maintenance, App Router support |
| TanStack Query over SWR | TanStack Query | Richer cache invalidation, mutations |
| NestJS over FastAPI | NestJS | TypeScript monorepo consistency |
| Neon (provisioned) | Neon | PRD specifies; no migration needed |
| Resend over SendGrid | Resend | Lower cost, simpler API |
| R2 over S3 | R2 | Zero egress fees, S3-compatible |

## Critical Implementation Files (Priority Order)

1. `apps/api/prisma/schema.prisma` — Database schema, everything depends on this
2. `apps/api/src/prisma/prisma-rls.extension.ts` — Multi-tenant isolation lynchpin
3. `apps/api/src/auth/auth.service.ts` — OTP + JWT, all user flows start here
4. `apps/web/src/app/(attendee)/directory/page.tsx` — Highest-traffic, most performance-sensitive page
5. `apps/api/src/connections/connections.service.ts` — Core business logic (connection lifecycle, privacy gates)

---

## Verification Plan

1. **Database:** Run `npx prisma migrate dev` → all migrations apply cleanly → seed data loads
2. **Auth:** Organiser signup → email OTP → verify → login → JWT received. Attendee QR scan → register → OTP → verify → JWT scoped to event
3. **Multi-tenancy:** Create two events with same organiser. Verify organiser sees both. Create attendee in Event A → verify they CANNOT access Event B data (RLS test)
4. **Connection flow:** Attendee A sends request to B → B receives notification → B accepts → both see phone/email → both download vCard
5. **Organiser dashboard:** Live stats refresh every 30s during event. Excel export produces 4 sheets with correct data
6. **PWA:** Install on iOS Safari + Android Chrome. Kill network → directory loads from cache
7. **DPDP:** Attendee requests data export → JSON download. Attendee requests deletion → Super Admin approves → data purged within 30 days
8. **Performance:** Directory of 500 attendees loads in < 2.5s on 3G throttled connection. API p95 < 300ms
9. **Security:** Attempt cross-tenant read (forged JWT) → RLS blocks → audit log records attempt
