# Attendee System Fixes — Design Spec

## Context

The attendee experience is broken across multiple touchpoints: login errors, photo upload failure, hardcoded data, and missing validation. These are blocking bugs, not enhancements. Each fix targets a specific identified issue with minimal scope.

## Fixes

### Fix 1: Photo Upload Endpoint

**File:** `apps/web/src/components/wizard/StepPersonal.tsx`
**Problem:** Calls `/api/upload` — endpoint doesn't exist.
**Fix:** Change to `/storage/upload`. Ensure `Content-Type: multipart/form-data` and auth header are sent.

### Fix 2: OTP Verification Redirect

**File:** `apps/web/src/app/(public)/auth/attendee/verify/page.tsx`
**Problem:** Post-verify redirect may go to deleted `/dashboard` route.
**Fix:** Redirect to `/home` after successful OTP verify. Ensure auth store saves attendee role with `eventId`.

### Fix 3: Dynamic Event Name in Layout

**File:** `apps/web/src/app/(attendee)/layout.tsx`
**Problem:** Hardcoded "TechConnect Summit" in header.
**Fix:** Read event name from auth store (active event ID) or fetch via `GET /events/:eventId`.

### Fix 4: Wire Analytics to Dashboard

**File:** `apps/web/src/app/(attendee)/home/page.tsx`
**Problem:** Shows hardcoded fallback analytics data.
**Fix:** Use existing `useAnalytics` hook from `apps/web/src/lib/hooks/use-attendee.ts` to call `GET /attendees/me/analytics`.

### Fix 5: Wizard Step Validation

**Files:**
- `apps/web/src/components/wizard/StepPersonal.tsx`
- `apps/web/src/components/wizard/StepProfessional.tsx`
- `apps/web/src/components/wizard/StepServices.tsx`
- `apps/web/src/components/wizard/StepPreferences.tsx`

**Problem:** No validation before advancing steps; empty data sent to API.
**Fix:** Each step validates required fields before calling `onNext()`. Show inline error for empty required fields.

### Fix 6: Login Error Handling

**Files:**
- `apps/web/src/app/(public)/auth/attendee/login/page.tsx`
- `apps/web/src/app/(public)/auth/attendee/verify/page.tsx`

**Problem:** No clear error when API is unreachable.
**Fix:** Detect `ERR_NETWORK`/`ECONNREFUSED` and show "Cannot connect to server" message.

## Verification

1. Test attendee OTP login flow: request OTP → verify → redirect to `/home`
2. Test wizard: complete all 4 steps with photo upload, verify data in database
3. Test dashboard: confirm analytics load from API (not hardcoded)
4. Test networking features: suggestions, card sharing
5. Test layout: confirm dynamic event name appears
