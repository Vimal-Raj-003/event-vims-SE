# Attendee Unblock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve AT-1 (directory 403) and AT-2 (missing `/profile/[attendeeId]` page). Together these unblock the core attendee social experience.

**Architecture:** Three small backend changes (role addition + role-aware findAll + connectionStatus expansion) + five new frontend files (page, loading, not-found, ProfileActionBar, ConnectModal) + four small wire-ups (existing pages append `?from=` query params).

**Tech Stack:** NestJS (controller + service) · Prisma (existing models, no migration) · Next.js 15 App Router (dynamic route) · React 18 · Tailwind CSS · existing apiClient + zustand auth store.

**Spec:** [docs/superpowers/specs/2026-05-04-attendee-unblock-design.md](../specs/2026-05-04-attendee-unblock-design.md)

---

## Pre-flight

Confirm dev servers running:

```bash
curl -s -o /dev/null -w "API:%{http_code}\nWEB:%{http_code}\n" http://localhost:4000/api/v1/health http://localhost:3000
```

Expected: `API:200` / `WEB:200`. If down, start with `npm run dev`.

The Playwright MCP browser is the verification tool. The dev server hot-reloads both API and web on file save.

**Test accounts (from prior workstreams):**
- Attendee: `rahul.krishnan@gmail.com` for event `cmoj5g67h0003n628x95wm4a9`
- Second attendee for accept-flow tests: `vikram@greenlogistics.com` for the same event
- Login is OTP via `/auth/attendee/login` — dev mode returns the OTP in the redirect URL `?devOtp=`

**Schema note:** `CurrentUserData.role` stores lowercase strings (`'attendee'`, `'organiser'`, `'super-admin'`). All role checks in the plan use lowercase.

---

## Task 1: AT-1 backend — directory access + connectionStatus expansion

Add `'ATTENDEE'` to the `findAll` route's roles, branch the service to be role-aware, and expand `getPublicProfile` to return `'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | null`.

**Files:**
- Modify: `apps/api/src/attendees/attendees.controller.ts:103-120`
- Modify: `apps/api/src/attendees/attendees.service.ts:122-200` (`findAll`)
- Modify: `apps/api/src/attendees/attendees.service.ts:680-738` (`getPublicProfile`)

- [ ] **Step 1.1: Update the controller route**

Open `apps/api/src/attendees/attendees.controller.ts`. Find the `@Get('events/:eventId/attendees')` decorator (around line 103). Replace the route block:

```ts
@Get('events/:eventId/attendees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANISER')
async findAll(
  @Param('eventId') eventId: string,
  @CurrentUser() user: CurrentUserData,
  @Query('page') page?: string,
  @Query('pageSize') pageSize?: string,
  @Query('search') search?: string,
) {
  return this.attendeesService.findAll(
    eventId,
    user.organiserId!,
    page ? parseInt(page, 10) : 1,
    pageSize ? parseInt(pageSize, 10) : 50,
    search,
  );
}
```

with:

```ts
@Get('events/:eventId/attendees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORGANISER', 'ATTENDEE')
async findAll(
  @Param('eventId') eventId: string,
  @CurrentUser() user: CurrentUserData,
  @Query('page') page?: string,
  @Query('pageSize') pageSize?: string,
  @Query('search') search?: string,
) {
  return this.attendeesService.findAll(
    eventId,
    user,
    page ? parseInt(page, 10) : 1,
    pageSize ? parseInt(pageSize, 10) : 50,
    search,
  );
}
```

(Two changes: `@Roles('ORGANISER', 'ATTENDEE')` and pass `user` whole instead of `user.organiserId!`.)

- [ ] **Step 1.2: Update the service `findAll` signature and body**

Open `apps/api/src/attendees/attendees.service.ts`. Add this import at the top of the file if not present:

```ts
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
```

Then add these two select constants at module scope, **above the `@Injectable()` AttendeesService class** (around line 25):

```ts
const ORGANISER_LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  designation: true,
  company: true,
  businessType: true,
  industry: true,
  services: true,
  tags: true,
  city: true,
  profilePhotoUrl: true,
  companyLogoUrl: true,
  registeredAt: true,
} as const;

const ATTENDEE_LIST_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  designation: true,
  company: true,
  businessType: true,
  industry: true,
  services: true,
  tags: true,
  city: true,
  profilePhotoUrl: true,
  companyLogoUrl: true,
  interestedIn: true,
  networkingGoals: true,
  linkedinUrl: true,
  websiteUrl: true,
  twitterHandle: true,
} as const;
```

Then replace the existing `findAll` method (`apps/api/src/attendees/attendees.service.ts:122` onward) with:

```ts
async findAll(
  eventId: string,
  user: CurrentUserData,
  page: number = 1,
  pageSize: number = 50,
  search?: string,
) {
  const event = await this.prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event || event.status === EventStatus.DELETED) {
    throw new NotFoundException('Event not found');
  }

  const isAttendee = user.role === 'attendee';

  if (!isAttendee) {
    if (event.organiserId !== user.organiserId) {
      throw new ForbiddenException('You do not own this event');
    }
  } else {
    const callerAttendee = await this.prisma.attendee.findUnique({
      where: { id: user.sub },
    });
    if (!callerAttendee || callerAttendee.eventId !== eventId) {
      throw new ForbiddenException(
        'You can only view attendees of your own event',
      );
    }
  }

  const skip = (page - 1) * pageSize;

  const where: Prisma.AttendeeWhereInput = { eventId };

  if (isAttendee) {
    where.id = { not: user.sub };
  }

  if (search) {
    const searchTerm = search.trim();
    where.OR = [
      { firstName: { contains: searchTerm, mode: 'insensitive' } },
      { lastName: { contains: searchTerm, mode: 'insensitive' } },
      { company: { contains: searchTerm, mode: 'insensitive' } },
    ];
  }

  const select = isAttendee ? ATTENDEE_LIST_SELECT : ORGANISER_LIST_SELECT;

  const [attendees, total] = await Promise.all([
    this.prisma.attendee.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { registeredAt: 'desc' },
      select,
    }),
    this.prisma.attendee.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return {
    data: attendees,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}
```

(The existing `findAll` returned the same `meta` shape — keep the totalPages/total contract intact so the frontend doesn't have to change.)

- [ ] **Step 1.3: Expand `getPublicProfile` to detect PENDING connection status**

Still in `apps/api/src/attendees/attendees.service.ts`, find `async getPublicProfile(requesterId: string, targetId: string)` (around line 680). Inside the same-event branch (where `requester && requester.eventId === target.eventId`), the existing code does ONE `connectionRequest.findFirst` for `ACCEPTED`. Add a second query for `PENDING` immediately after the first one, and compute the consolidated status.

Replace this part of the method:

```ts
if (requester && requester.eventId === target.eventId) {
  const connection = await this.prisma.connectionRequest.findFirst({
    where: {
      eventId: target.eventId,
      status: ConnectionStatus.ACCEPTED,
      OR: [
        { senderId: requesterId, receiverId: targetId },
        { senderId: targetId, receiverId: requesterId },
      ],
    },
  });

  return {
    id: target.id,
    firstName: target.firstName,
    lastName: target.lastName,
    designation: target.designation,
    company: target.company,
    businessType: target.businessType,
    industry: target.industry,
    services: target.services,
    tags: target.tags,
    city: target.city,
    profilePhotoUrl: target.profilePhotoUrl,
    companyLogoUrl: target.companyLogoUrl,
    interestedIn: target.interestedIn,
    networkingGoals: target.networkingGoals,
    linkedinUrl: target.linkedinUrl,
    websiteUrl: target.websiteUrl,
    twitterHandle: target.twitterHandle,
    connectionStatus: connection ? 'ACCEPTED' : null,
  };
}
```

with:

```ts
if (requester && requester.eventId === target.eventId) {
  const accepted = await this.prisma.connectionRequest.findFirst({
    where: {
      eventId: target.eventId,
      status: ConnectionStatus.ACCEPTED,
      OR: [
        { senderId: requesterId, receiverId: targetId },
        { senderId: targetId, receiverId: requesterId },
      ],
    },
  });

  let connectionStatus:
    | 'ACCEPTED'
    | 'PENDING_SENT'
    | 'PENDING_RECEIVED'
    | null = accepted ? 'ACCEPTED' : null;

  if (!accepted) {
    const pending = await this.prisma.connectionRequest.findFirst({
      where: {
        eventId: target.eventId,
        status: ConnectionStatus.PENDING,
        OR: [
          { senderId: requesterId, receiverId: targetId },
          { senderId: targetId, receiverId: requesterId },
        ],
      },
      select: { senderId: true },
    });
    if (pending) {
      connectionStatus =
        pending.senderId === requesterId
          ? 'PENDING_SENT'
          : 'PENDING_RECEIVED';
    }
  }

  return {
    id: target.id,
    firstName: target.firstName,
    lastName: target.lastName,
    designation: target.designation,
    company: target.company,
    businessType: target.businessType,
    industry: target.industry,
    services: target.services,
    tags: target.tags,
    city: target.city,
    profilePhotoUrl: target.profilePhotoUrl,
    companyLogoUrl: target.companyLogoUrl,
    interestedIn: target.interestedIn,
    networkingGoals: target.networkingGoals,
    linkedinUrl: target.linkedinUrl,
    websiteUrl: target.websiteUrl,
    twitterHandle: target.twitterHandle,
    connectionStatus,
  };
}
```

- [ ] **Step 1.4: Verify dev server compiled cleanly**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" || echo "no errors"
```

Expected: `no errors`. If TS compile errors mention this file, fix them before proceeding.

- [ ] **Step 1.5: Smoke-test the directory now loads as attendee**

Use Playwright MCP. First clear cookies (the browser may still be logged in as organiser from prior workstreams), then log in as Rahul:

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => { document.cookie.split(';').forEach(c => { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/') }); localStorage.clear(); }"
})
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/auth/attendee/login" })
```

Then submit the OTP request form for `rahul.krishnan@gmail.com` + event `cmoj5g67h0003n628x95wm4a9`, click through the verify page (dev OTP is pre-filled via `?devOtp=`), and land somewhere in the attendee app.

Navigate to `/directory`:

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/directory" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task1-directory-as-attendee.png" })
mcp__plugin_playwright_playwright__browser_network_requests()
```

Expected: page lists attendees (was 0 / "No attendees found" before this task). The `GET /events/cmoj5g67h0003n628x95wm4a9/attendees` request returns 200. The response JSON should NOT contain `email` or `phone` fields (per the privacy boundary).

Verify the network response shape:

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const eventId = JSON.parse(localStorage.getItem('auth-store')).state.user.eventId;
    const r = await fetch(\`/api/v1/events/\${eventId}/attendees?page=1&pageSize=5\`, {
      credentials: 'include',
    });
    const j = await r.json();
    return { sample: j.data?.[0], hasEmail: 'email' in (j.data?.[0] ?? {}), hasPhone: 'phone' in (j.data?.[0] ?? {}) };
  }`
})
```

Expected: `hasEmail: false`, `hasPhone: false`. The `sample` object should have `firstName`, `lastName`, `designation`, `company`, etc.

- [ ] **Step 1.6: Verify self is excluded**

In the same browser session (logged in as Rahul):

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const auth = JSON.parse(localStorage.getItem('auth-store')).state.user;
    const r = await fetch(\`/api/v1/events/\${auth.eventId}/attendees?page=1&pageSize=100\`, { credentials: 'include' });
    const j = await r.json();
    const ids = (j.data ?? []).map(a => a.id);
    return { selfId: auth.id, includesSelf: ids.includes(auth.id), totalReturned: ids.length };
  }`
})
```

Expected: `includesSelf: false`. The directory should never list the calling attendee.

- [ ] **Step 1.7: Verify connectionStatus expansion works**

Still as Rahul, query a peer's profile (use the first attendee from the directory list):

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const auth = JSON.parse(localStorage.getItem('auth-store')).state.user;
    const list = await fetch(\`/api/v1/events/\${auth.eventId}/attendees?page=1&pageSize=2\`, { credentials: 'include' }).then(r => r.json());
    const peerId = list.data?.[0]?.id;
    if (!peerId) return { error: 'no peer to test' };
    const profile = await fetch(\`/api/v1/attendees/\${peerId}/profile\`, { credentials: 'include' }).then(r => r.json());
    return { peerId, connectionStatus: profile.connectionStatus, fields: Object.keys(profile) };
  }`
})
```

Expected: `connectionStatus` is one of `'ACCEPTED'`, `'PENDING_SENT'`, `'PENDING_RECEIVED'`, or `null`. From the verification report, Rahul has 1 ACCEPTED connection (Meena Rajendran) and the WS-1 test connection to Vikram was hard-deleted during cleanup, so most peers should return `null`. If your fixture has different state, just confirm the field is present and is one of the four valid values.

- [ ] **Step 1.8: Commit**

```bash
git add apps/api/src/attendees/attendees.controller.ts apps/api/src/attendees/attendees.service.ts
git commit -m "feat(attendees): unblock attendee directory + expand profile connectionStatus

AT-1: Add 'ATTENDEE' to findAll roles, branch the service ownership
check by role, mirror getPublicProfile field set (no email/phone)
when caller is attendee. Self-exclusion: caller never sees self.

Also extends getPublicProfile to surface PENDING connection state
(PENDING_SENT / PENDING_RECEIVED) so the new profile page's action
bar can distinguish the four connection states."
```

---

## Task 2: `ConnectModal` component

Modal for sending a connection request with optional 200-char message.

**Files:**
- Create: `apps/web/src/hooks/use-toast.ts` (small local toast hook, ~25 LOC)
- Create: `apps/web/src/components/profile/ConnectModal.tsx` (~90 LOC)

- [ ] **Step 2.1: Check if a shared toast exists**

```bash
grep -rln "useToast\|Toaster\|sonner\|react-hot-toast" apps/web/src/components apps/web/src/hooks 2>/dev/null | head -5
```

If output shows existing toast machinery, **skip Step 2.2** (the next step) and instead use the existing pattern. Read its API and adapt the calls in 2.3 to match. If output is empty (no shared toast), continue with Step 2.2 to ship a minimal local one.

- [ ] **Step 2.2: Create the local `useToast` hook**

Create `apps/web/src/hooks/use-toast.ts`:

```tsx
"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string };

const listeners: Array<(t: Toast) => void> = [];
let nextId = 1;

export function showToast(message: string) {
  const t = { id: nextId++, message };
  listeners.forEach((l) => l(t));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000);
    };
    listeners.push(onToast);
    return () => {
      const idx = listeners.indexOf(onToast);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return toasts;
}
```

Then in `apps/web/src/app/(attendee)/layout.tsx`, mount a tiny global Toaster. Open the layout file and find its `return` JSX; add **inside the outermost wrapper element, near the bottom**:

```tsx
<Toaster />
```

And add this component definition at the bottom of the file (or extract it; inline is fine for this small scope):

```tsx
function Toaster() {
  const toasts = useToast();
  return (
    <div className="fixed bottom-20 inset-x-0 flex flex-col items-center gap-2 z-50 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
```

Add to the layout's imports: `import { useToast } from "@/hooks/use-toast";`. Make sure the layout has `"use client"` at the top (if it's currently a server component, the `useToast` hook usage will require it).

If the existing layout is a server component and you don't want to convert it, instead create a `<ToasterClient />` wrapper component in `apps/web/src/components/Toaster.tsx`:

```tsx
"use client";

import { useToast } from "@/hooks/use-toast";

export function ToasterClient() {
  const toasts = useToast();
  return (
    <div className="fixed bottom-20 inset-x-0 flex flex-col items-center gap-2 z-50 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
```

And mount `<ToasterClient />` from the (server) layout — that way the layout stays RSC and only the toaster opts into client.

- [ ] **Step 2.3: Create `ConnectModal.tsx`**

Create `apps/web/src/components/profile/ConnectModal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import { showToast } from "@/hooks/use-toast";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  receiver: { id: string; firstName: string };
  eventId: string;
}

export function ConnectModal({ open, onClose, onSent, receiver, eventId }: ConnectModalProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setError(null);
    setSubmitting(false);
    const t = setTimeout(() => textareaRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/events/${eventId}/connections`, {
        receiverId: receiver.id,
        message: message.trim() || undefined,
      });
      onSent();
      showToast("Request sent");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send request. Try again.";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-modal-title"
    >
      <div className="relative w-full max-w-md mt-16 sm:mt-0 rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-2xl">
        <h2 id="connect-modal-title" className="text-lg font-semibold text-foreground">
          Send a connection request to {receiver.firstName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          A short note helps them remember you.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            placeholder="Add a note (optional)"
            disabled={submitting}
            className="w-full min-h-[100px] max-h-[180px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-60"
          />
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs text-muted-foreground">
              {message.length} / 200
            </span>
          </div>

          {error && (
            <p className="mt-3 text-sm text-rose-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.4: Verify dev server compiled cleanly**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" || echo "no errors"
```

Expected: `no errors`.

- [ ] **Step 2.5: Commit**

```bash
git add apps/web/src/hooks/use-toast.ts apps/web/src/components/profile/ConnectModal.tsx "apps/web/src/app/(attendee)/layout.tsx" apps/web/src/components/Toaster.tsx 2>/dev/null
git commit -m "feat(profile): add ConnectModal + global toast hook"
```

(If the layout edit + ToasterClient route was used, both files are staged. If the inline route was used, only the layout + hook + modal are staged. The `2>/dev/null` suppresses errors for paths that don't exist.)

---

## Task 3: `ProfileActionBar` component

Sticky bottom action bar with state-aware Connect button (5 states).

**Files:**
- Create: `apps/web/src/components/profile/ProfileActionBar.tsx` (~110 LOC)

- [ ] **Step 3.1: Write the component**

Create `apps/web/src/components/profile/ProfileActionBar.tsx`:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { showToast } from "@/hooks/use-toast";
import { ConnectModal } from "./ConnectModal";

export type ConnectionStatus =
  | "ACCEPTED"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | null;

interface ProfileActionBarProps {
  attendee: { id: string; firstName: string };
  eventId: string;
  connectionStatus: ConnectionStatus;
  isSelf: boolean;
  pendingConnectionId?: string | null;
  onStatusChange: (status: ConnectionStatus) => void;
}

export function ProfileActionBar({
  attendee,
  eventId,
  connectionStatus,
  isSelf,
  pendingConnectionId,
  onStatusChange,
}: ProfileActionBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const downloadVCard = () => {
    window.open(`/api/v1/attendees/${attendee.id}/vcard`, "_blank");
    showToast("vCard downloaded");
  };

  const handleAccept = async () => {
    if (!pendingConnectionId) return;
    setAccepting(true);
    try {
      await apiClient.patch(
        `/events/${eventId}/connections/${pendingConnectionId}/accept`,
      );
      onStatusChange("ACCEPTED");
      showToast("Connection accepted");
    } catch {
      showToast("Could not accept request");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingConnectionId) return;
    setAccepting(true);
    try {
      await apiClient.patch(
        `/events/${eventId}/connections/${pendingConnectionId}/decline`,
      );
      onStatusChange(null);
      showToast("Request declined");
    } catch {
      showToast("Could not decline request");
    } finally {
      setAccepting(false);
    }
  };

  if (isSelf) {
    return (
      <div
        role="region"
        aria-label="Connection actions"
        className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-3 sm:p-4 z-30"
      >
        <div className="max-w-2xl mx-auto text-center text-sm text-muted-foreground">
          This is your profile —{" "}
          <Link href="/card" className="text-primary font-semibold hover:underline">
            view your business card →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        role="region"
        aria-label="Connection actions"
        className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-3 sm:p-4 z-30"
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {connectionStatus === null && (
            <>
              <button
                onClick={() => setModalOpen(true)}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Connect →
              </button>
              <button
                onClick={downloadVCard}
                className="h-11 px-4 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                aria-label="Save vCard"
              >
                ⤓ vCard
              </button>
            </>
          )}

          {connectionStatus === "PENDING_SENT" && (
            <>
              <button
                disabled
                className="flex-1 h-11 rounded-xl bg-muted text-muted-foreground font-semibold text-sm cursor-not-allowed"
              >
                Pending
              </button>
              <button
                onClick={downloadVCard}
                className="h-11 px-4 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                aria-label="Save vCard"
              >
                ⤓ vCard
              </button>
            </>
          )}

          {connectionStatus === "PENDING_RECEIVED" && (
            <>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm disabled:opacity-60 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                disabled={accepting}
                className="h-11 px-4 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted disabled:opacity-60 transition-colors"
              >
                Decline
              </button>
            </>
          )}

          {connectionStatus === "ACCEPTED" && (
            <>
              <div className="flex-1 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold text-sm flex items-center justify-center">
                ✓ Connected
              </div>
              <button
                onClick={downloadVCard}
                className="h-11 px-4 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                aria-label="Save vCard"
              >
                ⤓ vCard
              </button>
            </>
          )}
        </div>
      </div>

      <ConnectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSent={() => onStatusChange("PENDING_SENT")}
        receiver={attendee}
        eventId={eventId}
      />
    </>
  );
}
```

- [ ] **Step 3.2: Verify dev server compiled cleanly**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" || echo "no errors"
```

Expected: `no errors`.

- [ ] **Step 3.3: Commit**

```bash
git add apps/web/src/components/profile/ProfileActionBar.tsx
git commit -m "feat(profile): add ProfileActionBar (5-state Connect button + vCard)"
```

---

## Task 4: Profile page orchestrator

The dynamic route `/profile/[attendeeId]/page.tsx` that fetches the profile, mounts the action bar, fires view-tracking, and handles self/error states.

**Files:**
- Create: `apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx` (~200 LOC)

- [ ] **Step 4.1: Create the directory**

```bash
mkdir -p "apps/web/src/app/(attendee)/profile/[attendeeId]"
```

- [ ] **Step 4.2: Write the page component**

Create `apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import {
  ProfileActionBar,
  type ConnectionStatus,
} from "@/components/profile/ProfileActionBar";

interface PublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  company?: string | null;
  businessType?: string | null;
  industry?: string | null;
  services?: string[];
  tags?: string[];
  city?: string | null;
  profilePhotoUrl?: string | null;
  companyLogoUrl?: string | null;
  interestedIn?: string | null;
  networkingGoals?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  twitterHandle?: string | null;
  connectionStatus: ConnectionStatus;
}

const VALID_SOURCES = [
  "directory",
  "home",
  "home_viewers",
  "suggestions",
  "direct",
] as const;

function normalizeSource(input: string | null): string {
  if (!input) return "direct";
  return (VALID_SOURCES as readonly string[]).includes(input) ? input : "direct";
}

export default function AttendeeProfilePage({
  params,
}: {
  params: { attendeeId: string };
}) {
  const searchParams = useSearchParams();
  const source = normalizeSource(searchParams.get("from"));
  const user = useAuthStore((s) => s.user) as
    | { id: string; eventId?: string }
    | null;
  const eventId = user?.eventId;
  const isSelf = user?.id === params.attendeeId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const viewTracked = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    apiClient
      .get<PublicProfile>(`/attendees/${params.attendeeId}/profile`)
      .then(({ data }) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        const status = (err as { status?: number; response?: { status?: number } })
          ?.status ?? (err as { response?: { status?: number } })?.response?.status;
        if (!cancelled) {
          if (status === 404 || status === 403) notFound();
          else setErrored(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.attendeeId]);

  useEffect(() => {
    if (!profile || isSelf || viewTracked.current) return;
    viewTracked.current = true;
    apiClient
      .post(`/attendees/${params.attendeeId}/view`, { source })
      .catch(() => {});
  }, [profile, isSelf, params.attendeeId, source]);

  useEffect(() => {
    if (!profile || profile.connectionStatus !== "PENDING_RECEIVED" || !eventId)
      return;
    apiClient
      .get<{
        data: Array<{ id: string; senderId: string; receiverId: string; status: string }>;
      }>(`/events/${eventId}/connections?status=PENDING&with=${params.attendeeId}`)
      .then(({ data }) => {
        const found = (data.data ?? []).find(
          (c) => c.senderId === params.attendeeId && c.status === "PENDING",
        );
        setPendingId(found?.id ?? null);
      })
      .catch(() => {});
  }, [profile, eventId, params.attendeeId]);

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-40 rounded-3xl bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (errored || !profile) {
    return (
      <div className="space-y-4 pb-24">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-foreground font-semibold mb-2">Could not load this profile</p>
          <p className="text-sm text-muted-foreground mb-4">
            Please try again in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase();
  const meta = [profile.industry, profile.city].filter(Boolean).join(" · ");
  const role = [profile.designation, profile.company].filter(Boolean).join(" · ");

  const hasContent =
    (profile.services?.length ?? 0) > 0 ||
    !!profile.interestedIn ||
    !!profile.networkingGoals ||
    !!profile.linkedinUrl ||
    !!profile.websiteUrl ||
    !!profile.twitterHandle;

  const handleStatusChange = (status: ConnectionStatus) => {
    setProfile((p) => (p ? { ...p, connectionStatus: status } : p));
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 text-white">
        <div className="flex flex-col items-center text-center">
          {profile.profilePhotoUrl ? (
            <img
              src={profile.profilePhotoUrl}
              alt=""
              className="w-[72px] h-[72px] rounded-full border-[3px] border-white object-cover"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white bg-white/20 flex items-center justify-center text-2xl font-extrabold">
              {initials}
            </div>
          )}
          <h1 className="mt-3 text-2xl font-bold leading-tight">{fullName}</h1>
          {role && <p className="text-sm text-white/85 mt-1">{role}</p>}
          {meta && (
            <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs">
              {meta}
            </span>
          )}
        </div>
      </div>

      {!hasContent ? (
        <p className="text-sm text-muted-foreground text-center px-6 py-4">
          This attendee hasn&apos;t filled out their profile yet.
        </p>
      ) : (
        <>
          {(profile.services?.length ?? 0) > 0 && (
            <Section title="Services offered">
              <div className="flex flex-wrap gap-1.5">
                {profile.services!.map((s) => (
                  <span
                    key={s}
                    className="inline-block px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {profile.interestedIn && (
            <Section title="Looking to meet">
              <p className="text-sm text-foreground leading-relaxed">{profile.interestedIn}</p>
            </Section>
          )}

          {profile.networkingGoals && (
            <Section title="Networking goals">
              <p className="text-sm text-foreground leading-relaxed">{profile.networkingGoals}</p>
            </Section>
          )}

          {(profile.linkedinUrl || profile.websiteUrl || profile.twitterHandle) && (
            <Section title="Links">
              <div className="flex flex-wrap gap-2">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {profile.websiteUrl && (
                  <a
                    href={profile.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground"
                  >
                    Website ↗
                  </a>
                )}
                {profile.twitterHandle && (
                  <a
                    href={`https://twitter.com/${profile.twitterHandle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground"
                  >
                    Twitter ↗
                  </a>
                )}
              </div>
            </Section>
          )}
        </>
      )}

      {eventId && (
        <ProfileActionBar
          attendee={{ id: profile.id, firstName: profile.firstName }}
          eventId={eventId}
          connectionStatus={profile.connectionStatus}
          isSelf={isSelf}
          pendingConnectionId={pendingId}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
```

- [ ] **Step 4.3: Verify dev server compiled cleanly**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" || echo "no errors"
```

Expected: `no errors`.

- [ ] **Step 4.4: Smoke test — navigate to a real peer profile**

Logged in as Rahul, navigate to a peer. Pick a peer ID from the directory:

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/directory" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => {
    const cards = document.querySelectorAll('a[href^="/profile/"]');
    return cards.length > 0 ? cards[0].getAttribute('href') : null;
  }`
})
```

If a `/profile/<id>` href is returned, navigate to it. If no anchor found yet (because the directory cards aren't wrapped in `<Link>` until Task 6), use this fallback to manually craft the URL:

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const auth = JSON.parse(localStorage.getItem('auth-store')).state.user;
    const r = await fetch(\`/api/v1/events/\${auth.eventId}/attendees?page=1&pageSize=2\`, { credentials: 'include' });
    const j = await r.json();
    return j.data?.[0]?.id;
  }`
})
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/profile/<the-peer-id-from-above>?from=directory" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task4-profile.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: profile page renders with the gradient hero, name + role, meta pill, content cards. Sticky bar shows "Connect →" + "⤓ vCard". Zero console errors.

- [ ] **Step 4.5: Verify view-tracking fired**

```
mcp__plugin_playwright_playwright__browser_network_requests()
```

Look for a `POST /attendees/<id>/view` request. Body should include `source: "directory"`.

- [ ] **Step 4.6: Verify self-detection**

Navigate to your own profile:

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => JSON.parse(localStorage.getItem('auth-store')).state.user.id"
})
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/profile/<own-id>" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task4-self.png" })
```

Expected: action bar shows "This is your profile — view your business card →" with a link to `/card`. NO `POST /view` request fires (self-tracking is skipped).

Verify by checking network requests:

```
mcp__plugin_playwright_playwright__browser_network_requests()
```

Among requests for this navigation, there should be NO `/attendees/<own-id>/view`. The profile fetch (`GET /attendees/<own-id>/profile`) is allowed.

- [ ] **Step 4.7: Verify 404 on unknown id**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/profile/cxxxxxxxxxxxxxxxxxxxxxxxx" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task4-404-default.png" })
```

Expected: Next.js renders the default 404 page. (Task 5 will replace this with our friendly not-found.tsx.)

- [ ] **Step 4.8: Commit**

```bash
git add "apps/web/src/app/(attendee)/profile/[attendeeId]/page.tsx"
git commit -m "feat(profile): add /profile/[attendeeId] page (L3 layout, view-tracking, self-detect)"
```

---

## Task 5: `loading.tsx` and `not-found.tsx` (small Next.js convention files)

**Files:**
- Create: `apps/web/src/app/(attendee)/profile/[attendeeId]/loading.tsx` (~30 LOC)
- Create: `apps/web/src/app/(attendee)/profile/[attendeeId]/not-found.tsx` (~30 LOC)

- [ ] **Step 5.1: Create `loading.tsx`**

Create `apps/web/src/app/(attendee)/profile/[attendeeId]/loading.tsx`:

```tsx
export default function ProfileLoading() {
  return (
    <div className="space-y-4 pb-24" aria-hidden="true">
      <div className="h-40 rounded-3xl bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-4" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-4" />
        <div className="h-4 w-2/3 bg-muted rounded mb-2" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-4" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    </div>
  );
}
```

- [ ] **Step 5.2: Create `not-found.tsx`**

Create `apps/web/src/app/(attendee)/profile/[attendeeId]/not-found.tsx`:

```tsx
import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center">
      <h1 className="text-xl font-semibold text-foreground mb-2">
        This attendee isn&apos;t in your event
      </h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        They may have left the event, or the link is incorrect. Try the directory to find someone else.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          href="/directory"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
        >
          Browse directory
        </Link>
        <Link
          href="/home"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5.3: Verify both routes render**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/profile/cxxxxxxxxxxxxxxxxxxxxxxxx" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task5-not-found.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: friendly not-found page renders with the headline, body, and two buttons. Zero console errors.

The loading state is hard to capture deterministically (it flashes briefly); skip explicit verification — `loading.tsx` is exercised on every navigation by Next.js convention and any rendering error would surface as a console error.

- [ ] **Step 5.4: Commit**

```bash
git add "apps/web/src/app/(attendee)/profile/[attendeeId]/loading.tsx" "apps/web/src/app/(attendee)/profile/[attendeeId]/not-found.tsx"
git commit -m "feat(profile): add loading skeleton + not-found page for /profile/[attendeeId]"
```

---

## Task 6: Wire up callers (directory + home + suggestions)

Append `?from=` query params and wrap directory cards in `<Link>`.

**Files:**
- Modify: `apps/web/src/app/(attendee)/directory/page.tsx` (wrap each attendee card in `<Link>`)
- Modify: `apps/web/src/app/(attendee)/home/page.tsx:157` (suggestion cards — add `?from=home`)
- Modify: `apps/web/src/app/(attendee)/home/page.tsx:209` (recent viewers — add `?from=home_viewers`)
- Modify: `apps/web/src/app/(attendee)/suggestions/page.tsx` (cards — add `?from=suggestions`)

- [ ] **Step 6.1: Wrap directory cards in `<Link>`**

Open `apps/web/src/app/(attendee)/directory/page.tsx`. The current render outputs each attendee as a non-clickable card. Find the JSX block where `attendees.map(...)` renders each card. Add to imports if not present:

```tsx
import Link from "next/link";
```

Then wrap each rendered attendee card. The exact JSX in the file needs to be located by reading the file; the change pattern is:

```tsx
{attendees.map((a) => (
  <Link
    key={a.id}
    href={`/profile/${a.id}?from=directory`}
    className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-2xl"
  >
    {/* existing card markup that the file already has */}
  </Link>
))}
```

The cleanest approach: read the file first to locate the exact JSX, then make the surgical edit. The wrap should preserve all existing card styling — only adds the `<Link>` parent. Replace the existing `<div key={a.id}>` (or whatever wrapper element) outermost element with `<Link key={a.id} href={...}>` and let it inherit the existing className. If the existing element has interactive children (buttons), make them `e.stopPropagation()` to prevent navigation.

- [ ] **Step 6.2: Add `?from=home` to home suggestion-card links**

Open `apps/web/src/app/(attendee)/home/page.tsx`. The verification grep showed:

```
home/page.tsx:157:  href={`/profile/${s.attendee.id}`}
```

Change that line to:

```tsx
href={`/profile/${s.attendee.id}?from=home`}
```

- [ ] **Step 6.3: Add `?from=home_viewers` to recent-viewer avatars**

Same file, line 209:

```
home/page.tsx:209:  <Link key={viewer.id} href={`/profile/${viewer.id}`} title={...}>
```

Change to:

```tsx
<Link key={viewer.id} href={`/profile/${viewer.id}?from=home_viewers`} title={...}>
```

- [ ] **Step 6.4: Add `?from=suggestions` to suggestions-page links**

Open `apps/web/src/app/(attendee)/suggestions/page.tsx`. Find every `href={`/profile/${...}`}` and change to `href={`/profile/${...}?from=suggestions`}`. There may be one or two such links; find them all with:

```bash
grep -n "/profile/\${" "apps/web/src/app/(attendee)/suggestions/page.tsx"
```

Apply the same `?from=suggestions` suffix to each.

- [ ] **Step 6.5: Verify all four wire-ups**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/directory" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => {
    const links = Array.from(document.querySelectorAll('a[href^="/profile/"]')).map(a => a.getAttribute('href'));
    return { count: links.length, sample: links.slice(0, 3) };
  }`
})
```

Expected: `count > 0` and every href contains `?from=directory`.

Repeat for `/home` and `/suggestions`:

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/home" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => {
    const links = Array.from(document.querySelectorAll('a[href^="/profile/"]')).map(a => a.getAttribute('href'));
    const grouped = links.reduce((acc, h) => { const m = h.match(/from=(\\w+)/); const key = m?.[1] ?? 'no-from'; acc[key] = (acc[key] ?? 0) + 1; return acc; }, {});
    return grouped;
  }`
})
```

Expected: object with keys `home` and `home_viewers` (counts depending on the fixture state — at least one of each should be present).

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/suggestions" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => Array.from(document.querySelectorAll('a[href^="/profile/"]')).map(a => a.getAttribute('href'))`
})
```

Expected: every href contains `?from=suggestions`.

- [ ] **Step 6.6: Commit**

```bash
git add "apps/web/src/app/(attendee)/directory/page.tsx" "apps/web/src/app/(attendee)/home/page.tsx" "apps/web/src/app/(attendee)/suggestions/page.tsx"
git commit -m "feat(profile): wire directory/home/suggestions links to /profile/[id] with source params"
```

---

## Task 7: End-to-end visual verification

Walk through the major flows end-to-end. Apply small fixes inline only if regression surfaces. No new code expected.

- [ ] **Step 7.1: Directory list — attendee can see peers**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/directory" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-directory.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: directory shows ≥1 attendee card. Cards are clickable links. Zero console errors.

- [ ] **Step 7.2: Click a directory card — profile page loads**

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => document.querySelector('a[href^=\"/profile/\"]')?.click()"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-profile-from-directory.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: profile page renders with hero gradient, sticky action bar, content cards (or empty-profile message). Zero errors.

- [ ] **Step 7.3: Connect modal opens, sends, closes with toast**

```
mcp__plugin_playwright_playwright__browser_click({
  element: "Connect button",
  ref: "button:has-text('Connect →')"
})
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-modal-open.png" })
mcp__plugin_playwright_playwright__browser_type({
  element: "message textarea",
  ref: "textarea",
  text: "verification round trip"
})
mcp__plugin_playwright_playwright__browser_click({
  element: "Send Request",
  ref: "button:has-text('Send Request')"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-modal-after-submit.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: modal opens, textarea fillable, Send Request closes the modal. Toast `Request sent` appears briefly. Action bar primary button now reads `Pending` (disabled muted). Zero console errors.

- [ ] **Step 7.4: vCard download fires**

```
mcp__plugin_playwright_playwright__browser_click({
  element: "Save vCard button",
  ref: "button[aria-label='Save vCard']"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1 })
```

Expected: a `.vcf` file is offered for download by the browser, OR a new tab opens displaying vCard contents (varies by browser). Toast `vCard downloaded` appears.

- [ ] **Step 7.5: Self-view shows banner, no view-tracking fires**

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => JSON.parse(localStorage.getItem('auth-store')).state.user.id"
})
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/profile/<own-id>" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-self.png" })
mcp__plugin_playwright_playwright__browser_network_requests()
```

Expected: action bar shows the "This is your profile" banner with `view your business card →` link. No `POST /attendees/<own-id>/view` request among the network records.

- [ ] **Step 7.6: 404 path — friendly not-found**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/profile/cxxxxxxxxxxxxxxxxxxxxxxxx" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-not-found.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: friendly not-found renders ("This attendee isn't in your event"). Two buttons. Zero console errors.

- [ ] **Step 7.7: Mobile viewport — sticky bar still pinned**

```
mcp__plugin_playwright_playwright__browser_resize({ width: 390, height: 844 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/directory" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => document.querySelector('a[href^=\"/profile/\"]')?.click()"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-mobile.png", fullPage: true })
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
```

Expected: hero takes full viewport width, content cards are full width, action bar pinned to bottom of viewport, Connect button is full-width.

- [ ] **Step 7.8: Console clean across all flows**

Throughout the previous steps, no `console.error` should have appeared. If any did, identify the source and report `DONE_WITH_CONCERNS` with the error message.

- [ ] **Step 7.9: Optional fix commit**

If a small regression was caught and fixed during verification, commit it:

```bash
git add -A
git commit -m "fix(profile): <one-line description>"
```

If everything passed, no commit needed.

---

## Self-Review

**Spec coverage:**
- ✅ AT-1 controller role addition → Task 1 (Step 1.1)
- ✅ AT-1 service `findAll` role-aware branch → Task 1 (Step 1.2)
- ✅ AT-1 self-exclusion when caller is attendee → Task 1 (Step 1.2 + verified in 1.6)
- ✅ AT-1 field-set mirroring `getPublicProfile` (no email/phone) → Task 1 (Step 1.2 + verified in 1.5)
- ✅ AT-1 cross-event 403 → Task 1 (Step 1.2)
- ✅ `getPublicProfile` returns `'PENDING_SENT' | 'PENDING_RECEIVED' | 'ACCEPTED' | null` → Task 1 (Step 1.3 + verified in 1.7)
- ✅ Profile page L3 layout (hero + sections + sticky bar) → Task 4 (Step 4.2)
- ✅ ConnectModal with optional 200-char message → Task 2 (Step 2.3)
- ✅ ProfileActionBar with 5 visual states → Task 3 (Step 3.1)
- ✅ View tracking with `?from=` source → Task 4 (Step 4.2 + verified in 4.5)
- ✅ Self-view banner + skip view-tracking → Task 4 (Step 4.2 + verified in 4.6 + 7.5)
- ✅ 404 → friendly not-found page → Task 5 (Step 5.2 + verified in 7.6)
- ✅ Loading skeleton → Task 5 (Step 5.1)
- ✅ Directory cards wrapped in `<Link>` → Task 6 (Step 6.1)
- ✅ Three caller wire-ups (`directory`, `home`, `home_viewers`, `suggestions`) → Task 6 (Steps 6.1-6.4)
- ✅ Toast for `Request sent` and `vCard downloaded` → Task 2 (Step 2.2-2.3) + Task 3 (Step 3.1)
- ✅ Connection state matrix (5 states) → Task 3 (Step 3.1)

**Placeholder scan:** no TBD / "TODO without code" / "implement later". Task 6 Step 6.1 has a "the cleanest approach: read the file first to locate the exact JSX" instruction — that's a directive to the implementer, not a placeholder. The exact wrapper change is shown in code; the implementer just needs to identify which existing element to wrap. All other steps have complete code blocks.

**Type/name consistency:**
- `ConnectionStatus` exported from `ProfileActionBar.tsx` and imported by `page.tsx` — names match.
- `PublicProfile` interface in `page.tsx` matches the field set returned by the modified `getPublicProfile`.
- `ATTENDEE_LIST_SELECT` constant referenced in Task 1 service code.
- `?from` source values (`directory`, `home`, `home_viewers`, `suggestions`, `direct`) referenced consistently in spec, Task 4 (`VALID_SOURCES`), Task 6 (wire-up).
- All four endpoint URLs (`POST /events/:eventId/connections`, `PATCH /events/:eventId/connections/:id/accept`, `PATCH .../decline`, `GET /attendees/:id/profile`, `POST /attendees/:id/view`, `GET /attendees/:id/vcard`) used consistently.

Plan is ready for execution.
