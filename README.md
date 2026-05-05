# VIMS Events

> Smart event-networking platform — replaces paper business cards with measurable digital connections at conferences, meetups, and corporate events.

[![CI](https://github.com/Vimal-Raj-003/event-vims-SE/actions/workflows/ci.yml/badge.svg)](https://github.com/Vimal-Raj-003/event-vims-SE/actions/workflows/ci.yml)

VIMS Events lets organisers run networking events end-to-end — set up in 5 minutes, share a QR code, and watch real-time analytics as attendees scan, connect, exchange vCards, and follow up. Privacy-first by default, DPDP-compliant, audit-ready.

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | **Next.js 14** (App Router, React 18, Server Components), Tailwind CSS, Zustand, TanStack Query, framer-motion |
| Backend | **NestJS 11** (Node 20), Passport JWT auth, Prisma 6, Pino structured logging |
| Database | **PostgreSQL** (NeonDB serverless in production) |
| Storage | **Cloudflare R2** for image uploads (profile photos, event banners) |
| Email | Nodemailer + Zoho SMTP |
| Realtime | Web Push (VAPID) for connection notifications |
| Build | **Turborepo** monorepo with npm workspaces |
| Deploy | Docker Compose + self-hosted GitHub runner on a Hostinger VPS |
| CI | GitHub Actions (lint → type-check → test → build → deploy) |

---

## Repository layout

```
.
├── apps/
│   ├── api/                     NestJS backend (port 4000 in dev, 4010 in container)
│   │   ├── src/
│   │   │   ├── auth/            JWT, OTP, organiser/attendee/super-admin login
│   │   │   ├── events/          Event CRUD, status (DRAFT / PUBLISHED / DELETED)
│   │   │   ├── attendees/       Attendee profiles, registration
│   │   │   ├── connections/     QR-scan connection requests, accept/decline
│   │   │   ├── directory/       Searchable attendee directory per event
│   │   │   ├── announcements/   Mid-event push messages
│   │   │   ├── smart-matching/  Profile-based attendee match scoring
│   │   │   ├── analytics/       Real-time event ROI metrics
│   │   │   ├── export/          Excel export (4 sheets: attendees, connections, engagement, audit)
│   │   │   ├── compliance/      DPDP consent, right-to-access, right-to-erasure
│   │   │   ├── notifications/   In-app + push notifications
│   │   │   ├── public/          Unauthenticated stats + organiser/event browse endpoints
│   │   │   ├── storage/         R2 upload signed URLs
│   │   │   ├── qr/              QR code generation
│   │   │   ├── mail/            Email templates + sending
│   │   │   ├── admin/           Super-admin platform controls
│   │   │   └── support-tickets/ In-app support
│   │   └── prisma/
│   │       ├── schema.prisma    Source of truth — 24 models
│   │       ├── seed.ts          Test organisers + events + attendees
│   │       └── set-super-admin.ts  Env-driven super-admin credential CLI
│   └── web/                     Next.js 14 frontend (port 3000 dev, 3010 container)
│       └── src/app/
│           ├── (public)/        Marketing landing, auth pages
│           ├── (attendee)/      Attendee app (home, directory, card, connections)
│           ├── (organiser)/     Organiser dashboard (events, analytics, settings)
│           └── (super-admin)/   Platform admin
├── packages/
│   └── shared/                  Cross-workspace types and constants
├── docker-compose.yml           Production orchestration (api + web)
├── turbo.json                   Turborepo task pipeline
└── .github/workflows/
    ├── ci.yml                   Lint, type-check, test, build on every PR/push
    └── deploy-vps.yml           Auto-deploy master to the VPS via Docker
```

---

## Prerequisites

- **Node.js 20+** (use `nvm install 20`)
- **npm 10+** (bundled with Node 20)
- **PostgreSQL 14+** running locally, or a [NeonDB](https://neon.tech) project
- (optional) **Docker 24+** if you want to run via the same setup CI uses

---

## Local development setup

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
npm install

# 2. Configure environment
cp apps/api/.env.example apps/api/.env   # if .env.example exists, otherwise see "Environment variables" below
# Edit apps/api/.env and set DATABASE_URL, DATABASE_URL_DIRECT, JWT secrets, etc.

# 3. Apply database schema
npm run db:migrate                        # production-style: apply existing migrations
# or for first-time dev DB:
npx prisma migrate dev --name init --schema apps/api/prisma/schema.prisma

# 4. (optional) Seed test organisers + events
npm run db:seed

# 5. Set the super-admin account (read from env vars, never hardcoded)
SUPERADMIN_EMAIL=admin@yourdomain.com \
SUPERADMIN_PASSWORD='ChooseAStrongPassword' \
SUPERADMIN_NAME='Display Name' \
npm run db:set-super-admin --workspace=apps/api

# 6. Run both apps in parallel (Turborepo)
npm run dev
```

Then open:
- Web: http://localhost:3000
- API: http://localhost:4000/api/v1
- API health: http://localhost:4000/api/v1/health

---

## Environment variables

All API env vars are validated at boot via Zod (see `apps/api/src/config/config.service.ts`).

### Required

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Pooled Postgres connection (NeonDB pooled URL recommended for production) |
| `DATABASE_URL_DIRECT` | Direct Postgres connection — used only by Prisma migrations |
| `JWT_SECRET` | 32+ random chars, signs access tokens |
| `JWT_REFRESH_SECRET` | 32+ random chars (different from `JWT_SECRET`), signs refresh tokens |
| `MAIL_SERVER`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_USE_SSL` | SMTP outbound (Zoho recommended) |
| `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` | Display From in outgoing mail |
| `CORS_ORIGIN` | Comma-separated list of allowed web origins, or `*` in dev |

### Optional but commonly enabled

| Variable | Purpose |
|---|---|
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 image uploads |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push notifications |
| `BCRYPT_SALT_ROUNDS` | Default `12`, range 10–14 |
| `JWT_ACCESS_EXPIRY` | Default `15m` |
| `JWT_REFRESH_EXPIRY` | Default `7d` |
| `LOG_LEVEL` | `debug`, `info` (default), `warn`, `error` |

### Web app

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Where the browser calls the API (e.g. `http://localhost:4000/api/v1` in dev, `https://api.yourdomain.com/api/v1` in prod) |

---

## npm scripts (root)

```bash
npm run dev          # turbo dev — runs api + web in parallel, with hot reload
npm run build        # turbo build — production build of every workspace
npm run lint         # turbo lint — ESLint v9 flat config + next lint
npm run type-check   # turbo type-check — tsc --noEmit across all workspaces
npm run test         # turbo test — Jest
npm run db:migrate   # apply Prisma migrations to the database
npm run db:seed      # populate dev fixtures
npm run db:generate  # regenerate the Prisma client
```

### API-only scripts (run inside `apps/api/`)

```bash
npm run start            # start the built dist
npm run start:prod       # production start
npm run db:set-super-admin    # env-driven super-admin replacement
npm run db:studio        # open Prisma Studio
```

---

## CI / CD

### Continuous Integration (`.github/workflows/ci.yml`)

Runs on every PR and every push to `master`:

1. **Lint & Type Check** — `npm ci` → `prisma generate` → `npx turbo lint type-check`
2. **Test** — `npx turbo test`
3. **Build** — `npx turbo build`

Each job uses the npm cache for fast installs. Local verification is identical:
```bash
npm ci
npm run db:generate
npx turbo lint type-check build
```

### Continuous Deployment (`.github/workflows/deploy-vps.yml`)

On every push to `master`, a self-hosted runner labeled `vimsse` (running on the VPS) does:

1. Checkout the repo
2. Write a fresh `.env` from GitHub Secrets
3. `docker compose down --remove-orphans`
4. `docker compose up -d --build`
5. Wait for `/api/v1/health` to return 200
6. Run `npx prisma migrate deploy` — with a P3005/P3009 baseline-adoption fallback for first-deploy edge cases
7. Tag images with the commit SHA so any previous image can be rolled back to
8. Verify the web container responds
9. Prune unused Docker images, keeping the 3 most recent SHA-tagged images per service

If you don't have a self-hosted runner, switch the workflow to a standard GitHub-hosted runner that SSH's into the VPS — see the deployment guide in [`docs/`](./docs).

---

## Docker (production)

Both apps are containerised with multi-stage Alpine builds.

```bash
# Build + start
docker compose up -d --build

# Apply Prisma migrations against the live DB
docker compose exec api npx prisma migrate deploy

# Tail logs
docker compose logs -f api
docker compose logs -f web

# Set the super-admin account
docker compose exec api npm run db:set-super-admin
```

Containers bind to `127.0.0.1` only — put a reverse proxy (Caddy or Nginx) in front of them to terminate TLS. The compose file expects:

- API: `localhost:4010` (exposed in container at 4000)
- Web: `localhost:3010` (exposed in container at 3000)

A persistent named volume `vimsse_uploads` keeps user-uploaded files across restarts.

---

## Authentication model

| Role | Login route | Method | Where credentials live |
|---|---|---|---|
| **Super Admin** | `/auth/super-admin/login` | Email + password | `super_admins` table — managed via `npm run db:set-super-admin` only |
| **Organiser** | `/auth/organiser/login` | Email + password (with email verification on signup) | `organisers` table — self-signup at `/auth/organiser/signup` |
| **Attendee** | `/auth/attendee/login` | Email + Event ID/Browse/QR → email OTP | `attendees` table — created on first OTP request per event |

All authenticated requests carry a JWT Bearer token. Refresh tokens are persisted in `refresh_tokens` (hashed) and rotated on every refresh.

---

## Public API endpoints (no auth)

| Endpoint | Purpose |
|---|---|
| `GET /api/v1/health` | Health + DB latency |
| `GET /api/v1/health/live` | Liveness probe |
| `GET /api/v1/health/ready` | Readiness probe (verifies DB) |
| `GET /api/v1/public/stats` | Live attendee networking count for the landing page |
| `GET /api/v1/public/organisers` | Organisers with at least one live/upcoming published event |
| `GET /api/v1/public/organisers/:id/events` | That organiser's live/upcoming events |

All public endpoints are throttled (60 req / 10s) and CDN-cacheable.

---

## Database

- **Schema**: 24 models in `apps/api/prisma/schema.prisma`
- **Migrations**: `apps/api/prisma/migrations/` (deploy with `prisma migrate deploy`)
- **Generated client**: emitted to `node_modules/.prisma/client/` by `prisma generate` (auto-runs via API postinstall)

Major tables: `super_admins`, `organisers`, `events`, `attendees`, `connection_requests`, `announcements`, `audit_logs`, `notifications`, `match_scores`, `activities`, `support_tickets`.

---

## Browser support

The web app targets evergreen browsers (Chrome 90+, Safari 14+, Firefox 88+, Edge 90+). The hero slideshow uses CSS `@keyframes`, `cubic-bezier` easing, and SVG SMIL — all supported in evergreen browsers. `prefers-reduced-motion` is honoured throughout.

---

## Security highlights

- **Helmet** middleware with strict CSP (`'script-src 'self''`, `'frame-ancestors 'none''`, etc.)
- **Argon2-strength bcrypt** (12 rounds) for organiser + super-admin passwords
- **JWT** access tokens expire in 15min; refresh rotation on every use
- **Rate limiting** via `@nestjs/throttler` (3 req/s short, 20 req/10s medium, 100 req/min long)
- **Email verification** required before organiser login
- **OTP** for attendees (10-minute expiry, hashed at rest)
- **CORS** explicitly configured per environment
- **Audit log** writes for every privileged action (events table changes, connection state, deletions)

---

## Contributing

```bash
# 1. Branch off master
git checkout -b feat/your-feature

# 2. Make changes, run the same checks CI runs
npx turbo lint type-check
npm run build
npm run test

# 3. Commit using conventional-commit style
git commit -m "feat(scope): short description"

# 4. Open a PR against master
```

CI must be green before merging.

---

## License

Private — © VIMS Enterprise. All rights reserved.

---

## Quick links

- Production: https://se.vimsenterprise.com
- API base: https://se.vimsenterprise.com/api/v1
- Repository: https://github.com/Vimal-Raj-003/event-vims-SE
