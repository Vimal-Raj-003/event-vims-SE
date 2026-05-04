# VIMS Event — Attendee Polish Design Spec (AT-3 + AT-4)

**Date:** 2026-05-04
**Workstream:** 6 of N (Verification → Hero → Landing → Attendee unblock → Organiser features → **Attendee polish**)
**Status:** Design approved, ready for implementation plan

## Context

Two Low-severity attendee-side gaps from WS-1 verification:

- **`AT-3`** — Wizard step components (`StepPersonal`, `StepProfessional`, `StepServices`, `StepPreferences`) initialise their form state from `defaultValues` only at first render via `useState`. When `useAttendeeProfile()` resolves *after* mount (cold cache), the form remains blank for already-completed users. They could accidentally overwrite their profile by clicking Continue without re-typing.
- **`AT-4`** — `/settings` exposes Download Data, Request Deletion (yes/no), and Logout. The schema's `Attendee.isPaused` field — used by the connections rate-limiter — has no UI control. Deletion dialog has no free-text reason input; the server auto-fills a generic reason.

Both items are pure polish. Combined, the smallest workstream so far.

## Goals

- **AT-3:** Each of the 4 wizard step components reflects `defaultValues` whenever it resolves async, without clobbering input the user has already typed.
- **AT-4 (a):** Add an inline Switch on `/settings` that flips `attendees.isPaused` via the existing `PATCH /attendees/me` route. Optimistic UI; toast on success.
- **AT-4 (b):** Add an optional reason textarea to the existing deletion confirmation step. The reason flows through to `data_deletion_requests.reason` when the user types one; otherwise the server's auto-generated reason continues to apply.
- Reuse existing infrastructure: `apiClient`, `useToast` (mounted in attendee layout per WS 4), `useAttendeeProfile`.
- No new dependencies. No schema migration.

## Non-Goals

- **No** conversion to react-hook-form. The fix is local; the wizard's internal contract stays the same.
- **No** "Are you sure?" modal before flipping the pause switch. Pause is reversible — friction isn't earning anything.
- **No** required reason on deletion. Optional only.
- **No** new layout for `/settings`. The new Switch slots above the existing actions; the existing dialog is patched in place.
- **No** changes to other wizard wiring (validation, submission, `WizardStepDto`, server-side wizard step persistence).
- **No** UI for "view paused state" on the public profile (that's a separate visual decision).

## Approach

```
┌──────────────────────────────────────────────────────────────┐
│  AT-3 (each step component)                                  │
│   ├─ Add useEffect([defaultValues]) → setForm(reset map)     │
│   └─ Guard with hasUserEdited useRef so user typing wins     │
│                                                              │
│  AT-4 (a) Pause toggle                                       │
│   ├─ Extend UpdateAttendeeProfileDto  (+ @IsBoolean isPaused)│
│   ├─ Verify service.updateProfile persists the field         │
│   └─ Settings page: Switch row + apiClient.patch + toast     │
│                                                              │
│  AT-4 (b) Deletion reason                                    │
│   ├─ POST /attendees/me/request-deletion accepts             │
│   │   optional { reason } body                               │
│   ├─ ComplianceService prefers user reason when provided     │
│   └─ Settings page: textarea inside the existing dialog      │
└──────────────────────────────────────────────────────────────┘
```

## Architecture & File Changes

### AT-3 (modify only)

| Action | Path | Notes |
|---|---|---|
| **Modify** | `apps/web/src/components/wizard/StepPersonal.tsx:13-19` | Add `useEffect` + `useRef` for `hasUserEdited` guard. ~10 LOC. |
| **Modify** | `apps/web/src/components/wizard/StepProfessional.tsx:13-22` | Same pattern, mapped to professional fields. ~10 LOC. |
| **Modify** | `apps/web/src/components/wizard/StepServices.tsx` | Same pattern, mapped to services-step fields. ~10 LOC. |
| **Modify** | `apps/web/src/components/wizard/StepPreferences.tsx` | Same pattern, mapped to preferences-step fields. ~10 LOC. |

### AT-4

| Action | Path | Notes |
|---|---|---|
| **Modify** | `apps/api/src/attendees/attendees.controller.ts:48-63` | Add `@IsOptional() @IsBoolean() isPaused?: boolean;` to `UpdateAttendeeProfileDto`. ~1 LOC. |
| **Verify/modify** | `apps/api/src/attendees/attendees.service.ts` (`updateProfile`) | Confirm Prisma update includes `isPaused`. If the method spreads dto into `data`, no change needed. If it cherry-picks fields, add `isPaused` to the picked list. ≤3 LOC. |
| **Modify** | `apps/api/src/compliance/compliance.controller.ts:35-39` | Accept optional `@Body() dto: RequestDeletionDto`. ~3 LOC. |
| **Modify** | `apps/api/src/compliance/compliance.service.ts:131` (`requestDeletion`) | Use `dto.reason` when present; fall back to existing auto-generated reason. ~5 LOC. |
| **Inline DTO** | `apps/api/src/compliance/compliance.controller.ts` | Tiny inline DTO `RequestDeletionDto { @IsOptional() @IsString() @MaxLength(500) reason?: string }`. ~5 LOC. |
| **Modify** | `apps/web/src/app/(attendee)/settings/page.tsx` | Add: (1) Pause Switch row above existing actions; (2) optional `<textarea>` inside the existing deletion confirm dialog. Pass `reason` to the POST when non-empty. ~50 LOC added. |

**Workstream total:** roughly **+95 LOC across 8 files**. Smallest of all workstreams to date.

## AT-3 Implementation Detail

Each step component follows the exact pattern below. The step-specific portion is the field-name list inside the reset call.

### Pattern (illustrated with StepProfessional)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { INDUSTRIES, BUSINESS_TYPES, COMPANY_SIZE_OPTIONS } from "@vims-events/shared";

interface StepProfessionalProps {
  defaultValues?: Record<string, unknown>;
  onNext: (data: Record<string, unknown>) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function StepProfessional({ defaultValues, onNext, onBack, isLoading }: StepProfessionalProps) {
  const [form, setForm] = useState({
    company: (defaultValues?.company as string) ?? "",
    designation: (defaultValues?.designation as string) ?? "",
    occupation: (defaultValues?.occupation as string) ?? "",
    industry: (defaultValues?.industry as string) ?? "",
    businessType: (defaultValues?.businessType as string) ?? "",
    city: (defaultValues?.city as string) ?? "",
    companySize: (defaultValues?.companySize as string) ?? "",
  });
  const hasUserEdited = useRef(false);

  // Reset when defaultValues resolves async — but only if the user hasn't typed yet
  useEffect(() => {
    if (!defaultValues) return;
    if (hasUserEdited.current) return;
    setForm({
      company: (defaultValues.company as string) ?? "",
      designation: (defaultValues.designation as string) ?? "",
      occupation: (defaultValues.occupation as string) ?? "",
      industry: (defaultValues.industry as string) ?? "",
      businessType: (defaultValues.businessType as string) ?? "",
      city: (defaultValues.city as string) ?? "",
      companySize: (defaultValues.companySize as string) ?? "",
    });
  }, [defaultValues]);

  const update = (patch: Partial<typeof form>) => {
    hasUserEdited.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // ... unchanged JSX, except replace `setForm({ ...form, X: value })` with `update({ X: value })`
}
```

### Why a `hasUserEdited` ref

If the wizard mounts with `defaultValues = undefined`, the form stays blank. The user starts typing. Then `useAttendeeProfile()` resolves and `defaultValues` becomes available. Without the ref, the effect would fire and clobber what the user typed.

With the ref:
- Initial mount: `hasUserEdited.current = false`, effect bypassed (no `defaultValues` yet)
- `defaultValues` resolves: effect fires, `hasUserEdited.current` still false → reset runs (the user hasn't typed)
- User types one character: `hasUserEdited.current = true` (via `update()`)
- Any subsequent `defaultValues` reference change: effect bypassed → user input wins

### Field mappings per step

The exact field list in the `setForm` payload differs per step. Implementer should mirror the existing `useState` initialiser inside each step file's `useEffect`:

- **StepPersonal**: `firstName`, `lastName`, `phone`, `bio`, `profilePhotoUrl`, `companyLogoUrl` (or whatever its current `useState` shape is)
- **StepProfessional**: as shown above (already validated against the file)
- **StepServices**: `services[]`, `tags[]`
- **StepPreferences**: `interestedIn`, `networkingGoals`, `linkedinUrl`, `websiteUrl`, `twitterHandle`

The implementer reads each step's existing `useState({...})` block and mirrors the field list into the new `useEffect`.

## AT-4 Implementation Detail

### Pause toggle backend

Update `UpdateAttendeeProfileDto`:

```ts
class UpdateAttendeeProfileDto {
  // ... existing fields unchanged
  @IsOptional() @IsBoolean() isPaused?: boolean;
}
```

Verify `attendees.service.ts updateProfile`:

```ts
async updateProfile(attendeeId: string, dto: UpdateAttendeeProfileDto) {
  const updated = await this.prisma.attendee.update({
    where: { id: attendeeId },
    data: dto,  // ← this is the spread shape; isPaused flows through automatically
    // ...
  });
  return updated;
}
```

If the service cherry-picks fields explicitly (e.g. `data: { firstName: dto.firstName, ... }`), add `isPaused: dto.isPaused` to the picked list.

### Pause toggle UX (settings page)

New row added **above** the existing Download Data card:

```tsx
<div className="rounded-2xl border border-border bg-card p-5">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="font-semibold text-foreground">Pause profile</h2>
      <p className="mt-0.5 text-sm text-muted-foreground">
        People can&apos;t request to connect while paused.
      </p>
    </div>
    <button
      role="switch"
      aria-checked={isPaused}
      onClick={togglePause}
      disabled={pauseSubmitting}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        isPaused ? "bg-primary" : "bg-muted"
      } disabled:opacity-60`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
          isPaused ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  </div>
</div>
```

Logic:

```tsx
const [isPaused, setIsPaused] = useState<boolean>(profile?.isPaused ?? false);
const [pauseSubmitting, setPauseSubmitting] = useState(false);

useEffect(() => {
  setIsPaused(profile?.isPaused ?? false);
}, [profile?.isPaused]);

async function togglePause() {
  const next = !isPaused;
  setIsPaused(next); // optimistic
  setPauseSubmitting(true);
  try {
    await apiClient.patch("/attendees/me", { isPaused: next });
    showToast(next ? "Profile paused" : "Profile unpaused");
  } catch {
    setIsPaused(!next); // revert
    showToast("Could not update");
  } finally {
    setPauseSubmitting(false);
  }
}
```

### Deletion reason backend

Add tiny DTO at the top of `compliance.controller.ts` (alongside the file's other tiny inline classes if any, or at the top):

```ts
class RequestDeletionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
```

Update the route:

```ts
@Post('request-deletion')
@HttpCode(HttpStatus.CREATED)
async requestDeletion(
  @CurrentUser() user: CurrentUserData,
  @Body() dto: RequestDeletionDto,
) {
  return this.complianceService.requestDeletion(user, dto);
}
```

Update the service:

```ts
async requestDeletion(user: CurrentUserData, dto: RequestDeletionDto) {
  // ... existing attendee lookup
  const userReason = dto?.reason?.trim();
  const reason = userReason
    ? `${userReason}\n\n— submitted by ${attendee.firstName} ${attendee.lastName} (${attendee.email})`
    : `Data deletion requested by attendee ${attendee.firstName} ${attendee.lastName} (${attendee.email})`;

  const deletionRequest = await this.prisma.dataDeletionRequest.create({
    data: { requesterEmail, eventId, reason, status: 'PENDING' },
  });
  // ... rest unchanged
}
```

The combined-reason format (user reason + auto trailer) preserves traceability for super-admins who process requests.

### Deletion reason UX (settings page)

Inside the existing deletion confirmation dialog (the part rendered when the user clicks "Request Data Deletion" the first time), add a textarea above the confirm/cancel buttons:

```tsx
<label className="block">
  <span className="block text-sm font-medium text-foreground mb-1.5">
    Tell us why <span className="text-muted-foreground font-normal">(optional)</span>
  </span>
  <textarea
    value={deletionReason}
    onChange={(e) => setDeletionReason(e.target.value)}
    maxLength={500}
    placeholder="Helps us improve. Leave blank if you'd rather not say."
    className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:border-primary/40"
  />
  <p className="mt-1 text-xs text-muted-foreground/60 text-right">
    {deletionReason.length} / 500
  </p>
</label>
```

Wire the existing submit handler:

```tsx
const trimmed = deletionReason.trim();
await apiClient.post("/attendees/me/request-deletion", trimmed ? { reason: trimmed } : {});
```

The two-state confirmation flow (initial action → expanded dialog with confirm + textarea) is unchanged from current. Only the textarea is new.

## Visual Design

Follows existing attendee-app theme tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, `bg-muted`). No bracket-syntax opacities required — all values used (`/40`, `/60`) are in the default Tailwind scale.

## Accessibility

- **Pause Switch**: `role="switch"`, `aria-checked={boolean}`, full-width tappable target on mobile (44×44 minimum target zone via padding around the visual track).
- **Reason textarea**: `<label>` with `htmlFor` linking to the textarea's `id`. `maxLength` enforced client-side; backend `@MaxLength(500)` enforces server-side.
- **Toasts**: pre-existing pattern from WS 4 already covers `role="status"`/`role="alert"`.
- **Wizard steps**: no a11y change. The existing inputs and submit handlers stay.

## Testing Approach

### AT-3

Manual smoke via Playwright as Rahul (attendee with completed profile):

1. Hard refresh `/wizard`. Step 1 (Personal) renders — assert `firstName` and `lastName` inputs are populated within ~1s of page load (cold cache → `defaultValues` resolves → effect resets state).
2. Click Continue → Step 2 (Professional) — assert `company` / `designation` etc. populated.
3. Click Continue → Step 3 (Services) — assert services tags pre-selected.
4. Click Continue → Step 4 (Preferences) — assert `interestedIn` / `linkedinUrl` etc. populated.
5. Edit a field on Step 1, then navigate Back from Step 2 → confirm the edit is preserved (the effect didn't clobber the user's input).

### AT-4

1. Navigate to `/settings` as Rahul. Assert the Pause Switch row is visible above the Download Data card. Initial state matches `attendees.isPaused` for this user (probably `false`).
2. Click the switch → assert UI flips immediately. Network panel shows `PATCH /attendees/me` with body `{ isPaused: true }` returning 200. Toast `Profile paused` appears.
3. DB query: `SELECT is_paused FROM attendees WHERE id = '<rahul-id>'` returns `true`. Click again to revert.
4. Click `Request Data Deletion`. Confirmation dialog opens — textarea visible, char counter at `0 / 500`.
5. Type a 50-character reason, click `Yes, request deletion`. Network panel shows `POST /attendees/me/request-deletion` with `{ reason: "..." }` returning 201.
6. DB query: `SELECT reason FROM data_deletion_requests WHERE requester_email = '<rahul-email>' ORDER BY requested_at DESC LIMIT 1` — confirm reason starts with the user-typed text and appends the auto-trailer.
7. Cleanup: delete the test deletion-request row at end of run.

No automated unit tests required — these are presentational + state-machine fixes verifiable by inspection.

## Out-of-scope follow-ups

- "Are you sure?" confirm modal on the pause switch (low value; skipped per design).
- A "paused" indicator on the public profile (`/profile/[id]`) so peers see why connect is unavailable.
- Email confirmation when a deletion request is created.
- Allow the user to cancel/withdraw a pending deletion request (super-admin currently processes; users can't undo today).
- React Hook Form conversion of the wizard (would replace the `useEffect` pattern entirely; out of scope).
- Pause-profile auto-resume scheduler ("pause for 7 days, then re-enable").

## Hand-off

This workstream completes WS 6. After it ships, the original 7 deferred WS-1 items reduce to 1: **the `/events/new` wizard split**. That's a pure-UI multi-step refactor and would be a natural WS 7 — or a candidate to skip entirely as cosmetic.
