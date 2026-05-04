# VIMS Event — Organiser Features Design Spec (OG-1 + OG-3)

**Date:** 2026-05-04
**Workstream:** 5 of N (Verification → Hero → Landing → Attendee unblock → **Organiser features**)
**Status:** Design approved, ready for implementation plan

## Context

The verification report (`docs/superpowers/specs/2026-05-02-verification-report.md`) flagged two Medium-severity organiser-side gaps:

- **`OG-1`** — Organiser cannot manually invite an attendee. The attendees list page is list-only — no "Invite" button. Backend exposes only public self-registration via `POST /events/:eventSlug/register`. There's no organiser-guarded create path.
- **`OG-3`** — `/notifications` page hardcodes 3 fake notifications referring to "TechConnect Summit 2025" (an event that doesn't exist). Zero API calls. No real notification feed for organisers exists. The `Notification` Prisma model is attendee-scoped only (`attendeeId String` not optional, no `organiserId` field), and the existing controller is `@Roles('attendee')` only.

Together these are friction in the organiser's day-to-day workflow: they can't fill seats manually, and the notifications surface lies about what happened in their event.

This workstream resolves both. The two items are independent (different code areas, no shared models or routes) but they bundle naturally as "the organiser's missing chrome."

## Goals

- Ship an authenticated organiser endpoint to invite a single attendee by email + first name, sending an onboarding email automatically.
- Add an `Invite attendee` button + modal to the existing organiser attendees list page.
- Replace the fake notifications page with a real, read-only **Activity feed** computed from existing tables (Attendee, Announcement, plus computed milestones).
- Reuse all existing infrastructure: `MailService` (Zoho SMTP), the WS-4 `useToast` hook, the existing organiser layout chrome.
- No schema changes. No new dependencies.

## Non-Goals

- **No** bulk invite (CSV upload, paste-list, etc.). One attendee per submit.
- **No** schema migration to add organiser-scoped `Notification` rows. The `Notification` model stays attendee-only.
- **No** "Mark all as read" / per-row `isRead` state on the activity feed (compute-based; nothing to mark).
- **No** push notifications, websocket updates, or real-time refresh on the activity feed. It refetches on page load + "Load more."
- **No** "Resend invitation" button (a 409 sender-side could trigger this; deferred to a polish workstream).
- **No** soft-delete handling on attendee invite (the schema doesn't soft-delete; previously-deleted rows aren't a concern).
- **No** profile fields beyond email + first name on the invite modal — attendee fills the rest via the wizard on first login.
- **No** unread badge wiring in the organiser nav. The notifications-bell badge in `(organiser)/layout.tsx` is hidden because compute-based activity has no `isRead` concept.

## Approach

```
┌──────────────────────────────────────────────────────────────┐
│  OG-1 (manual invite)                                        │
│   ├─ POST /events/:eventId/invite-attendee   (organiser)     │
│   ├─ AttendeesService.inviteAttendee()                       │
│   ├─ MailService.sendInviteEmail()                           │
│   └─ <InviteAttendeeModal /> on attendees page               │
│                                                              │
│  OG-3 (activity feed)                                        │
│   ├─ GET /organiser/events/:eventId/activity (organiser)     │
│   ├─ ActivityService.getEventActivity() — composes from      │
│   │    Attendee + Announcement + computed milestones         │
│   └─ /notifications page rewrite (~100 LOC)                  │
└──────────────────────────────────────────────────────────────┘
```

Each side is two backend pieces (route + service method) and one frontend piece (modal or page). Each is independently testable.

## Architecture & File Changes

### OG-1 (manual invite)

| Action | Path | Notes |
|---|---|---|
| **Modify** | `apps/api/src/attendees/attendees.controller.ts` | Add `@Post('events/:eventId/invite-attendee')` route, `@Roles('ORGANISER')`, accepts `InviteAttendeeDto`. ~15 LOC. |
| **Modify** | `apps/api/src/attendees/attendees.service.ts` | Add `inviteAttendee(eventId, organiserId, dto)` — verify event ownership, check email-uniqueness within event, create attendee row, fire email, write audit log entry. ~50 LOC. |
| **Create** | `apps/api/src/attendees/dto/invite-attendee.dto.ts` | `email` (`@IsEmail`) + `firstName` (`@IsString @MinLength(1) @MaxLength(80)`). ~15 LOC. |
| **Modify** | `apps/api/src/mail/mail.service.ts` | Add `sendInviteEmail(to, firstName, eventName, loginLink)` method, follows the existing `sendOtpEmail` pattern. ~20 LOC including HTML + text bodies. |
| **Modify** | `apps/web/src/app/(organiser)/events/[eventId]/attendees/page.tsx` | Add `Invite attendee` button + modal mount. ~15 LOC. |
| **Create** | `apps/web/src/components/organiser/InviteAttendeeModal.tsx` | Modal with email + firstName fields, submit → POST → toast + refetch. ~110 LOC. |
| **Modify** | `apps/web/src/app/(organiser)/layout.tsx` | Mount the global `<Toaster />` (or its inline equivalent) — the WS-4 useToast hook needs a Toaster mounted in this layout for invite success/error toasts to render. Mirrors the WS-4 attendee-layout treatment. ~10 LOC. |

OG-1 net change: **~+235 LOC**.

### OG-3 (activity feed)

| Action | Path | Notes |
|---|---|---|
| **Create** | `apps/api/src/organiser/activity.controller.ts` | Single `@Get('organiser/events/:eventId/activity')` route, `@Roles('ORGANISER')`. ~30 LOC. |
| **Create** | `apps/api/src/organiser/activity.service.ts` | `getEventActivity(eventId, user, page, pageSize)` — verifies ownership, pulls attendees + announcements, computes milestones, merges, sorts, paginates. ~130 LOC. |
| **Modify** | `apps/api/src/organiser/organiser.module.ts` | Register the new controller + service. ~5 LOC. |
| **Modify** | `apps/web/src/app/(organiser)/notifications/page.tsx` | Full rewrite. Drops MOCK array, fetches real activity, handles loading/empty/error/load-more. Renames heading to "Activity" (route stays `/notifications`). ~110 LOC. |
| **Modify** | `apps/web/src/app/(organiser)/layout.tsx` | If a notifications-bell unread-badge is currently bound to mock state, hide/remove the badge (no `isRead` concept in compute-based feed). ~3 LOC. |

OG-3 net change: **~+278 LOC −60 LOC removed mock state ≈ +218 LOC**.

**Workstream total:** roughly **+450 LOC across 11 unique files** (4 new — 1 DTO + 1 activity controller + 1 activity service + 1 invite modal — and 7 modified — 3 backend services/controllers, 1 backend module, 1 attendees page, 1 notifications page, 1 organiser layout). The `(organiser)/layout.tsx` is touched by both OG-1 (mount Toaster) and OG-3 (remove unread badge) — one file, two unrelated edits.

## Endpoint Contracts

### OG-1

```
POST /events/:eventId/invite-attendee     @Roles('ORGANISER')
Auth: organiser JWT
Body: { email: string, firstName: string }
  - email: valid email, max 255 chars
  - firstName: 1–80 chars

Returns 201:
  {
    attendeeId: string,
    email: string,
    firstName: string
  }

Returns 400: validation errors (malformed email, missing firstName)
Returns 403: if event.organiserId !== caller.organiserId, OR event.status === 'DELETED'
Returns 404: if event not found
Returns 409: { message: 'This email is already registered for this event.' }
Returns 500: on email-send failure (row still created — caller sees this only if MailService throws synchronously)
```

### OG-3

```
GET /organiser/events/:eventId/activity?page=1&pageSize=25  @Roles('ORGANISER')
Auth: organiser JWT
Query:
  - page: integer ≥1, default 1
  - pageSize: integer ≥1 ≤50, default 25

Returns 200:
  {
    data: Array<{
      id: string,             // synthetic, e.g. "attendee_registered-cmoo..."
      type: 'attendee_registered' | 'announcement_sent' | 'attendees_milestone' | 'connection_milestone',
      title: string,
      body: string,
      timestamp: string (ISO 8601),
      relatedEntityId?: string  // attendeeId or announcementId
    }>,
    meta: { page, pageSize, total, totalPages }
  }

Returns 403: if event.organiserId !== caller.organiserId
Returns 404: if event not found
```

## OG-1 Implementation Detail

### Service flow (`AttendeesService.inviteAttendee`)

1. `event = prisma.event.findUnique(eventId)` → 404 if not found, 403 if `event.organiserId !== organiserId`, 403 if `event.status === 'DELETED'`
2. `existing = prisma.attendee.findFirst({ where: { eventId, email: { equals: dto.email, mode: 'insensitive' } } })` → if found, throw `ConflictException('This email is already registered for this event.')`
3. `attendee = prisma.attendee.create({ data: { email, firstName, eventId, profileCompleted: false } })`
4. Build login link: `${WEB_BASE_URL}/auth/attendee/login?email=${encodeURIComponent(email)}&eventId=${eventId}` (where `WEB_BASE_URL` is read from `ConfigService` — already in use elsewhere)
5. `try { mailService.sendInviteEmail(email, firstName, event.name, loginLink) } catch (err) { logger.warn('invite email failed', err) }` — never roll back the row
6. Write audit log: `prisma.auditLog.create({ data: { actorRole: 'organiser', actorId: organiserId, action: 'ATTENDEE_INVITED', entityType: 'Attendee', entityId: attendee.id, metadata: { invitedEmail: email, eventId } } })`
7. Return `{ attendeeId: attendee.id, email, firstName }`

### Email template (`MailService.sendInviteEmail`)

Subject: `You're invited to {eventName}`

HTML body (minimal, mirror existing `sendOtpEmail` style):
```html
<p>Hi {firstName},</p>
<p>You've been invited to <b>{eventName}</b>. Open your digital business card and start connecting with attendees:</p>
<p><a href="{loginLink}" style="display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; border-radius: 8px; text-decoration: none;">Open your business card →</a></p>
<p>If the button doesn't work, paste this link into your browser:<br><span style="color: #64748b;">{loginLink}</span></p>
<p style="color: #64748b; font-size: 12px;">— The {eventName} organising team</p>
```

Plain text body: same content, no HTML.

### `InviteAttendeeModal.tsx`

Mirrors WS-4's `ConnectModal` styling (same backdrop, same field/button treatment).

```
[X] Send a request? No — heading reads:
Invite an attendee to {eventName}

Email address       *
[__________________________]

First name          *
[__________________________]

We'll email an invitation with a one-tap login link.

[Cancel]              [Send invitation]
```

State machine: `idle` → `submitting` → `success` (close + toast) | `error` (stay open, inline error).
Esc + backdrop dismiss when not submitting. Focus on email field on open.

On 409 specifically: show inline `This email is already registered for this event.` below the email field (rose-500 small text), keep modal open.

### Attendees page edit

The current page already has a header row with search bar. Add a primary button to the right of search:

```tsx
<button onClick={() => setInviteOpen(true)}>Invite attendee</button>
```

After successful invite (modal's `onSuccess` callback): refetch the attendees list query, modal closes itself.

## OG-3 Implementation Detail

### `ActivityService.getEventActivity(eventId, user, page, pageSize)`

1. `event = prisma.event.findUnique(eventId)` → 404 / 403 ownership check (same pattern as OG-1)
2. **Lookback window:** `lookbackStart = now - 30 days`
3. **Pull recent attendees:**
   ```ts
   prisma.attendee.findMany({
     where: { eventId, registeredAt: { gte: lookbackStart } },
     orderBy: { registeredAt: 'desc' },
     take: 100,
     select: { id: true, firstName: true, lastName: true, company: true, registeredAt: true },
   })
   ```
4. **Pull recent announcements:**
   ```ts
   prisma.announcement.findMany({
     where: { eventId, sentAt: { gte: lookbackStart } },
     orderBy: { sentAt: 'desc' },
     select: { id: true, title: true, recipientCount: true, sentAt: true },
   })
   ```
5. **Compute milestones:**
   - Attendees crossed: at each milestone (25, 50, 100, 250, 500), look up the attendee whose registration crossed it (`OFFSET = milestone-1, LIMIT 1`, ordered by `registeredAt asc`). If `registeredAt >= lookbackStart`, emit a milestone event timestamped at that moment.
   - Connection milestones: same approach for accepted `connectionRequest` rows at thresholds (50, 100, 250, 500, 1000).
6. **Merge & sort:** combine attendee items, announcement items, milestones into one array. Sort by `timestamp desc`. Compute `total = mergedArray.length`.
7. **Paginate:** `merged.slice((page-1)*pageSize, page*pageSize)`. Compute `totalPages = max(1, ceil(total / pageSize))`.
8. **Map to wire shape:**
   - `attendee_registered`: `{ id: 'attendee_registered-' + a.id, type, title: 'New attendee', body: '{first} {last}' + (company ? ' · ' + company : ''), timestamp: a.registeredAt, relatedEntityId: a.id }`
   - `announcement_sent`: `{ id: 'announcement_sent-' + ann.id, type, title: 'Announcement sent', body: '"' + title + '" · sent to ' + recipientCount + ' attendees', timestamp: ann.sentAt, relatedEntityId: ann.id }`
   - `attendees_milestone`: `{ id: 'attendees_milestone-' + threshold, type, title: 'Milestone reached', body: threshold + ' attendees registered so far', timestamp }` (no `relatedEntityId`)
   - `connection_milestone`: similar shape, `body: 'Your event hit ' + threshold + ' accepted connections'`

Performance note: 30-day lookback + take=100 attendees + announcement count is bounded; merge+sort is in-memory and small. Acceptable for MVP. If a single event ever exceeds 100 attendees in 30 days, the older ones are clipped — that's fine for MVP, future polish can paginate the source queries.

### Page rewrite (`(organiser)/notifications/page.tsx`)

```tsx
"use client";

// Drop the MOCK array entirely. New shape:

const TYPE_ICONS: Record<ActivityType, ReactNode> = {
  attendee_registered: <UserPlusIcon />,    // emerald
  announcement_sent: <MegaphoneIcon />,     // indigo
  attendees_milestone: <StarIcon />,         // amber
  connection_milestone: <LinkIcon />,        // amber
};

const TYPE_COLORS: Record<ActivityType, string> = {
  attendee_registered: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
  announcement_sent: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
  attendees_milestone: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
  connection_milestone: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
};

// On mount: useAuthStore for eventId, fetch /organiser/events/:eventId/activity?page=1&pageSize=25
// Render: skeleton → list → empty / error fallbacks
// "Load more" appends pages
```

### Page heading and copy

- Heading: `Activity`
- Subhead: `What's happening in your event`
- Empty state: `No activity yet. Once attendees register or you send announcements, you'll see them here.`
- Error state: `Could not load activity. Try again.` + Retry button
- Each card: type-coloured icon (left) + title + body (centre) + relative timestamp (right)
- Footer: `Load more →` button when `meta.page < meta.totalPages`

### Removed UI

- `Mark all as read` button — gone (no concept)
- Unread count subhead `{unread} unread` — gone

### Layout badge handling

Find any unread-count rendering in the organiser layout — if it exists, remove the badge dot and any binding to local state. (Specifically inspect `apps/web/src/app/(organiser)/layout.tsx` for an `unreadCount` reference and excise it.)

## Visual Design

Both surfaces use the existing `(organiser)` light/dark-aware theme (NOT the landing's pure-dark D2). Tokens used: `bg-card`, `bg-muted`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, plus the type-coloured emerald/indigo/amber accents on activity icons.

### Modal (OG-1)

- Backdrop: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`
- Card: `relative w-full max-w-md rounded-2xl bg-card border border-border p-6 sm:p-8`
- Inputs: `w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40`
- Buttons: primary `bg-primary text-primary-foreground hover:bg-primary/90`, secondary `text-foreground hover:bg-muted`
- Inline error (rose-500 small text below the relevant field)

### Activity card (OG-3)

- Container: `flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors`
- Icon: 36×36 rounded square with type colour
- Centre: title (`text-sm font-semibold text-foreground`) + body (`text-xs text-muted-foreground mt-0.5 leading-relaxed`)
- Right: relative timestamp (`text-xs text-muted-foreground/60`)

## Accessibility

- Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="invite-modal-title"`, focus trap via existing pattern (focus on email field at open, blur returns to trigger button on close)
- Activity feed: `<ul role="list">` of `<li>` items; each card uses semantic structure (icon `aria-hidden="true"`, title `<p>` not `<h3>` since it's a list item description, timestamp `<time datetime={iso}>`)
- Empty/error/loading states all have appropriate `<p role="status">` / `aria-live="polite"` where relevant
- Toast hook from WS 4 already covers `role="alert"`/`role="status"`

## Audit log

- OG-1: every successful invite writes one row: `actorRole='organiser'`, `actorId=organiserId`, `action='ATTENDEE_INVITED'`, `entityType='Attendee'`, `entityId=attendee.id`, `metadata: { invitedEmail, eventId }`. Reuses the existing `prisma.auditLog.create` pattern (the model exists; verified during exploration).
- OG-3: read-only — no audit writes.

## Edge Cases & Failure Modes

| Case | Handling |
|---|---|
| Mail send fails (Zoho timeout / down) | Row already created. Log warning. Caller still sees success toast. Out of scope to surface mail errors back to organiser; future "Resend" button covers this. |
| Race: two organiser sessions invite same email simultaneously | Postgres unique constraint on `(eventId, email)` — second insert returns DB error → caught and re-thrown as `ConflictException` (same shape as the explicit pre-check). Verify the constraint exists in schema; if not, add it (this is a separate ≤1-line schema change, but the Attendee model already has `@@unique([eventId, email])` per current schema). |
| Activity page on event with 0 attendees + 0 announcements | Empty state copy renders. No skeletons stuck. |
| Milestone item appears on page 2 even though triggered before page 1's last item | Acceptable — sort is by timestamp; if a milestone timestamps slightly before a registration that's also recent, it could appear lower in the list. User clicks "Load more" naturally. |
| Email contains uppercase | Normalised at the `findFirst` level via `mode: 'insensitive'`. Stored as-typed (so display is preserved). |
| firstName contains emoji or RTL characters | Allowed (no validator restriction beyond length). Email salutation passes through whatever they typed. |
| eventId in URL doesn't match caller's organiserId | 403 with consistent message |

## Performance

- Invite endpoint: 2 DB reads + 1 write + 1 mail send (async). <500ms typical.
- Activity endpoint: 2 reads + up to 10 milestone-lookup queries + in-memory merge. Conservatively <300ms typical for events under 100 attendees / 30 announcements.
- No new dependencies.

## Testing Approach

### OG-1

- Manual E2E via Playwright as organiser:
  1. Navigate to `/events/<eventId>/attendees`
  2. Click `Invite attendee` → modal opens
  3. Fill `test-invite-{timestamp}@example.com` + `Test`, click Send → toast `Invitation sent to ...`, modal closes, new row appears in list
  4. Re-open modal, fill same email + name → inline 409 error visible, modal stays open
  5. Verify Prisma `auditLog` row exists with `action='ATTENDEE_INVITED'`
  6. Verify mail send: in dev mode, the `MailService` either logs the email body or hits the Zoho catch-all — confirm via `/tmp/dev-server.log` showing the send attempt
- DB cleanup: delete invited test rows after each run

### OG-3

- Manual E2E as organiser to an event with ≥3 attendees + ≥1 announcement (use `cmoj5g67h0003n628x95wm4a9` Bengaluru Tech Summit which has 8 attendees and (after WS-1 cleanup) 0 announcements — so create one announcement first via the existing announcements endpoint to get cross-type data):
  1. Navigate to `/notifications`
  2. Verify "Activity" heading + subhead
  3. Verify mixed feed shows recent registrations + the announcement(s)
  4. Verify ordering is timestamp-desc
  5. Empty-state path: visit a hypothetical event with 0 attendees & 0 announcements (or assert empty branch via direct API call)
  6. 403 path: tamper with eventId in URL → matches AT-1 pattern from WS 4
  7. Console clean across all flows

No automated unit tests — all components are presentational + simple state machines, verifiable by visual + network inspection.

## Out-of-scope follow-ups

- Bulk invite (CSV upload / paste-list)
- "Resend invitation" action on existing PENDING attendees
- Real-time activity refresh (websocket or 30s polling)
- Push notifications for organiser (would need a real `Notification` schema extension — was N1 in brainstorming; deferred)
- Per-row dismiss / archive on activity feed
- Type-filtered activity feed (e.g., "show only registrations")
- Activity feed for super-admin (cross-event)
- Localisation of email template + activity titles

## Hand-off

This workstream completes WS 5. After it ships:

- The 5 deferred WS-1 items reduce to 3: AT-3, AT-4, `/events/new` wizard split.
- WS 6 candidate (attendee polish — AT-3 + AT-4) is the smallest remaining, ~60 LOC across 4 step components + 1 settings page edit.
- WS 7 candidate (`/events/new` wizard split) is a pure-UI refactor.

No new follow-ups created by this workstream's design itself.
