# VPS Deployment Local Prep — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the VIMS-EVENT repo locally for first VPS deployment to `se.vimsenterprise.com` — fix existing typecheck blockers, untrack a leaked .env, generate a baseline Prisma migration, add Docker/Nginx/GitHub Actions config files, and remove obsolete deployment artifacts.

**Architecture:** All work is in the local repo. After this plan completes, the system prompt block in [docs/superpowers/specs/2026-05-04-vps-deployment-design.md](docs/superpowers/specs/2026-05-04-vps-deployment-design.md) is pasted into a fresh Claude Code session that drives the VPS-side work (Phases 0, 1-4, 6-12 of the spec) under SSH and GitHub UI access.

**Tech Stack:** TypeScript 5, Next.js 14 standalone mode, NestJS 11, Prisma 6, Docker multi-stage builds, GitHub Actions self-hosted runner, npm workspaces + Turborepo.

**Out of scope:** VPS provisioning, SSH key setup, Docker installation, Nginx vhost creation, certbot, GitHub Secrets, runner installation, first deploy. These are spec Phases 0-12 minus 0.5 and 5; they live in the system prompt and execute in a fresh session.

**File map:**
- Modified files: `apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx`, `apps/web/src/app/(organiser)/account/page.tsx`, `.github/workflows/ci.yml`, `apps/api/prisma/schema.prisma`, `apps/api/package.json`, `apps/web/next.config.mjs`, `apps/api/Dockerfile`
- New files: `apps/api/prisma/migrations/<TS>_init/migration.sql`, `apps/web/Dockerfile`, `docker-compose.yml`, `.github/workflows/deploy-vps.yml`
- Deleted files: `apps/web/.env` (untracked, kept on disk), `apps/api/docker-compose.yml`, `.github/workflows/deploy-production.yml`, `apps/api/.env.production`

---

### Task 1: Remove unused `Link` import (typecheck fix #1)

**Files:**
- Modify: `apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx:4`

- [ ] **Step 1: Verify the error reproduces**

Run: `npm run type-check 2>&1 | grep "profile/\[attendeeId\]"`
Expected output: `src/app/(attendee)/profile/[attendeeId]/page.tsx(4,1): error TS6133: 'Link' is declared but its value is never read.`

- [ ] **Step 2: Inspect the file head**

Run: read first 15 lines of `apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx`
Expected: line 4 imports `Link from "next/link"` with no subsequent usage in the file.

- [ ] **Step 3: Remove the unused import**

Delete the entire line 4: `import Link from "next/link";`

If line 4 is something else (e.g., a different unused import), match the actual file state but the goal is the same: remove whatever unused import TS6133 reported on that line.

- [ ] **Step 4: Verify the specific error is gone**

Run: `npm run type-check 2>&1 | grep "profile/\[attendeeId\]" | wc -l`
Expected: `0`

- [ ] **Step 5: Stage the change**

Run: `git add apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx`
(Commit batched at end of Phase 0.5 in Task 7.)

---

### Task 2: Extend local `Settings` type to fix 4 type errors (typecheck fix #2)

**Files:**
- Modify: `apps/web/src/app/(organiser)/account/page.tsx` (locate the local `Settings` interface near top of file)

- [ ] **Step 1: Verify the errors reproduce**

Run: `npm run type-check 2>&1 | grep "account/page.tsx(138" | head -10`
Expected: 4 lines of `error TS2339: Property '<id|organiserId|createdAt|updatedAt>' does not exist on type 'Settings'.`

- [ ] **Step 2: Locate the `Settings` interface in the file**

Run: `grep -n "interface Settings" apps/web/src/app/(organiser)/account/page.tsx`
Expected: a single match showing the line number where `interface Settings {` is declared.

- [ ] **Step 3: Read the existing interface body**

Read 10-20 lines starting from the `interface Settings` line. Note the existing fields (likely just the editable subset like `notificationsEmail`, `notificationsSms`, etc.).

- [ ] **Step 4: Add the four missing fields to the interface**

Add these four fields to the `Settings` interface body (place them at the top of the body, before the editable fields, to mirror the typical "system fields first" convention):

```ts
id: string;
organiserId: string;
createdAt: string;
updatedAt: string;
```

The full snippet for the interface should include these four fields plus whatever editable fields already exist. Use the Edit tool with the exact existing interface content as `old_string` and the augmented version as `new_string`.

- [ ] **Step 5: Verify all four errors are gone**

Run: `npm run type-check 2>&1 | grep "account/page.tsx(138" | wc -l`
Expected: `0`

- [ ] **Step 6: Verify full typecheck now passes (the only two known errors are now both fixed)**

Run: `npm run type-check`
Expected: `Tasks: 3 successful, 3 total` with no error output. If any error remains, STOP and surface it before continuing.

- [ ] **Step 7: Stage the change**

Run: `git add apps/web/src/app/(organiser)/account/page.tsx`

---

### Task 3: Fix CI workflow branch trigger (`main` → `master`)

**Files:**
- Modify: `.github/workflows/ci.yml` (lines around 4-7)

- [ ] **Step 1: Read current trigger**

Run: read first 10 lines of `.github/workflows/ci.yml`
Expected: `pull_request: branches: [main]` and `push: branches: [main]` blocks.

- [ ] **Step 2: Replace branch trigger**

Use Edit tool with `replace_all: true` (since `[main]` appears in two trigger blocks):
- old_string: `branches: [main]`
- new_string: `branches: [master]`

- [ ] **Step 3: Validate YAML syntax**

Run: `npx js-yaml .github/workflows/ci.yml > /dev/null && echo "valid YAML"`
Expected: `valid YAML`

If `js-yaml` isn't available, alternative:
Run: `node -e "require('js-yaml')" 2>&1 || npm ls js-yaml 2>&1`
If still unavailable, just visually inspect the file — the diff is one literal substitution, low risk.

- [ ] **Step 4: Stage the change**

Run: `git add .github/workflows/ci.yml`

---

### Task 4: Untrack `apps/web/.env`

**Files:**
- Untrack (keep on disk): `apps/web/.env`

- [ ] **Step 1: Verify the file is currently tracked**

Run: `git ls-files apps/web/.env`
Expected output: `apps/web/.env`
If the output is empty, the file isn't tracked — skip this entire task.

- [ ] **Step 2: Verify .gitignore already excludes it**

Run: `grep -n "\.env" .gitignore`
Expected: matches lines 4 (`.env`), 5 (`.env.*`), 7 (`**/.env`), 8 (`**/.env.*`).
The `**/.env` pattern covers `apps/web/.env`. Good — no .gitignore edit needed.

- [ ] **Step 3: Untrack without deleting from disk**

Run: `git rm --cached apps/web/.env`
Expected output: `rm 'apps/web/.env'`

- [ ] **Step 4: Verify the file is no longer tracked but still on disk**

Run: `git ls-files apps/web/.env`
Expected: empty output (no tracking).

Run: `test -f apps/web/.env && echo "exists" || echo "missing"`
Expected: `exists` (we kept the dev .env on disk).

- [ ] **Step 5: Verify no other .env files remain tracked**

Run: `git ls-files | grep -E '\.env$'`
Expected: empty output.

(If anything else shows up, untrack those too with `git rm --cached <path>` — same pattern as Step 3.)

The deletion is already staged from `git rm --cached`; no separate `git add` needed.

---

### Task 5: Add `directUrl` to schema + generate baseline Prisma migration

**Files:**
- Modify: `apps/api/prisma/schema.prisma:5-8`
- Create: `apps/api/prisma/migrations/<TS>_init/migration.sql` (timestamp generated at runtime)

- [ ] **Step 1: Read current datasource block**

Run: read lines 1-10 of `apps/api/prisma/schema.prisma`
Expected:
```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

- [ ] **Step 2: Add `directUrl` line**

Use Edit tool:
- old_string:
```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```
- new_string:
```
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DATABASE_URL_DIRECT")
}
```

(Note the `provider`/`url` got an extra space to align with `directUrl` — Prisma accepts either alignment but the formatter will normalize on next save.)

- [ ] **Step 3: Validate the schema parses**

Run: `cd apps/api && npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid 🚀`

- [ ] **Step 4: Generate baseline migration SQL via `migrate diff`**

Run from project root:
```
cd apps/api
TS=$(date +%Y%m%d%H%M%S)
mkdir -p prisma/migrations/${TS}_init
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/${TS}_init/migration.sql
echo "Generated: prisma/migrations/${TS}_init/migration.sql"
```

Expected: a single SQL file containing `CREATE TABLE` statements for every model in schema.prisma. The script flag emits raw DDL without transactional wrappers (which Prisma applies itself on `migrate deploy`).

- [ ] **Step 5: Sanity-check the generated SQL**

Run: `head -40 apps/api/prisma/migrations/*_init/migration.sql`
Expected: starts with `-- CreateTable` or `CREATE TABLE` lines for the first models in schema.prisma (e.g., `super_admins`, `organisers`).

Run: `wc -l apps/api/prisma/migrations/*_init/migration.sql`
Expected: at least 100+ lines (the schema has ~20 models with multiple columns each).

If output is empty or under 50 lines, the diff failed silently — investigate before proceeding.

- [ ] **Step 6: Create migration_lock.toml so Prisma knows the provider**

Run:
```
cat > apps/api/prisma/migrations/migration_lock.toml <<'EOF'
provider = "postgresql"
EOF
```

(This file lives at the migrations folder root, not inside the timestamped folder. Required by `prisma migrate deploy` to validate the database backend.)

Run: `cat apps/api/prisma/migrations/migration_lock.toml`
Expected: `provider = "postgresql"`

- [ ] **Step 7: Stage schema + migrations**

Run:
```
git add apps/api/prisma/schema.prisma
git add apps/api/prisma/migrations/
```

---

### Task 6: Add `prisma.seed` config to `apps/api/package.json`

**Files:**
- Modify: `apps/api/package.json` (top-level — add a new `"prisma"` key)

- [ ] **Step 1: Read full package.json**

Read all of `apps/api/package.json`. Note: there's already a `"db:seed"` entry under `"scripts"` — that stays. We're adding a separate top-level `"prisma"` config block (Prisma CLI looks here for the seed command).

- [ ] **Step 2: Add the prisma config block**

Use Edit tool. The cleanest insertion point is right before `"dependencies":`. Find the existing line break between scripts and dependencies and insert.

old_string (last script line + closing brace + dependencies open):
```
    "db:studio": "prisma studio"
  },
  "dependencies": {
```

new_string:
```
    "db:studio": "prisma studio"
  },
  "prisma": {
    "seed": "npx tsx prisma/seed.ts"
  },
  "dependencies": {
```

- [ ] **Step 3: Validate JSON syntax**

Run: `node -e "JSON.parse(require('fs').readFileSync('apps/api/package.json','utf8'))" && echo "valid JSON"`
Expected: `valid JSON`

- [ ] **Step 4: Confirm Prisma will find it**

Run: `cd apps/api && npx prisma db seed --help 2>&1 | head -20`
Expected: shows the seed command help WITHOUT a "no seed config found" error. (We're not running the seed — just confirming the config is wired.)

- [ ] **Step 5: Stage the change**

Run: `git add apps/api/package.json`

---

### Task 7: Verify Phase 0.5 typecheck + commit all six fixes

**Files:**
- (No new file changes — verification + commit only)

- [ ] **Step 1: Re-run full typecheck**

Run from project root: `npm run type-check`
Expected: `Tasks: 3 successful, 3 total` — zero TypeScript errors across `@vims/web`, `@vims-events/api`, `@vims-events/shared`.

If anything fails, STOP. Do not commit broken code.

- [ ] **Step 2: Confirm no .env files are staged**

Run: `git diff --cached --name-only | grep -E '\.env$'`
Expected: empty output. (If anything matches, unstage it: `git reset HEAD <path>`.)

- [ ] **Step 3: Review what's about to be committed**

Run: `git diff --cached --stat`
Expected files in the diff:
- `.github/workflows/ci.yml`
- `apps/api/package.json`
- `apps/api/prisma/migrations/migration_lock.toml`
- `apps/api/prisma/migrations/<TS>_init/migration.sql`
- `apps/api/prisma/schema.prisma`
- `apps/web/.env` (deletion)
- `apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx`
- `apps/web/src/app/(organiser)/account/page.tsx`

If any other files appear, investigate before continuing.

- [ ] **Step 4: Commit**

Run:
```
git commit -m "$(cat <<'EOF'
fix: pre-deploy hygiene for VPS deployment

Prepares the repo for first deploy to se.vimsenterprise.com:
- Fix 5 typecheck errors (unused Link import + Settings type extension)
- Untrack apps/web/.env (still on disk for local dev)
- Fix CI workflow branch trigger (main → master)
- Add directUrl to Prisma schema (required for migrate deploy)
- Generate baseline migration SQL via prisma migrate diff
- Add prisma.seed config so prisma db seed finds the seed script

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds. If a pre-commit hook fails, fix the underlying issue and retry — do NOT use `--no-verify`.

- [ ] **Step 5: Verify the commit landed**

Run: `git log -1 --oneline`
Expected: `<sha> fix: pre-deploy hygiene for VPS deployment`

---

### Task 8: Add `output: "standalone"` and clean CSP in `next.config.mjs`

**Files:**
- Modify: `apps/web/next.config.mjs`

- [ ] **Step 1: Read current file**

Read `apps/web/next.config.mjs`. Note current state: line 2 starts `const nextConfig = {`, line 3 is `reactStrictMode: true,`, line 32 has the long CSP `connect-src` string with `https://api.se.vimsenterprise.com` and `wss://api.se.vimsenterprise.com`, line 31 has `img-src` with `https://api.se.vimsenterprise.com`.

- [ ] **Step 2: Add `output: "standalone"` as the first property**

Use Edit tool:
- old_string:
```
const nextConfig = {
  reactStrictMode: true,
```
- new_string:
```
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
```

- [ ] **Step 3: Clean `api.se.vimsenterprise.com` from CSP `connect-src`**

Use Edit tool:
- old_string:
```
              "connect-src 'self' http://localhost:3001 http://localhost:4000 https://api.vims.events wss://api.vims.events https://api.se.vimsenterprise.com wss://api.se.vimsenterprise.com",
```
- new_string:
```
              "connect-src 'self' http://localhost:3001 http://localhost:4000 https://api.vims.events wss://api.vims.events",
```

- [ ] **Step 4: Clean `api.se.vimsenterprise.com` from CSP `img-src`**

Use Edit tool:
- old_string:
```
              "img-src 'self' data: blob: https: http://localhost:4000 https://api.se.vimsenterprise.com",
```
- new_string:
```
              "img-src 'self' data: blob: https: http://localhost:4000",
```

- [ ] **Step 5: Verify config still parses**

Run: `cd apps/web && node -e "import('./next.config.mjs').then(m => console.log('output:', m.default.output))"`
Expected: `output: standalone`

- [ ] **Step 6: Verify typecheck still passes**

Run: `npm run type-check`
Expected: 3 successful, 0 errors. (next.config.mjs isn't TS-checked but importing the module proves there's no syntax error.)

- [ ] **Step 7: Stage the change**

Run: `git add apps/web/next.config.mjs`

---

### Task 9: Replace `apps/api/Dockerfile` with monorepo-aware multi-stage build

**Files:**
- Replace: `apps/api/Dockerfile`

- [ ] **Step 1: Confirm the existing Dockerfile is the single-package version**

Run: `head -10 apps/api/Dockerfile`
Expected to start with `# Stage 1: Install dependencies` and reference `COPY package*.json ./` (no monorepo paths).

- [ ] **Step 2: Overwrite the file with the monorepo-aware version**

Use the Write tool to replace `apps/api/Dockerfile` entirely with:

```dockerfile
# ─── Builder ───
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json turbo.json tsconfig.base.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci
COPY apps/api ./apps/api
COPY packages/shared ./packages/shared
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

# ─── Runtime ───
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl curl
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/node_modules/.prisma ./apps/api/node_modules/.prisma
COPY --from=builder /app/packages/shared ./packages/shared
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:4000/api/v1/health || exit 1
CMD ["node", "dist/main.js"]
```

- [ ] **Step 3: Verify Dockerfile lints if Docker is available locally**

Run: `docker --version 2>&1`
If Docker is installed:
Run: `docker build -f apps/api/Dockerfile --target builder --check . 2>&1 | tail -20`
Expected: no errors (warnings about pinned digests are acceptable).

If Docker is not installed locally, skip this step — GitHub Actions on the VPS runner will catch syntax issues at first deploy.

- [ ] **Step 4: Verify the prerequisite source files exist**

Run: `test -f turbo.json && test -f tsconfig.base.json && test -f packages/shared/package.json && echo "ok"`
Expected: `ok`. (The Dockerfile copies these — if any is missing, the build will fail later.)

- [ ] **Step 5: Stage the change**

Run: `git add apps/api/Dockerfile`

---

### Task 10: Create `apps/web/Dockerfile` (Next.js standalone)

**Files:**
- Create: `apps/web/Dockerfile`

- [ ] **Step 1: Confirm file does not yet exist**

Run: `test -f apps/web/Dockerfile && echo "exists" || echo "missing"`
Expected: `missing`. (If it exists, read it first and confirm we're replacing intentionally.)

- [ ] **Step 2: Write the file**

Use the Write tool to create `apps/web/Dockerfile` with this content:

```dockerfile
# ─── Builder ───
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json turbo.json tsconfig.base.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
WORKDIR /app/apps/web
RUN npm run build

# ─── Runtime ───
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
```

- [ ] **Step 3: Verify the file was created**

Run: `wc -l apps/web/Dockerfile`
Expected: ~22-25 lines.

- [ ] **Step 4: Sanity check the standalone path assumptions**

The Dockerfile copies `apps/web/.next/standalone` and `apps/web/.next/static` from the builder. These paths are produced when `output: "standalone"` is set in next.config.mjs (Task 8) — which is required for this to work. Confirm Task 8 was done:

Run: `grep "standalone" apps/web/next.config.mjs`
Expected: line containing `output: "standalone",`. If missing, go back to Task 8 before continuing.

- [ ] **Step 5: Stage the change**

Run: `git add apps/web/Dockerfile`

---

### Task 11: Create `docker-compose.yml` at repo root

**Files:**
- Create: `docker-compose.yml` (at repo root, not in `apps/api`)

- [ ] **Step 1: Confirm file does not yet exist at repo root**

Run: `test -f docker-compose.yml && echo "exists" || echo "missing"`
Expected: `missing`.

- [ ] **Step 2: Write the file**

Use the Write tool to create `docker-compose.yml` (at project root) with this content:

```yaml
name: vimsse

services:
  api:
    build:
      context: .
      dockerfile: apps/api/Dockerfile
    container_name: vimsse-api
    restart: unless-stopped
    ports:
      - "127.0.0.1:4010:4000"
    environment:
      NODE_ENV: production
      PORT: 4000
      DATABASE_URL: ${DATABASE_URL}
      DATABASE_URL_DIRECT: ${DATABASE_URL_DIRECT}
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      JWT_ACCESS_EXPIRY: 15m
      JWT_REFRESH_EXPIRY: 7d
      MAIL_SERVER: ${MAIL_SERVER}
      MAIL_PORT: ${MAIL_PORT}
      MAIL_USERNAME: ${MAIL_USERNAME}
      MAIL_PASSWORD: ${MAIL_PASSWORD}
      MAIL_USE_SSL: ${MAIL_USE_SSL}
      EMAIL_FROM_ADDRESS: noreply@vimsenterprise.com
      EMAIL_FROM_NAME: VIMS Events
      R2_ACCOUNT_ID: ${R2_ACCOUNT_ID}
      R2_ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID}
      R2_SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY}
      R2_BUCKET_NAME: ${R2_BUCKET_NAME}
      R2_PUBLIC_URL: ${R2_PUBLIC_URL}
      VAPID_PUBLIC_KEY: ${VAPID_PUBLIC_KEY}
      VAPID_PRIVATE_KEY: ${VAPID_PRIVATE_KEY}
      VAPID_SUBJECT: mailto:admin@vimsenterprise.com
      CORS_ORIGIN: https://se.vimsenterprise.com
      LOG_LEVEL: info
    volumes:
      - vimsse_uploads:/app/apps/api/uploads
    networks:
      - vimsse_net

  web:
    build:
      context: .
      dockerfile: apps/web/Dockerfile
      args:
        NEXT_PUBLIC_API_URL: https://se.vimsenterprise.com/api/v1
    container_name: vimsse-web
    restart: unless-stopped
    ports:
      - "127.0.0.1:3010:3000"
    depends_on:
      - api
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://se.vimsenterprise.com/api/v1
    networks:
      - vimsse_net

volumes:
  vimsse_uploads:

networks:
  vimsse_net:
    driver: bridge
```

- [ ] **Step 3: Validate compose file syntax (best-effort)**

If Docker is available locally:
Run: `docker compose -f docker-compose.yml config 2>&1 | head -20`
Expected: outputs the resolved compose config. Warnings like `WARN[0000] The "DATABASE_URL" variable is not set` are EXPECTED and OK — secrets only exist on the runner.

If Docker isn't available, validate as YAML:
Run: `node -e "require('js-yaml').load(require('fs').readFileSync('docker-compose.yml','utf8'))" 2>&1 || python -c "import yaml; yaml.safe_load(open('docker-compose.yml'))"`
Expected: no error output.

- [ ] **Step 4: Confirm port bindings are 127.0.0.1-only**

Run: `grep -nE '"[0-9]+:[0-9]+"' docker-compose.yml; grep -nE '127\.0\.0\.1:[0-9]+:[0-9]+' docker-compose.yml`
Expected: the first grep returns NOTHING (no bare `"port:port"` mappings), the second grep returns TWO matches (`127.0.0.1:4010:4000` and `127.0.0.1:3010:3000`). If the first grep returns any match, that's a public-bound port — fix it before continuing (multi-tenant isolation rule).

- [ ] **Step 5: Stage the change**

Run: `git add docker-compose.yml`

---

### Task 12: Create `.github/workflows/deploy-vps.yml`

**Files:**
- Create: `.github/workflows/deploy-vps.yml`

- [ ] **Step 1: Confirm file does not yet exist**

Run: `test -f .github/workflows/deploy-vps.yml && echo "exists" || echo "missing"`
Expected: `missing`.

- [ ] **Step 2: Write the workflow file**

Use the Write tool to create `.github/workflows/deploy-vps.yml` with this content:

```yaml
name: Deploy to VPS (se.vimsenterprise.com)

on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: [self-hosted, vimsse]
    timeout-minutes: 30
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Write .env from secrets
        run: |
          cat > .env <<EOF
          DATABASE_URL=${{ secrets.DATABASE_URL }}
          DATABASE_URL_DIRECT=${{ secrets.DATABASE_URL_DIRECT }}
          JWT_SECRET=${{ secrets.JWT_SECRET }}
          JWT_REFRESH_SECRET=${{ secrets.JWT_REFRESH_SECRET }}
          MAIL_SERVER=${{ secrets.MAIL_SERVER }}
          MAIL_PORT=${{ secrets.MAIL_PORT }}
          MAIL_USERNAME=${{ secrets.MAIL_USERNAME }}
          MAIL_PASSWORD=${{ secrets.MAIL_PASSWORD }}
          MAIL_USE_SSL=${{ secrets.MAIL_USE_SSL }}
          R2_ACCOUNT_ID=${{ secrets.R2_ACCOUNT_ID }}
          R2_ACCESS_KEY_ID=${{ secrets.R2_ACCESS_KEY_ID }}
          R2_SECRET_ACCESS_KEY=${{ secrets.R2_SECRET_ACCESS_KEY }}
          R2_BUCKET_NAME=${{ secrets.R2_BUCKET_NAME }}
          R2_PUBLIC_URL=${{ secrets.R2_PUBLIC_URL }}
          VAPID_PUBLIC_KEY=${{ secrets.VAPID_PUBLIC_KEY }}
          VAPID_PRIVATE_KEY=${{ secrets.VAPID_PRIVATE_KEY }}
          EOF
          chmod 600 .env

      - name: Tag images for rollback
        id: tagimg
        run: |
          SHA=$(git rev-parse --short HEAD)
          echo "sha=$SHA" >> $GITHUB_OUTPUT

      - name: Build & restart containers
        run: |
          docker compose down --remove-orphans
          docker compose up -d --build
          docker compose ps

      - name: Wait for API health
        run: |
          for i in {1..30}; do
            if curl -fs http://localhost:4010/api/v1/health > /dev/null; then
              echo "API healthy after $((i*10)) seconds"
              exit 0
            fi
            sleep 10
          done
          echo "API never became healthy"
          docker compose logs api --tail 100
          exit 1

      - name: Run Prisma migrations (with baseline-adoption fallback)
        run: |
          set -e
          set +e
          docker compose exec -T api npx prisma migrate deploy 2>&1 | tee /tmp/migrate.log
          STATUS=${PIPESTATUS[0]}
          set -e
          if [ "$STATUS" -ne 0 ]; then
            if grep -qE "P3005|P3009" /tmp/migrate.log; then
              BASELINE=$(docker compose exec -T api sh -c "ls prisma/migrations | grep _init | head -1" | tr -d '\r\n')
              if [ -n "$BASELINE" ]; then
                echo "Adopting baseline migration $BASELINE as already-applied..."
                docker compose exec -T api npx prisma migrate resolve --applied "$BASELINE"
                docker compose exec -T api npx prisma migrate deploy
              else
                echo "No _init baseline migration found to resolve — failing."
                exit 1
              fi
            else
              echo "Migration failed for an unrecognized reason. See /tmp/migrate.log"
              exit 1
            fi
          fi

      - name: Tag images with commit SHA (for rollback)
        run: |
          docker tag vimsse-api:latest vimsse-api:${{ steps.tagimg.outputs.sha }} || true
          docker tag vimsse-web:latest vimsse-web:${{ steps.tagimg.outputs.sha }} || true

      - name: Verify web is responding
        run: curl -f http://localhost:3010/ -o /dev/null

      - name: Cleanup unused images (keep last 3 tagged)
        run: |
          docker image prune -f
          for service in vimsse-api vimsse-web; do
            docker images "$service" --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' \
              | grep -v ':latest' | sort -k2 -r | tail -n +4 \
              | awk '{print $1}' | xargs -r docker rmi -f || true
          done

      - name: Summary
        run: |
          echo "Deployment complete: ${{ steps.tagimg.outputs.sha }}"
          echo "  -> https://se.vimsenterprise.com"
          docker compose ps
```

- [ ] **Step 3: Validate workflow YAML syntax**

Run: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/deploy-vps.yml','utf8'))" 2>&1 || python -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-vps.yml'))"`
Expected: no error output.

- [ ] **Step 4: Confirm `runs-on` label matches the runner we'll install**

Run: `grep "runs-on" .github/workflows/deploy-vps.yml`
Expected: `runs-on: [self-hosted, vimsse]`. The `vimsse` label must match what gets passed to `./config.sh --labels vimsse` in spec Phase 7 — they have to be the same string.

- [ ] **Step 5: Stage the change**

Run: `git add .github/workflows/deploy-vps.yml`

---

### Task 13: Delete obsolete deployment artifacts

**Files:**
- Delete: `apps/api/docker-compose.yml`
- Delete: `.github/workflows/deploy-production.yml`
- Delete: `apps/api/.env.production`

- [ ] **Step 1: Confirm each file currently exists and is tracked**

Run:
```
git ls-files apps/api/docker-compose.yml .github/workflows/deploy-production.yml apps/api/.env.production
```
Expected: all three paths returned.

- [ ] **Step 2: Spot-check what's in each before deleting**

Read each of:
- `apps/api/docker-compose.yml`  → should be the single-service compose superseded by the new root-level one
- `.github/workflows/deploy-production.yml`  → should be the Vercel workflow we identified as obsolete
- `apps/api/.env.production`  → should be the placeholder env scaffolding

If anything looks like it contains real secrets (long cryptographic strings, real-looking API keys), STOP and surface that to the user before continuing. Placeholder values like `your_account_id` are fine.

- [ ] **Step 3: Delete the three files**

Run:
```
git rm apps/api/docker-compose.yml
git rm .github/workflows/deploy-production.yml
git rm apps/api/.env.production
```

Each should output `rm '<path>'`.

- [ ] **Step 4: Verify nothing else references the deleted files**

Run: `grep -rn "deploy-production\.yml" .github/ docs/ 2>/dev/null | grep -v "specs/2026-05-04-vps-deployment-design.md"`
Expected: empty output. (The spec doc mentions deploy-production.yml as a file to delete — that's fine.)

Run: `grep -rn "apps/api/docker-compose\.yml" .github/ docs/ apps/ 2>/dev/null`
Expected: empty output. (Nothing in the working tree should reference the old per-app compose.)

If anything else turns up (e.g., a README pointing at the old workflow), update or note it before continuing.

---

### Task 14: Final verification + commit Phase 5

**Files:**
- (No new file changes — verification + commit only)

- [ ] **Step 1: Re-run typecheck**

Run: `npm run type-check`
Expected: 3 successful, 0 errors.

- [ ] **Step 2: Confirm no .env files staged**

Run: `git diff --cached --name-only | grep -E '\.env(\.production)?$'`
Expected: shows `apps/api/.env.production` as a deletion (which is fine — it's the file we removed in Task 13). No additions of `.env` files.

To be precise:
Run: `git diff --cached --name-status | grep -E '\.env(\.production)?$'`
Expected: only lines starting with `D` (delete). If any line starts with `A` or `M`, an env file is being added/modified — stop and unstage it.

- [ ] **Step 3: Review the staged diff summary**

Run: `git diff --cached --stat`
Expected files (rough list):
- `.github/workflows/ci.yml` (modified — branch trigger fix from Task 3, was committed already in Task 7; should NOT appear here unless something else changed)
- `.github/workflows/deploy-production.yml` (deleted)
- `.github/workflows/deploy-vps.yml` (added)
- `apps/api/.env.production` (deleted)
- `apps/api/Dockerfile` (modified)
- `apps/api/docker-compose.yml` (deleted)
- `apps/web/Dockerfile` (added)
- `apps/web/next.config.mjs` (modified)
- `docker-compose.yml` (added)

Note: anything from Task 7's commit shouldn't appear here — only Task 8-13 changes.

- [ ] **Step 4: Commit**

Run:
```
git commit -m "$(cat <<'EOF'
ci: add Docker deployment for se.vimsenterprise.com

Adds the build/deploy infrastructure for VPS hosting at
se.vimsenterprise.com with Vercel DNS:
- New monorepo-aware Dockerfiles for api and web (web in standalone mode)
- Repo-root docker-compose.yml with vimsse project name and 127.0.0.1
  port binding for multi-tenant isolation
- GitHub Actions workflow for self-hosted runner with prisma migrate
  baseline-adoption fallback (P3005/P3009)
- next.config.mjs: add output: standalone, drop dead
  api.se.vimsenterprise.com CSP entries (API now same-origin)
- Removed: legacy single-package Dockerfile/compose, Vercel deploy
  workflow, .env.production placeholder

Operator runs spec system prompt to execute VPS-side deployment.
See docs/superpowers/specs/2026-05-04-vps-deployment-design.md.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

Expected: commit succeeds. If a hook fails, fix and retry without `--no-verify`.

- [ ] **Step 5: Post-commit verification**

Run: `git log -2 --oneline`
Expected: shows two new commits — Task 7's "fix: pre-deploy hygiene…" and Task 14's "ci: add Docker deployment…".

Run: `git status`
Expected: `nothing to commit, working tree clean` (or just untracked files unrelated to this work).

- [ ] **Step 6: Sanity check the repo is now ready for the operator system prompt**

Run all of these as a final readiness gate:

```
echo "=== typecheck ===" && npm run type-check 2>&1 | tail -5
echo "=== no tracked .env ===" && git ls-files | grep -E '\.env$' | wc -l
echo "=== Dockerfiles ===" && ls apps/api/Dockerfile apps/web/Dockerfile docker-compose.yml .github/workflows/deploy-vps.yml
echo "=== schema directUrl ===" && grep "directUrl" apps/api/prisma/schema.prisma
echo "=== prisma.seed config ===" && node -e "console.log(require('./apps/api/package.json').prisma)"
echo "=== baseline migration exists ===" && ls apps/api/prisma/migrations/*_init/migration.sql
echo "=== next.config.mjs standalone ===" && grep "standalone" apps/web/next.config.mjs
```

Expected:
- typecheck: 3 successful
- no tracked .env: `0`
- 4 file paths exist
- `directUrl = env("DATABASE_URL_DIRECT")`
- `{ seed: 'npx tsx prisma/seed.ts' }`
- migration.sql path exists
- `output: "standalone",`

If all checks pass, the local prep is complete. Hand off to the operator: paste the system prompt block from `docs/superpowers/specs/2026-05-04-vps-deployment-design.md` into a fresh Claude Code session with SSH credentials for `194.164.148.104` and GitHub admin access. That session executes spec Phases 0, 1-4, 6-12.
