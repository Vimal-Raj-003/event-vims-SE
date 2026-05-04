# VIMS Event — Attendee Unblock Design Spec

**Date:** 2026-05-04
**Workstream:** 4 of N (Verification → Hero → Landing → **Attendee unblock**)
**Status:** Design approved, ready for implementation plan

## Context

The verification report (`docs/superpowers/specs/2026-05-02-verification-report.md`) flagged two High-severity bugs that together break the attendee social experience:

- **`AT-1`** — `/directory` calls `GET /events/:eventId/attendees`, which is decorated `@Roles('ORGANISER')`. Every attendee gets 403. The page renders "0 people, No attendees found" even when the event has dozens of attendees.
- **`AT-2`** — Three pages (`home` suggestion cards, `home` recent viewers, `suggestions` cards) link to `/profile/<id>`. The dynamic route doesn't exist; every link 404s. Backend endpoints (`GET /attendees/:id/profile`, `POST /attendees/:id/view`, `GET /attendees/:id/vcard`) are wired and functional — only the frontend route is missing.

Together, attendees today literally cannot see other attendees or initiate connection requests via the UI. This is a critical product gap.

This workstream resolves both items in one spec because they're tightly coupled — the directory's clickable cards link to the profile page, and the profile page links back to the directory's source attendees. Either alone is half a feature.

## Goals

- Make `/directory` accessible to attendee role with privacy-safe field set (no email, no phone — matches existing `getPublicProfile` server-side enforcement).
- Ship the missing `/profile/[attendeeId]` page with a mobile-first stacked layout and a sticky bottom action bar (Connect / Save vCard).
- Connect button opens a modal with optional 200-char message (the schema already supports `ConnectionRequest.message`).
- Action bar's Connect button is state-aware: distinct visuals for not-connected / pending-sent / pending-received / accepted / self.
- View tracking fires once per page mount with a `source` query param (`directory` / `home` / `home_viewers` / `suggestions` / `direct`).
- All four existing callers (3 `/profile/<id>` link sites + the directory) now resolve correctly.

## Non-Goals

- **No** wider `/directory` redesign — the page gets the minimal change needed (per-card `<Link>` wrap + restored attendee list); broader filter/UX work is deferred.
- **No** message-only / DM functionality. Connection request is the only mechanism for talking to someone before acceptance.
- **No** "people who viewed your profile" feature beyond what already exists in the home page's `recent viewers` row (already shipped).
- **No** new analytics tracking beyond what `POST /attendees/:id/view` already writes.
- **No** push notification on connection request (existing notifications model is mock UI; that's `OG-3`, deferred to a later workstream).
- **No** changes to the `card/page.tsx` share URL behaviour (kept `/profile/${id}` without `?from`).
- **No** profile editing UI — this page is the *public* profile of someone else; users edit their own profile via the wizard.

## Approach

```
┌──────────────────────────────────────────────────────────────┐
│  Backend (AT-1)                                              │
│   • controller.ts:103  @Roles('ORGANISER','ATTENDEE')        │
│   • service.ts:findAll role-aware (organiser vs attendee)    │
│   • service.ts:getPublicProfile + connectionStatus expansion │
│                                                              │
│  Frontend (AT-2 + directory wire-up)                         │
│   ├─ /profile/[attendeeId]/page.tsx           (orchestrator) │
│   ├─ /profile/[attendeeId]/loading.tsx        (skeleton)     │
│   ├─ /profile/[attendeeId]/not-found.tsx      (404)          │
│   ├─ components/profile/ProfileActionBar.tsx  (sticky bar)   │
│   └─ components/profile/ConnectModal.tsx      (modal+form)   │
│                                                              │
│  Frontend (link wire-ups)                                    │
│   ├─ directory/page.tsx           wrap each card in <Link>   │
│   ├─ home/page.tsx                add ?from=home / _viewers  │
│   └─ suggestions/page.tsx         add ?from=suggestions      │
└──────────────────────────────────────────────────────────────┘
```

Backend changes are minimal (one role list addition + one role-aware branch + one connection-status expansion). The frontend is the bulk of the work, but each component has a single clear responsibility and stays under 200 LOC.

## Architecture & File Changes

### Backend (AT-1)

| Action | Path | Notes |
|---|---|---|
| **Modify** | `apps/api/src/attendees/attendees.controller.ts:103-120` | Change `@Roles('ORGANISER')` to `@Roles('ORGANISER', 'ATTENDEE')` on the `findAll` route. Pass `user` (full `CurrentUserData`) instead of just `user.organiserId!`. |
| **Modify** | `apps/api/src/attendees/attendees.service.ts:122-200` | `findAll` becomes role-aware: organisers continue with the existing event-ownership check; attendees verify `attendee.eventId === eventId` and exclude self. Field select also branches: organisers keep current select; attendees use `ATTENDEE_LIST_SELECT` (mirrors `getPublicProfile` same-event branch — no email, no phone). |
| **Modify** | `apps/api/src/attendees/attendees.service.ts:680-738` | `getPublicProfile` same-event branch: in addition to `ACCEPTED`, also detect PENDING and tag the response with `connectionStatus: 'PENDING_SENT' \| 'PENDING_RECEIVED' \| 'ACCEPTED' \| null`. Adds one extra `connectionRequest.findFirst` keyed on PENDING. |

**Field set for `ATTENDEE_LIST_SELECT` (and matches `getPublicProfile` same-event branch):**
```
id, firstName, lastName, designation, company, businessType, industry,
services, tags, city, profilePhotoUrl, companyLogoUrl, interestedIn,
networkingGoals, linkedinUrl, websiteUrl, twitterHandle
```
**Excluded:** `email`, `phone`, `bio` (until ACCEPTED), and any non-public columns in the schema.

**Self-exclusion in directory:** when caller is attendee, append `where.id = { not: user.sub }` to the query so the user never sees themselves in their own directory.

Backend net change: ~30 added lines, ~5 removed lines.

### Frontend (AT-2 main page)

| Action | Path | Notes |
|---|---|---|
| **Create** | `apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx` | Page orchestrator. ~180 LOC. `"use client"` (modal state, view-tracking effect, search params). |
| **Create** | `apps/web/src/app/(attendee)/profile/[attendeeId]/loading.tsx` | Next.js loading state. Skeleton matching the L3 layout (hero gradient + 3-4 placeholder section cards + sticky bar placeholder). ~30 LOC. |
| **Create** | `apps/web/src/app/(attendee)/profile/[attendeeId]/not-found.tsx` | Next.js 404. Friendly copy ("This attendee isn't in your event."), Back-to-directory link. ~25 LOC. |
| **Create** | `apps/web/src/components/profile/ProfileActionBar.tsx` | Sticky bottom action bar. Renders state-aware Connect button + vCard download. Five visual states. ~60 LOC. |
| **Create** | `apps/web/src/components/profile/ConnectModal.tsx` | Modal portion with backdrop, 200-char textarea + counter, Submit / Cancel, error display. ~70 LOC. |

### Frontend (link wire-ups — small edits)

| Action | Path | Notes |
|---|---|---|
| **Modify** | `apps/web/src/app/(attendee)/directory/page.tsx` | Wrap each attendee card in `<Link href={`/profile/${a.id}?from=directory`}>` (the API call itself just starts working once AT-1 lands; no other directory change). |
| **Modify** | `apps/web/src/app/(attendee)/home/page.tsx:157` | Append `?from=home` to suggestion-card hrefs. |
| **Modify** | `apps/web/src/app/(attendee)/home/page.tsx:209` | Append `?from=home_viewers` to recent-viewer hrefs. |
| **Modify** | `apps/web/src/app/(attendee)/suggestions/page.tsx` | Append `?from=suggestions` to suggestion hrefs. |

### Optional toast hook

A small `useToast` hook may be needed (`Request sent`, `vCard downloaded`). At implementation time:
- If a shared toast pattern already exists in `apps/web/src/components/`, reuse it.
- If not, ship a minimal local hook in `apps/web/src/hooks/use-toast.ts` (~20 LOC) — single global state, dismisses after 3 seconds, no transitions.

### Total LOC

Backend: ~+30. Frontend new components: ~+365. Frontend link edits: ~+15 (5 hrefs touched). Total ≈ **+410 LOC, −5 LOC**. Net **~+405 LOC**.

## Routing & Data Flow

### URL convention

```
/profile/[attendeeId]?from=<source>
```

`source` is one of: `directory` · `home` · `home_viewers` · `suggestions` · `direct` (default when no `?from`).

The `?from` param is read into the `POST /attendees/:id/view` body as `source`, which already maps to the `profile_views.source` column. (The schema already accepts arbitrary string sources; no schema migration.)

### Page lifecycle

1. **Render** → `loading.tsx` skeleton shows until SWR resolves.
2. **Fetch** `GET /attendees/:id/profile` (existing endpoint, returns the privacy-safe shape + `connectionStatus`).
3. **404 / 403** → call Next.js `notFound()` to render `not-found.tsx`. (403 is mapped to 404 to avoid leaking that the attendee exists in another event.)
4. **Self-view** → if `params.attendeeId === useAuthStore().user.id`, render `This is your profile — view your business card instead` with a `/card` link. Skip view-tracking and the action bar.
5. **View tracking** → on first mount after profile loads, fire `POST /attendees/:id/view { source }`. Guard against React 18 strict-mode double-fire with a `useRef` flag. Fail silently.
6. **Connect** → opens `ConnectModal`. On submit, optimistic-update `connectionStatus` to `PENDING_SENT`, close modal, show toast `Request sent`. On error, stay open with inline error; do not optimistic-update.
7. **Accept / Decline** (PENDING_RECEIVED state) → calls existing `PATCH /events/:eventId/connections/:id/accept` or `/decline`. Optimistic update.
8. **Save vCard** → `window.open('/api/v1/attendees/:id/vcard', '_blank')`. Toast `vCard downloaded`.

### Connection-state matrix

| `profile.connectionStatus` | Action bar primary | Action bar secondary |
|---|---|---|
| `null` (no request) | **Connect →** (indigo, opens modal) | ⤓ Save vCard |
| `'PENDING_SENT'` | **Pending** (muted, disabled) | ⤓ Save vCard |
| `'PENDING_RECEIVED'` | **Accept** (emerald) **·** **Decline** (ghost) | hidden |
| `'ACCEPTED'` | **Connected ✓** (emerald, disabled) | ⤓ Save vCard |
| (self viewing self) | (entire bar hidden) | inline `This is you` link to `/card` |

## Visual Design

The authenticated app uses a theme-aware light/dark palette (NOT the landing's pure-dark D2 — landing is its own visual chapter; the app reverts to the existing shadcn-style theme). All styling below uses Tailwind's semantic tokens (`bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`) so dark-mode toggle behaves correctly.

### Hero band

- `relative rounded-3xl p-6 sm:p-8 mb-4 overflow-hidden`
- Background: `bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500`
- Avatar: 72×72 white-bordered circle, fallback to gradient initials block
- Name: `text-2xl font-bold text-white`
- Role: `text-sm text-white/85` (`{designation} · {company}`)
- Meta pill: `inline-flex items-center gap-1.5 px-3 py-1 mt-3 rounded-full bg-white/15 backdrop-blur-md text-xs text-white` — combines `industry · city`

### Section cards

- `rounded-2xl border border-border bg-card p-5`
- Section header: `text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3`
- Body: `text-sm text-foreground leading-relaxed`
- Conditional render: only show the card if data is non-empty
- If the entire content area is empty: single muted line `This attendee hasn't filled out their profile yet.`

### Service / tag chips

- `inline-block px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary`
- Wrap horizontally with `gap-1.5 flex-wrap`

### Sticky action bar

- `fixed bottom-0 inset-x-0 bg-card border-t border-border p-3 sm:p-4 z-30`
- `flex items-center gap-3 max-w-2xl mx-auto`
- Primary button: `flex-1 h-11 rounded-xl font-semibold` — colour per state (indigo / muted / emerald)
- Secondary button: `h-11 px-4 rounded-xl bg-muted text-foreground font-semibold` — vCard download

### Modal (ConnectModal)

- Backdrop: `fixed inset-0 z-50 bg-black/50 backdrop-blur-sm`
- Card: `relative max-w-md mx-auto mt-20 sm:mt-32 rounded-2xl bg-card border border-border p-6 sm:p-8`
- Title: `Send a connection request to {firstName}` — `text-lg font-semibold text-foreground`
- Subhead: `A short note helps them remember you.` — `text-sm text-muted-foreground mb-4`
- Textarea: `w-full min-h-[100px] max-h-[180px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:border-primary/40` with `maxLength={200}`
- Char counter: `text-xs text-muted-foreground` aligned right (`{message.length} / 200`)
- Button row: `flex gap-2 justify-end mt-4` — Cancel (ghost) + Send Request (primary)
- Esc key + backdrop click dismiss; submitting disables both buttons

## Accessibility

- The action bar uses `role="region"` and `aria-label="Connection actions"`.
- The modal uses `role="dialog"`, `aria-modal="true"`, `aria-labelledby` pointing at its title id, focuses the textarea on open, returns focus to the Connect button on close.
- The `not-found.tsx` page uses an `<h1>` with a clear message and links back to `/directory` and `/home`.
- The hero gradient is decorative; meaningful content (name, role) is in regular `<h1>`/`<p>` — not relying on background contrast.
- Skeleton placeholders use `aria-hidden="true"` so screen readers don't read `Loading...` placeholders aloud.
- All clickable cards (directory cards, recent-viewer avatars) are wrapped in `<Link>` (proper anchor, keyboard-focusable, screen-reader announces the destination).

## Performance

- Page is small (no large images beyond the optional `profilePhotoUrl` and `companyLogoUrl`); LCP candidate is the hero name `<h1>`.
- View-tracking POST fires after profile renders, never blocks paint.
- Modal is rendered conditionally (mount on open) — zero overhead when closed.
- No new dependencies — uses existing SWR, existing apiClient, existing zustand auth store.
- The directory list endpoint already paginates (default 50/page); no changes needed.

## Testing Approach

### Backend (AT-1)

- **Manual via Playwright:** log in as attendee, navigate to `/directory`, expect 200 with attendees rendered (currently 403). Verify `email` and `phone` fields are NOT present in the network response.
- **Manual cross-event check:** modify a request URL to a different event's id, expect 403.
- **Self-exclusion:** verify the calling attendee does NOT appear in their own directory list.

### Frontend (AT-2)

- **Visual smoke** at desktop, tablet, mobile — confirm L3 layout renders, sticky bar pinned, hero gradient visible.
- **Connect modal:** open, type message, submit, expect optimistic state change to `Pending`. Cancel modal, expect no API call.
- **vCard download:** click button, expect a `.vcf` file in the browser's download tray.
- **404:** navigate to `/profile/cuid-that-doesnt-exist`, expect the friendly not-found page.
- **Self-view:** navigate to `/profile/<own-id>`, expect inline "This is you" banner, no view-tracking POST in network panel.
- **Source tracking:** click a directory card, network panel shows `POST /attendees/:id/view` with `source: "directory"`. Same flow from `/home` (suggestion + recent-viewer separately) and `/suggestions`.
- **Connection states:** seed test fixtures so each of the 5 states (null / PENDING_SENT / PENDING_RECEIVED / ACCEPTED / self) renders correctly.

No unit tests required — this is presentational + state-machine code, all verifiable by inspection.

## Out-of-scope follow-ups

- A real "Cancel pending request" action when in `PENDING_SENT` state. Today the user can re-send by deleting the row in DB; out of scope for this WS.
- Hover-to-preview cards in the directory (would replace the "click to navigate" with a hover-popover). Defer to UX polish.
- Filtering the directory by industry / interests. Bigger scope; the verification report flagged this as a separate hand-off.
- Emoji reactions / "send a wave" on the profile page (LinkedIn-style). YAGNI for now.
- Connection request accept/decline notifications (push). Tied to OG-3, separate workstream.

## Hand-off

This workstream completes WS 4. After it ships:

- The `/directory` page becomes a real surface (was effectively dead).
- The home/suggestions/recent-viewer cards stop 404-ing.
- The next high-value workstream candidates are: WS 5 (organiser features OG-1 + OG-3) or WS 7 (`/events/new` wizard split). WS 6 (attendee polish AT-3 + AT-4) is the lowest-risk fast-follow if you want a quick wrap.
