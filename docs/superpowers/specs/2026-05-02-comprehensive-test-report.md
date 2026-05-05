# VIMS-EVENT — Comprehensive Test & Fix Report

**Date:** 2026-05-02
**Method:** Live Playwright (Chromium MCP) against local dev servers (API:4000, Web:3000)
**Scope:** All three roles, every page, every primary action.

---

## Servers

- API: `apps/api` — `npm run dev` (NestJS, port 4000)
- Web: `apps/web` — `npm run dev` (Next.js 14, port 3000)
- DB: Neon Postgres pooler (DATABASE_URL configured)
- Mail: Zoho SMTP via nodemailer (verified working — OTP delivery)

---

## Bugs found and fixed

### 1. API failed to boot — `RESEND_API_KEY` required
**File:** `apps/api/src/config/config.service.ts`
**Symptom:** `Error: Environment validation failed: RESEND_API_KEY: Required` on startup.
**Cause:** Stack switched to Zoho SMTP via nodemailer but the Zod env schema still required `RESEND_API_KEY`, plus R2 / VAPID keys that aren't in use.
**Fix:** Made `RESEND_API_KEY`, all `R2_*`, all `VAPID_*` optional; added `MAIL_*` fields. Getters now return `''` when value is undefined.

### 2. Announcements page crashed — `announcements.map is not a function`
**File:** `apps/web/src/app/(organiser)/events/[eventId]/announcements/page.tsx`
**Symptom:** Page rendered then crashed with React error overlay.
**Cause:** Page expected `{data: []}` but the API returns `{items: [], total, page, limit, totalPages}`. The fallback assigned the wrapper object as the array.
**Fix:** Read `data.items ?? data.data ?? []`, defensively handle both raw-array and wrapped responses.

### 3. Wizard step PATCH returned 400 — `property data should not exist`
**File:** `apps/api/src/attendees/attendees.controller.ts`
**Symptom:** Every wizard step submission failed; attendees were stuck at Step 1.
**Cause:** Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })` strips properties without class-validator decorators. `WizardStepDto.data` had no decorator, so the strict pipe rejected it.
**Fix:** Imported `IsObject` and added `@IsObject()` to `data: Record<string, unknown>`.

### 4. Attendee was permanently bounced to /wizard
**Files:**
- `apps/api/src/attendees/attendees.service.ts` (`getProfile`)
- `apps/web/src/app/(attendee)/layout.tsx`

**Symptom:** Even after wizard completion, every attendee page redirected back to `/wizard`. Matches user's report: "features visible but I can't access them."
**Cause:** Layout guard checked `useAuthStore().profileCompleted` which was only set during the *initial* login or wizard flow. On any page reload, the persisted store was still `false`, even though the DB had `profileCompleted=true`.
**Fix (server):** `getProfile` now returns `profileCompleted` field.
**Fix (client):** Layout reads `profile.profileCompleted` from the API as source of truth, syncs back into the auth store, and waits for the profile fetch to resolve before deciding whether to redirect (no false-bounce on reload).

---

## Verification matrix

### Super Admin (login: `admin@vims-enterprise.com` / `Admin@2026`)

| ID | Feature | Result |
|----|---------|--------|
| S1 | Login → `/admin/overview` | PASS |
| S2 | Platform Overview | PASS |
| S3 | Organisers list | PASS |
| S5 | All Events list | PASS |
| S7 | Deletion Requests | PASS |
| S8 | Support Tickets | PASS |
| S9 | Audit Log | PASS |
| S10 | Admin Settings | PASS |

### Organiser (login: `testorganiser@example.com` / `Organiser@2026`)

| ID | Feature | Result |
|----|---------|--------|
| O1 | Login → `/dashboard` | PASS |
| O2 | Dashboard (KPIs, charts) | PASS |
| O3 | Events list | PASS |
| O4 | **Create Event end-to-end** | **PASS** (was blocked, now creates and redirects to `/events/:id`) |
| O5 | Event detail (stats + QR + actions) | PASS |
| O6 | Edit / Settings | PASS |
| O7 | **Publish Event** (status `Draft → Live`) | PASS |
| O8 | QR code visible + download link | PASS |
| O9 | Attendees list | PASS |
| O10 | **Announcements list** | **PASS** (fixed; was crashing) |
| O11 | Export page | PASS |
| O12 | Account settings | PASS |
| O13 | Sidebar nav (collapse, active state) | PASS |

### Attendee (OTP login: `test@test.com` / Event `cmoj5g67h0003n628x95wm4a9`)

| ID | Feature | Result |
|----|---------|--------|
| A1 | OTP request + verify | PASS |
| A2 | Dynamic event name in header | PASS ("Bengaluru Tech Summit 2026") |
| A3 | Home dashboard | PASS |
| A5–A8 | **Wizard Steps 1–4** | **PASS** (fixed — were 400-erroring) |
| A9 | My Card | PASS |
| A10 | Share My Card button | PASS (drawer opens) |
| A11 | Directory | PASS |
| A12 | Suggestions | PASS |
| A13 | Connections | PASS |
| A14 | Settings | PASS |

---

## Files modified

```
apps/api/src/config/config.service.ts
apps/api/src/attendees/attendees.controller.ts
apps/api/src/attendees/attendees.service.ts
apps/web/src/app/(attendee)/layout.tsx
apps/web/src/app/(organiser)/events/[eventId]/announcements/page.tsx
```

## Outstanding minor observations (non-blocking)

- Bottom mobile nav can intercept clicks on the wizard "Continue" button in narrow viewports — works via keyboard/Enter and at desktop sizes; consider adding `pointer-events: none` on the nav background or extra bottom padding on the wizard form.
- `/organiser/dashboard` and `/organiser/dashboard/stats` endpoints return 404 — the Dashboard page already computes stats client-side from `/events`, so this is harmless but the dead endpoints could be removed from any dashboard wiring or implemented for consistency.
- A 403 was logged for `/events/:id/attendees` when the **attendee** loaded `/home` — that endpoint is organiser-scoped so the 403 is correct, but the home page should not be calling it. Worth a follow-up pass to silence the spurious request.
