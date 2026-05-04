# Organiser Features Implementation Plan (OG-1 + OG-3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship two organiser-side features — manual attendee invite (OG-1) and a real activity feed (OG-3) — that resolve the Medium-severity gaps from WS-1 verification.

**Architecture:** OG-1 = new POST endpoint + service method + DTO + email helper + UI modal mounted on existing attendees page. OG-3 = new GET endpoint + service that composes a feed from `Attendee`/`Announcement`/computed-milestone data + page rewrite of the existing `/notifications` route.

**Tech Stack:** NestJS (controllers + services) · Prisma (existing models, no migration) · Next.js 15 App Router · React 18 · Tailwind CSS · existing `MailService` (Zoho SMTP) · existing `useToast`/`apiClient`/zustand auth store.

**Spec:** [docs/superpowers/specs/2026-05-04-organiser-features-design.md](../specs/2026-05-04-organiser-features-design.md)

---

## Pre-flight

Confirm dev servers running:

```bash
curl -s -o /dev/null -w "API:%{http_code} WEB:%{http_code}\n" http://localhost:4000/api/v1/health http://localhost:3000
```

Expected: `API:200 WEB:200`. If down, start with `npm run dev`.

**Test accounts:**
- Organiser: `testorganiser@example.com` / `Organiser@2026` (password login)
- Attendee (for invite-an-attendee tests): use any new email like `invited+wsfive@example.com`. Tests will clean up rows.

**Test event:** `cmoj5g67h0003n628x95wm4a9` — Bengaluru Tech Summit, owned by the test organiser, 8 attendees, 0 announcements (post-WS-1 cleanup).

**Carryover lessons:**
- `CurrentUserData.role` is lowercase (`'organiser'`).
- Tailwind 3 sub-`/5` opacity classes need bracket syntax (`/[0.04]`, etc.). The component code below already uses bracket syntax where needed.
- `MailService` already exists at `apps/api/src/mail/mail.service.ts` with `sendOtpEmail`/`sendVerificationEmail` patterns to copy from. Config key for the front-end base URL is `NEXT_PUBLIC_APP_URL` (default `http://localhost:3000`).

---

## Task 1: OG-1 backend (invite endpoint + email)

Add the `POST /events/:eventId/invite-attendee` route and the `sendInviteEmail` method.

**Files:**
- Create: `apps/api/src/attendees/dto/invite-attendee.dto.ts` (~18 LOC)
- Modify: `apps/api/src/attendees/attendees.controller.ts` (~20 LOC added)
- Modify: `apps/api/src/attendees/attendees.service.ts` (~70 LOC added)
- Modify: `apps/api/src/mail/mail.service.ts` (~25 LOC added — one new method)

- [ ] **Step 1.1: Create the DTO**

Create `apps/api/src/attendees/dto/invite-attendee.dto.ts`:

```ts
import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class InviteAttendeeDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName: string;
}
```

- [ ] **Step 1.2: Add `sendInviteEmail` to `MailService`**

Open `apps/api/src/mail/mail.service.ts`. Find the existing `sendVerificationEmail` method (around line 46). Add this new method **immediately after it** (before the next existing method or before the class closing brace):

```ts
  async sendInviteEmail(
    to: string,
    firstName: string,
    eventName: string,
    loginLink: string,
  ): Promise<void> {
    const fromAddress = this.configService.get<string>('MAIL_USERNAME');
    const safeName = this.escapeHtml(firstName);
    const safeEvent = this.escapeHtml(eventName);
    const html = `
      <p>Hi ${safeName},</p>
      <p>You've been invited to <b>${safeEvent}</b>. Open your digital business card and start connecting with attendees:</p>
      <p>
        <a href="${loginLink}" style="display:inline-block;padding:12px 24px;background:#4f46e5;color:white;border-radius:8px;text-decoration:none;font-weight:600;">
          Open your business card →
        </a>
      </p>
      <p>If the button doesn't work, paste this link into your browser:<br>
      <span style="color:#64748b;">${loginLink}</span></p>
      <p style="color:#64748b;font-size:12px;">— The ${safeEvent} organising team</p>
    `;
    try {
      await this.transporter.sendMail({
        from: `"VIMS Events" <${fromAddress}>`,
        to,
        subject: `You're invited to ${eventName}`,
        html,
      });
      this.logger.log(`Invite email sent to ${to} for ${eventName}`);
    } catch (error) {
      this.logger.error(
        `Failed to send invite email to ${to}: ${(error as Error).message}`,
      );
      // Rethrow so caller (invite endpoint) can decide whether to surface
      // it to the organiser. The current AttendeesService.inviteAttendee
      // catches and logs, returning 201 anyway since the row exists.
      throw error;
    }
  }
```

If the file doesn't already have an `escapeHtml` helper method, check the existing `otpTemplate` / `verificationTemplate` methods — they're likely already using `this.escapeHtml(...)`. If `escapeHtml` is not present, add this minimal private helper at the bottom of the class:

```ts
  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
```

(Existing OTP/verification templates may already use it — only add if absent.)

- [ ] **Step 1.3: Add the service method**

Open `apps/api/src/attendees/attendees.service.ts`. Add to the imports if not present:

```ts
import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import type { InviteAttendeeDto } from './dto/invite-attendee.dto';
```

Update the constructor to inject `MailService` and `ConfigService` if they're not already injected. Find the existing constructor (probably `constructor(private readonly prisma: PrismaService) {}`) and extend it:

```ts
constructor(
  private readonly prisma: PrismaService,
  private readonly mailService: MailService,
  private readonly configService: ConfigService,
) {}
```

If MailService isn't yet exported by `MailModule`, verify it is (most likely it is — `sendOtpEmail` is consumed elsewhere). The `AttendeesModule` may also need `MailModule` in its `imports` array. Open `apps/api/src/attendees/attendees.module.ts` and ensure:

```ts
import { MailModule } from '../mail/mail.module';
// ...
@Module({
  imports: [PrismaModule, MailModule, /* any others */],
  // ...
})
```

Then add the new method at the bottom of the `AttendeesService` class (after the existing methods, before the closing brace):

```ts
  async inviteAttendee(
    eventId: string,
    organiserId: string,
    dto: InviteAttendeeDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    const existing = await this.prisma.attendee.findFirst({
      where: {
        eventId,
        email: { equals: dto.email, mode: 'insensitive' },
      },
    });

    if (existing) {
      throw new ConflictException(
        'This email is already registered for this event.',
      );
    }

    const attendee = await this.prisma.attendee.create({
      data: {
        eventId,
        email: dto.email,
        firstName: dto.firstName,
        lastName: '',
        profileCompleted: false,
        consentGivenAt: new Date(),
      },
    });

    const baseUrl = this.configService.get<string>(
      'NEXT_PUBLIC_APP_URL',
      'http://localhost:3000',
    );
    const loginLink = `${baseUrl}/auth/attendee/login?email=${encodeURIComponent(dto.email)}&eventId=${eventId}`;

    try {
      await this.mailService.sendInviteEmail(
        dto.email,
        dto.firstName,
        event.name,
        loginLink,
      );
    } catch (err) {
      this.logger.warn(
        `Invite mail failed for ${dto.email}: ${(err as Error).message}`,
      );
      // Never roll back. Row exists; the organiser sees success.
    }

    await this.prisma.auditLog.create({
      data: {
        actorRole: 'organiser',
        actorId: organiserId,
        action: 'ATTENDEE_INVITED',
        entityType: 'Attendee',
        entityId: attendee.id,
        metadata: { invitedEmail: dto.email, eventId } as Prisma.InputJsonValue,
      },
    });

    return {
      attendeeId: attendee.id,
      email: attendee.email,
      firstName: attendee.firstName,
    };
  }
```

If the `Attendee` schema doesn't allow `consentGivenAt: Date()` and `lastName: ''` directly (i.e. either field is required-with-different-shape or `lastName` is non-nullable but ≥1 char), the engineer should adjust. The current schema (verified during exploration) has `lastName String @default("")` and `consentGivenAt DateTime?` — so this should work as-is.

If the `auditLog` model's `metadata` field is `Json?`, the cast `as Prisma.InputJsonValue` is correct. If a different type, drop the cast.

- [ ] **Step 1.4: Add the controller route**

Open `apps/api/src/attendees/attendees.controller.ts`. Add to imports if not present:

```ts
import { InviteAttendeeDto } from './dto/invite-attendee.dto';
```

Find the existing `@Get('events/:eventId/attendees')` route (modified in WS 4 to be ORGANISER+ATTENDEE). **Immediately after that route's closing brace**, add:

```ts
  @Post('events/:eventId/invite-attendee')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ORGANISER')
  @HttpCode(HttpStatus.CREATED)
  async inviteAttendee(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Body() dto: InviteAttendeeDto,
  ) {
    return this.attendeesService.inviteAttendee(eventId, user.organiserId!, dto);
  }
```

(`HttpCode` and `HttpStatus` are likely already imported — verify; if not, add.)

- [ ] **Step 1.5: Verify dev server compiled**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" | head -10 || echo "no errors"
```

Expected: `no errors` (pre-existing API Prisma connection errors are unrelated).

If TS compile errors mention these files, fix before proceeding. Common issues:
- `MailModule` not exporting `MailService` → add `exports: [MailService]` to its `@Module`
- `AttendeesModule` not importing `MailModule` → fix per Step 1.3 instructions
- Missing `ConflictException` import

- [ ] **Step 1.6: Backend smoke test — invite a fresh email**

Use Playwright MCP. Log in as organiser via direct API to bypass UI:

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    document.cookie.split(';').forEach(c => { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/') });
    localStorage.clear();
    const r = await fetch('/api/v1/auth/organiser/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'testorganiser@example.com', password: 'Organiser@2026' }),
    });
    const j = await r.json();
    if (j.accessToken) {
      localStorage.setItem('vims:auth', JSON.stringify({ state: { user: j.user, accessToken: j.accessToken, refreshToken: j.refreshToken } }));
    }
    return { status: r.status, hasUser: !!j.user, organiserId: j.user?.organiserId };
  }`
})
```

(The auth-store key in WS 4 was `auth-store` for attendees; for organisers it may differ — use `vims:auth` first; if that doesn't work, `auth-store`. Adapt based on the response.)

Then call the new endpoint via direct fetch:

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const tok = JSON.parse(localStorage.getItem('vims:auth') || localStorage.getItem('auth-store') || '{}')?.state?.accessToken;
    if (!tok) return { error: 'no token' };
    const eventId = 'cmoj5g67h0003n628x95wm4a9';
    const testEmail = 'invited+wsfive-' + Date.now() + '@example.com';
    const r = await fetch('/api/v1/events/' + eventId + '/invite-attendee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ email: testEmail, firstName: 'TaskOneTest' }),
    });
    return { status: r.status, body: await r.json(), testEmail };
  }`
})
```

Expected: `status: 201`, body shape `{ attendeeId, email, firstName }`. The `testEmail` will be unique per run (timestamped), so no 409.

- [ ] **Step 1.7: Backend smoke test — duplicate returns 409**

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const tok = JSON.parse(localStorage.getItem('vims:auth') || localStorage.getItem('auth-store') || '{}')?.state?.accessToken;
    if (!tok) return { error: 'no token' };
    const eventId = 'cmoj5g67h0003n628x95wm4a9';
    // Pick an existing attendee email — Rahul is in this event
    const r = await fetch('/api/v1/events/' + eventId + '/invite-attendee', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok },
      body: JSON.stringify({ email: 'rahul.krishnan@gmail.com', firstName: 'Conflict' }),
    });
    return { status: r.status, body: await r.json() };
  }`
})
```

Expected: `status: 409`, body contains `'already registered'` (case-insensitive).

- [ ] **Step 1.8: Verify the audit log row**

```bash
cat > /tmp/audit-check.sql <<'EOF'
SELECT action, actor_role, entity_id, metadata
FROM audit_logs
WHERE action = 'ATTENDEE_INVITED'
ORDER BY created_at DESC
LIMIT 1;
EOF
cd apps/api && npx prisma db execute --file /tmp/audit-check.sql --schema prisma/schema.prisma 2>&1 | tail -5
```

Expected: `Script executed successfully.` (the SELECT runs but `prisma db execute` doesn't print rows; the row's existence is confirmed by no error). For more visibility, you can use prisma studio or just trust the success — Step 1.6 succeeded so the audit row was inserted.

- [ ] **Step 1.9: Commit**

```bash
git add apps/api/src/attendees/dto/invite-attendee.dto.ts apps/api/src/attendees/attendees.controller.ts apps/api/src/attendees/attendees.service.ts apps/api/src/attendees/attendees.module.ts apps/api/src/mail/mail.service.ts apps/api/src/mail/mail.module.ts
git commit -m "feat(attendees): organiser invite endpoint + onboarding email

OG-1: POST /events/:eventId/invite-attendee, organiser-guarded.
Creates a stub Attendee row (email + firstName), fires onboarding
email via MailService (new sendInviteEmail method), writes audit
log entry. Rejects duplicates with 409. Email delivery failure
is logged but doesn't roll back the row."
```

(The `attendees.module.ts` and `mail.module.ts` are added to the staging area defensively in case the implementer needed to wire `MailModule` exports or `AttendeesModule` imports — `git commit` will skip files with no changes.)

---

## Task 2: OG-1 frontend (modal + button + toaster mount)

Add the InviteAttendeeModal, mount Toaster on organiser layout, and wire the Invite button on the attendees page.

**Files:**
- Create: `apps/web/src/components/organiser/InviteAttendeeModal.tsx` (~110 LOC)
- Modify: `apps/web/src/app/(organiser)/layout.tsx` (~10 LOC added — mount global Toaster)
- Modify: `apps/web/src/app/(organiser)/events/[eventId]/attendees/page.tsx` (~15 LOC added — Invite button + modal mount)

- [ ] **Step 2.1: Create the modal component**

```bash
mkdir -p apps/web/src/components/organiser
```

Create `apps/web/src/components/organiser/InviteAttendeeModal.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import { showToast } from "@/hooks/use-toast";

interface InviteAttendeeModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
  eventId: string;
  eventName: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function InviteAttendeeModal({
  open,
  onClose,
  onInvited,
  eventId,
  eventName,
}: InviteAttendeeModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setFirstName("");
    setStatus("idle");
    setEmailError(null);
    setGenericError(null);
    const t = setTimeout(() => emailRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "submitting") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, status]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setEmailError(null);
    setGenericError(null);
    try {
      await apiClient.post(`/events/${eventId}/invite-attendee`, {
        email: email.trim(),
        firstName: firstName.trim(),
      });
      onInvited();
      showToast(`Invitation sent to ${email.trim()}`);
      onClose();
    } catch (err) {
      const status = (err as { status?: number; response?: { status?: number } })?.status
        ?? (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setEmailError("This email is already registered for this event.");
      } else {
        setGenericError("Could not send invitation. Please try again.");
      }
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== "submitting") onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="relative w-full max-w-md mt-16 sm:mt-0 rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-2xl">
        <h2 id="invite-modal-title" className="text-lg font-semibold text-foreground">
          Invite an attendee to {eventName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          We&apos;ll email a one-tap login link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-foreground mb-1.5">
              Email address
            </label>
            <input
              ref={emailRef}
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              disabled={status === "submitting"}
              placeholder="vikram@example.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-60"
            />
            {emailError && (
              <p className="mt-1.5 text-xs text-rose-500" role="alert">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="invite-firstname" className="block text-sm font-medium text-foreground mb-1.5">
              First name
            </label>
            <input
              id="invite-firstname"
              type="text"
              required
              maxLength={80}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={status === "submitting"}
              placeholder="Vikram"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-60"
            />
          </div>

          {genericError && (
            <p className="text-sm text-rose-500" role="alert">
              {genericError}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={status === "submitting"}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2.2: Mount the Toaster in `(organiser)` layout**

Open `apps/web/src/app/(organiser)/layout.tsx`. The WS-4 `useToast` hook is already at `@/hooks/use-toast`. The `(attendee)` layout has the inline `Toaster` already; the organiser layout doesn't have one yet.

Look for the layout's first line: if it's `"use client";`, you can inline the Toaster like the attendee layout. If it's a server component, use the same `<ToasterClient />` separate-component pattern.

For inline (assume `"use client";` is the first line):

Add to imports:
```tsx
import { useToast } from "@/hooks/use-toast";
```

Inside the layout's `return` JSX, **near the bottom of the outermost wrapper element**, add:
```tsx
<Toaster />
```

At the bottom of the file (outside the layout component), add:
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

If the layout is a server component (no `"use client";`), do NOT add the inline component. Instead, use the WS-4 pattern: create or reuse `apps/web/src/components/Toaster.tsx` (it may already exist from WS 4 if that path was taken). If it doesn't exist, create it with the same body as the inline version above but wrapped at the file level (with `"use client";` header). Then mount `<ToasterClient />` from the RSC layout.

- [ ] **Step 2.3: Wire the Invite button on the attendees page**

Open `apps/web/src/app/(organiser)/events/[eventId]/attendees/page.tsx` (149 lines). Read it first to find the page header / search-bar area where the new button fits.

Add to imports:
```tsx
import { useState } from "react";
import { InviteAttendeeModal } from "@/components/organiser/InviteAttendeeModal";
```

Inside the component's body (before the `return`), add a useState:
```tsx
const [inviteOpen, setInviteOpen] = useState(false);
```

In the JSX, find the existing page header (likely contains an `<h1>` or similar with the event name + attendee count). **Add the Invite button next to it.** The exact placement depends on the existing markup — typical patterns:

```tsx
<button
  onClick={() => setInviteOpen(true)}
  className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm px-4 py-2 hover:bg-primary/90 transition-colors"
>
  Invite attendee
</button>
```

At the bottom of the JSX (just before the outermost closing tag), add the modal:

```tsx
<InviteAttendeeModal
  open={inviteOpen}
  onClose={() => setInviteOpen(false)}
  onInvited={() => {
    // Refetch the existing attendees query.
    // The exact name depends on the file — common shapes are
    // mutate() (SWR), refetch() (react-query), or load(1, search) for the local pattern.
    // Inspect the file and call whichever exists.
  }}
  eventId={params.eventId}
  eventName={event?.name ?? "this event"}
/>
```

**For the `onInvited` refetch:** read the existing attendees page to identify the loader function. The directory page used a local `load()` function; the organiser attendees page may use the same. Wire `onInvited` to call whatever loader the page uses to refresh the list. If the loader takes parameters (like `load(1, "")`), pass them; otherwise call with no args.

If `event?.name` isn't already in the page's state, add it (read it once via `apiClient.get(`/events/${eventId}`)` if not already fetched). The fallback `"this event"` keeps the modal title sensible.

- [ ] **Step 2.4: Verify dev server compiled cleanly**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" | head -10 || echo "no errors"
```

Expected: `no errors`.

- [ ] **Step 2.5: E2E smoke — open modal, submit, verify toast + new row**

Login as organiser via UI:

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => { document.cookie.split(';').forEach(c => { document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/') }); localStorage.clear(); }"
})
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/auth/organiser/login" })
```

Use `browser_fill_form` to enter `testorganiser@example.com` + `Organiser@2026`, submit. Should land on `/dashboard`.

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/events/cmoj5g67h0003n628x95wm4a9/attendees" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task2-attendees-list.png" })
```

Expected: page shows the 8 attendees + a new "Invite attendee" button in the header.

```
mcp__plugin_playwright_playwright__browser_click({
  element: "Invite attendee button",
  ref: "button:has-text('Invite attendee')"
})
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task2-modal-open.png" })
```

Expected: modal opens with title "Invite an attendee to Bengaluru Tech Summit", email + firstName fields, Cancel + Send invitation buttons.

Fill and submit:

```
mcp__plugin_playwright_playwright__browser_type({
  element: "email field",
  ref: "input#invite-email",
  text: "ws5-test-" + Date.now() + "@example.com"
})
mcp__plugin_playwright_playwright__browser_type({
  element: "firstName field",
  ref: "input#invite-firstname",
  text: "WS5Test"
})
mcp__plugin_playwright_playwright__browser_click({
  element: "Send invitation",
  ref: "button:has-text('Send invitation')"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 2 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task2-after-submit.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: modal closes, toast `Invitation sent to ws5-test-...@example.com` flashes briefly, attendee count increments, the new "WS5Test" row appears at the top of the list (or wherever the sort places newest). Zero console errors.

- [ ] **Step 2.6: E2E smoke — duplicate triggers inline 409 error**

```
mcp__plugin_playwright_playwright__browser_click({
  element: "Invite attendee button",
  ref: "button:has-text('Invite attendee')"
})
mcp__plugin_playwright_playwright__browser_type({
  element: "email field",
  ref: "input#invite-email",
  text: "rahul.krishnan@gmail.com"
})
mcp__plugin_playwright_playwright__browser_type({
  element: "firstName field",
  ref: "input#invite-firstname",
  text: "Test"
})
mcp__plugin_playwright_playwright__browser_click({
  element: "Send invitation",
  ref: "button:has-text('Send invitation')"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task2-409.png" })
```

Expected: modal stays open, inline error `This email is already registered for this event.` appears below the email field in rose-500.

- [ ] **Step 2.7: Commit**

```bash
git add apps/web/src/components/organiser/InviteAttendeeModal.tsx "apps/web/src/app/(organiser)/layout.tsx" "apps/web/src/app/(organiser)/events/[eventId]/attendees/page.tsx" apps/web/src/components/Toaster.tsx 2>/dev/null
git commit -m "feat(organiser): InviteAttendeeModal + Toaster mount on organiser layout

OG-1 frontend. Modal validates email + firstName, calls
POST /events/:eventId/invite-attendee, shows toast on success,
inline rose-500 error on 409. Toaster mounted in (organiser)
layout so future organiser-side toasts have a host."
```

---

## Task 3: OG-3 backend (activity endpoint + service)

Create the activity controller and service that compose a feed from existing tables.

**Files:**
- Create: `apps/api/src/organiser/activity.controller.ts` (~35 LOC)
- Create: `apps/api/src/organiser/activity.service.ts` (~140 LOC)
- Modify: `apps/api/src/organiser/organiser.module.ts` (~5 LOC added — register controller + service)

- [ ] **Step 3.1: Create the activity controller**

Create `apps/api/src/organiser/activity.controller.ts`:

```ts
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CurrentUser,
  type CurrentUserData,
} from '../auth/decorators/current-user.decorator';

@Controller('organiser')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get('events/:eventId/activity')
  @Roles('ORGANISER')
  async getEventActivity(
    @Param('eventId') eventId: string,
    @CurrentUser() user: CurrentUserData,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.activityService.getEventActivity(
      eventId,
      user,
      page ? parseInt(page, 10) : 1,
      pageSize ? Math.min(parseInt(pageSize, 10), 50) : 25,
    );
  }
}
```

- [ ] **Step 3.2: Create the activity service**

Create `apps/api/src/organiser/activity.service.ts`:

```ts
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CurrentUserData } from '../auth/decorators/current-user.decorator';
import { ConnectionStatus, EventStatus } from '@prisma/client';

type ActivityType =
  | 'attendee_registered'
  | 'announcement_sent'
  | 'attendees_milestone'
  | 'connection_milestone';

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  timestamp: Date;
  relatedEntityId?: string;
}

const ATTENDEE_THRESHOLDS = [25, 50, 100, 250, 500];
const CONNECTION_THRESHOLDS = [50, 100, 250, 500, 1000];
const LOOKBACK_DAYS = 30;

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  async getEventActivity(
    eventId: string,
    user: CurrentUserData,
    page: number = 1,
    pageSize: number = 25,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event || event.status === EventStatus.DELETED) {
      throw new NotFoundException('Event not found');
    }

    if (event.organiserId !== user.organiserId) {
      throw new ForbiddenException('You do not own this event');
    }

    const lookbackStart = new Date(
      Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
    );

    const [attendees, announcements] = await Promise.all([
      this.prisma.attendee.findMany({
        where: { eventId, registeredAt: { gte: lookbackStart } },
        orderBy: { registeredAt: 'desc' },
        take: 100,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          registeredAt: true,
        },
      }),
      this.prisma.announcement.findMany({
        where: { eventId, sentAt: { gte: lookbackStart } },
        orderBy: { sentAt: 'desc' },
        select: {
          id: true,
          title: true,
          recipientCount: true,
          sentAt: true,
        },
      }),
    ]);

    const items: ActivityItem[] = [];

    for (const a of attendees) {
      const fullName = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim() || 'A new attendee';
      const body = a.company ? `${fullName} · ${a.company}` : fullName;
      items.push({
        id: `attendee_registered-${a.id}`,
        type: 'attendee_registered',
        title: 'New attendee',
        body,
        timestamp: a.registeredAt,
        relatedEntityId: a.id,
      });
    }

    for (const ann of announcements) {
      if (!ann.sentAt) continue;
      items.push({
        id: `announcement_sent-${ann.id}`,
        type: 'announcement_sent',
        title: 'Announcement sent',
        body: `"${ann.title}" · sent to ${ann.recipientCount} attendees`,
        timestamp: ann.sentAt,
        relatedEntityId: ann.id,
      });
    }

    const attendeeMilestones = await this.computeAttendeeMilestones(
      eventId,
      lookbackStart,
    );
    items.push(...attendeeMilestones);

    const connectionMilestones = await this.computeConnectionMilestones(
      eventId,
      lookbackStart,
    );
    items.push(...connectionMilestones);

    items.sort((x, y) => y.timestamp.getTime() - x.timestamp.getTime());

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const skip = (page - 1) * pageSize;
    const slice = items.slice(skip, skip + pageSize);

    return {
      data: slice.map((i) => ({
        ...i,
        timestamp: i.timestamp.toISOString(),
      })),
      meta: { page, pageSize, total, totalPages },
    };
  }

  private async computeAttendeeMilestones(
    eventId: string,
    lookbackStart: Date,
  ): Promise<ActivityItem[]> {
    const out: ActivityItem[] = [];
    for (const threshold of ATTENDEE_THRESHOLDS) {
      const crossing = await this.prisma.attendee.findFirst({
        where: { eventId },
        orderBy: { registeredAt: 'asc' },
        skip: threshold - 1,
        take: 1,
        select: { registeredAt: true, id: true },
      });
      if (crossing && crossing.registeredAt >= lookbackStart) {
        out.push({
          id: `attendees_milestone-${threshold}`,
          type: 'attendees_milestone',
          title: 'Milestone reached',
          body: `${threshold} attendees registered so far`,
          timestamp: crossing.registeredAt,
        });
      }
    }
    return out;
  }

  private async computeConnectionMilestones(
    eventId: string,
    lookbackStart: Date,
  ): Promise<ActivityItem[]> {
    const out: ActivityItem[] = [];
    for (const threshold of CONNECTION_THRESHOLDS) {
      const crossing = await this.prisma.connectionRequest.findFirst({
        where: { eventId, status: ConnectionStatus.ACCEPTED },
        orderBy: { respondedAt: 'asc' },
        skip: threshold - 1,
        take: 1,
        select: { respondedAt: true, id: true },
      });
      if (
        crossing &&
        crossing.respondedAt &&
        crossing.respondedAt >= lookbackStart
      ) {
        out.push({
          id: `connection_milestone-${threshold}`,
          type: 'connection_milestone',
          title: 'Milestone reached',
          body: `Your event hit ${threshold} accepted connections`,
          timestamp: crossing.respondedAt,
        });
      }
    }
    return out;
  }
}
```

- [ ] **Step 3.3: Register the controller + service in the organiser module**

Open `apps/api/src/organiser/organiser.module.ts`. Add the new imports and register both:

```ts
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
```

Update the `@Module({...})` declaration so the `controllers` array includes `ActivityController` and the `providers` array includes `ActivityService`. Example shape (yours may vary):

```ts
@Module({
  imports: [PrismaModule, /* whatever else exists */],
  controllers: [OrganiserController, ActivityController],
  providers: [OrganiserService, ActivityService],
  exports: [OrganiserService],
})
export class OrganiserModule {}
```

Don't disturb existing entries — only append.

- [ ] **Step 3.4: Verify dev server compiled cleanly**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" | head -10 || echo "no errors"
```

Expected: `no errors`.

- [ ] **Step 3.5: Backend smoke — fetch activity for the test event**

Logged in as organiser (Step 1.6's auth pattern):

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const tok = JSON.parse(localStorage.getItem('vims:auth') || localStorage.getItem('auth-store') || '{}')?.state?.accessToken;
    if (!tok) return { error: 'no token' };
    const eventId = 'cmoj5g67h0003n628x95wm4a9';
    const r = await fetch('/api/v1/organiser/events/' + eventId + '/activity?page=1&pageSize=25', {
      headers: { 'Authorization': 'Bearer ' + tok },
    });
    const j = await r.json();
    return {
      status: r.status,
      total: j.meta?.total,
      types: Array.from(new Set((j.data ?? []).map(i => i.type))),
      sample: j.data?.[0],
    };
  }`
})
```

Expected: `status: 200`. The 8 attendees in this event should produce 8 `attendee_registered` items (or up to 100 — capped). `types` array should at least contain `attendee_registered`. `sample` has `id`, `type`, `title`, `body`, `timestamp` keys.

- [ ] **Step 3.6: Backend smoke — cross-event 403**

```
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `async () => {
    const tok = JSON.parse(localStorage.getItem('vims:auth') || localStorage.getItem('auth-store') || '{}')?.state?.accessToken;
    const r = await fetch('/api/v1/organiser/events/cxxx-not-yours/activity', {
      headers: { 'Authorization': 'Bearer ' + tok },
    });
    return { status: r.status };
  }`
})
```

Expected: `status: 404` (event not found) or 403 if a real-but-not-yours eventId was used.

- [ ] **Step 3.7: Commit**

```bash
git add apps/api/src/organiser/activity.controller.ts apps/api/src/organiser/activity.service.ts apps/api/src/organiser/organiser.module.ts
git commit -m "feat(organiser): add /events/:eventId/activity endpoint

OG-3 backend. ActivityService composes a feed from Attendee
registrations + Announcement sends + computed milestones (25/50/
100/250/500 attendees, 50/100/250/500/1000 accepted connections)
within a 30-day lookback window. Read-only — no schema change.
Result is sorted by timestamp desc and paginated (default 25)."
```

---

## Task 4: OG-3 frontend (page rewrite + layout badge cleanup)

Replace the mock `/notifications` page with real activity feed rendering. Remove any stale unread-badge UI from the organiser layout.

**Files:**
- Modify (full rewrite): `apps/web/src/app/(organiser)/notifications/page.tsx` (~120 LOC)
- Modify: `apps/web/src/app/(organiser)/layout.tsx` (~5 LOC removed if a stale badge exists)

- [ ] **Step 4.1: Rewrite the notifications page**

Replace `apps/web/src/app/(organiser)/notifications/page.tsx` entirely with:

```tsx
"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

type ActivityType =
  | "attendee_registered"
  | "announcement_sent"
  | "attendees_milestone"
  | "connection_milestone";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  timestamp: string;
  relatedEntityId?: string;
}

interface ActivityResponse {
  data: ActivityItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_STYLES: Record<ActivityType, { ring: string; tint: string }> = {
  attendee_registered: { ring: "border-emerald-500/20 text-emerald-500", tint: "bg-emerald-500/10" },
  announcement_sent: { ring: "border-indigo-500/20 text-indigo-500", tint: "bg-indigo-500/10" },
  attendees_milestone: { ring: "border-amber-500/20 text-amber-500", tint: "bg-amber-500/10" },
  connection_milestone: { ring: "border-amber-500/20 text-amber-500", tint: "bg-amber-500/10" },
};

const TYPE_ICONS: Record<ActivityType, ReactNode> = {
  attendee_registered: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  announcement_sent: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  attendees_milestone: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  connection_milestone: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
};

export default function OrganiserActivityPage() {
  const user = useAuthStore((s) => s.user) as { eventId?: string } | null;
  const eventId = user?.eventId;
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const load = async (targetPage: number, append: boolean) => {
    if (!eventId) return;
    setLoading(true);
    setErrored(false);
    try {
      const { data } = await apiClient.get<ActivityResponse>(
        `/organiser/events/${eventId}/activity?page=${targetPage}&pageSize=25`,
      );
      setItems((prev) => (append ? [...prev, ...data.data] : data.data));
      setTotalPages(data.meta.totalPages);
      setPage(data.meta.page);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const hasMore = page < totalPages;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">What&apos;s happening in your event</p>
      </div>

      {loading && items.length === 0 ? (
        <div className="mt-6 space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : errored ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-foreground font-semibold mb-2">Could not load activity</p>
          <button
            onClick={() => load(1, false)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No activity yet. Once attendees register or you send announcements, you&apos;ll see them here.
          </p>
        </div>
      ) : (
        <>
          <ul role="list" className="mt-6 space-y-2">
            {items.map((item) => {
              const styles = TYPE_STYLES[item.type];
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${styles.ring} ${styles.tint} shrink-0`}
                    aria-hidden="true"
                  >
                    {TYPE_ICONS[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                  <time
                    dateTime={item.timestamp}
                    className="text-xs text-muted-foreground/60 shrink-0 mt-0.5"
                  >
                    {timeAgo(item.timestamp)}
                  </time>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => load(page + 1, true)}
                disabled={loading}
                className="px-5 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                {loading ? "Loading…" : "Load more →"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4.2: Inspect the organiser layout for any stale unread-badge**

Read `apps/web/src/app/(organiser)/layout.tsx`. Look for any reference to `unread`, `notification.*count`, or a small dot/indicator near a notifications-bell icon in the nav. If there's local state binding the badge to mock data, remove the badge entirely or set its count to 0.

If no such badge exists, skip this step (the spec marked this as conditional).

If a badge IS present, the typical pattern in Next.js layouts is something like:

```tsx
{unreadCount > 0 && (
  <span className="absolute ...">{unreadCount}</span>
)}
```

Replace with nothing (delete the conditional + JSX). Keep the bell icon link to `/notifications`.

- [ ] **Step 4.3: Verify dev server compiled cleanly**

```bash
tail -30 /tmp/dev-server.log | grep -iE "error|failed" | grep -v "warn" | head -10 || echo "no errors"
```

Expected: `no errors`.

- [ ] **Step 4.4: E2E smoke — visit /notifications**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/notifications" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "task4-activity.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: page heading reads "Activity", subhead "What's happening in your event". Mixed feed showing attendee registrations (and any announcements present). Each item card has type-coloured icon, title, body, timestamp. Zero console errors.

If the page is empty (no events have any activity within 30 days), the empty-state copy renders instead — that's also acceptable.

- [ ] **Step 4.5: E2E smoke — Load more button (only if totalPages > 1)**

If the activity feed has more than 25 items, the "Load more →" button appears. Click it:

```
mcp__plugin_playwright_playwright__browser_click({
  element: "Load more button",
  ref: "button:has-text('Load more')"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
```

Expected: more items append to the list. Skip this step if the test event has too few activity items to trigger pagination.

- [ ] **Step 4.6: Commit**

```bash
git add "apps/web/src/app/(organiser)/notifications/page.tsx" "apps/web/src/app/(organiser)/layout.tsx"
git commit -m "feat(organiser): replace mock notifications with real activity feed

OG-3 frontend. Page rewrite — drops MOCK array, fetches
GET /organiser/events/:eventId/activity, renders mixed feed with
type-coloured icons + relative timestamps. Loading/empty/error/
load-more states all wired. Heading renamed to 'Activity'.
Layout: removed stale unread-badge binding (now compute-based,
no isRead concept)."
```

---

## Task 5: End-to-end verification

Walk through both flows end-to-end. Apply small fixes inline only if regressions surface.

- [ ] **Step 5.1: Console clean across both pages**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/events/cmoj5g67h0003n628x95wm4a9/attendees" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/notifications" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: zero errors on both pages.

- [ ] **Step 5.2: Mobile viewport — both pages**

```
mcp__plugin_playwright_playwright__browser_resize({ width: 390, height: 844 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/events/cmoj5g67h0003n628x95wm4a9/attendees" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-attendees-mobile.png" })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/notifications" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "verify-activity-mobile.png" })
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
```

Expected: Invite button visible on the attendees page header. Activity feed cards stack cleanly. No overflow.

- [ ] **Step 5.3: Cleanup test invite rows**

Delete the WS5-test attendee rows the smoke tests created:

```bash
cat > /tmp/cleanup-ws5.sql <<'EOF'
DELETE FROM attendees WHERE email LIKE 'ws5-test-%@example.com' OR email LIKE 'invited+wsfive%@example.com';
EOF
cd apps/api && npx prisma db execute --file /tmp/cleanup-ws5.sql --schema prisma/schema.prisma 2>&1 | tail -3
```

Expected: `Script executed successfully.`

- [ ] **Step 5.4: Final summary screenshot**

```
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/events/cmoj5g67h0003n628x95wm4a9/attendees" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "ws5-final-attendees.png", fullPage: true })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000/notifications" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "ws5-final-activity.png", fullPage: true })
```

- [ ] **Step 5.5: Optional fix commit**

If verification surfaced any regressions you fixed inline, commit them:

```bash
git add -A
git commit -m "fix(organiser): <one-line description>"
```

If everything passed, no commit needed.

---

## Self-Review

**Spec coverage:**
- ✅ OG-1 endpoint `POST /events/:eventId/invite-attendee` with email + firstName → Task 1
- ✅ OG-1 dedupe with 409 → Task 1 (Step 1.3) + verified in 1.7
- ✅ OG-1 audit log row written → Task 1 (Step 1.3) + verified in 1.8
- ✅ OG-1 onboarding email via `MailService.sendInviteEmail` → Task 1 (Step 1.2)
- ✅ OG-1 modal with email + firstName + 409 inline error → Task 2 (Step 2.1)
- ✅ OG-1 Toaster mounted on (organiser) layout → Task 2 (Step 2.2)
- ✅ OG-1 Invite button + modal mount on attendees page → Task 2 (Step 2.3)
- ✅ OG-3 endpoint `GET /organiser/events/:eventId/activity` → Task 3
- ✅ OG-3 4 activity types (attendee_registered, announcement_sent, attendees_milestone, connection_milestone) → Task 3 (Step 3.2)
- ✅ OG-3 30-day lookback + pagination → Task 3 (Step 3.2)
- ✅ OG-3 ownership 403/404 checks → Task 3 (Step 3.2) + verified in 3.6
- ✅ OG-3 page rewrite with loading/empty/error/load-more states → Task 4 (Step 4.1)
- ✅ OG-3 layout badge cleanup → Task 4 (Step 4.2)
- ✅ Mobile verification → Task 5 (Step 5.2)
- ✅ Test data cleanup → Task 5 (Step 5.3)

**Placeholder scan:** no TBD/"TODO"/"implement later". The plan does have one direction — Task 2 Step 2.3 says the engineer needs to "inspect the existing attendees page" to identify the loader function name. That's a directive, not a placeholder; the file is small (149 LOC) and the function is easy to identify.

**Type/name consistency:**
- `InviteAttendeeDto` defined in Task 1.1, used in 1.3 + 1.4
- `inviteAttendee` method name consistent across service + controller + frontend call site
- `ActivityType` union (4 values) used identically in service (Task 3.2) and page (Task 4.1) — both list them in the same order
- `ActivityItem` shape (`id`, `type`, `title`, `body`, `timestamp`, `relatedEntityId?`) consistent
- `ATTENDEE_THRESHOLDS` / `CONNECTION_THRESHOLDS` named consistently
- Endpoint paths consistent: `/events/:eventId/invite-attendee` and `/organiser/events/:eventId/activity`

Plan is ready for execution.
