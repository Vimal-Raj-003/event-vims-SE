# Landing Page Light-Mode Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert all landing page sections below the hero from dark to a polished light theme, and add an auto-cycling spotlight to the WhatYouGet feature cards. Hero is untouched.

**Architecture:** Two small React hooks (`useAutoSpotlight`, `useScrollReveal`) drive shared behavior. Three section components (`WhatYouGet`, `PricingSimple`, `FinalCTA`) get class-level restyles to a `slate-900` / `white` / `gray-50` palette while keeping the same emerald + indigo accent system from the hero. No Tailwind config or globals.css changes. Hero files are not modified.

**Tech Stack:** Next 14 App Router, React 18, TypeScript, Tailwind CSS, no component test framework (verification is `npm run type-check` + `npm run lint` + manual browser check).

**Spec:** [docs/superpowers/specs/2026-05-04-landing-light-mode-redesign-design.md](../specs/2026-05-04-landing-light-mode-redesign-design.md)

---

## Notes Before Starting

**No component test framework.** The repo has no Jest/Vitest setup and no `.test.tsx` files. TDD-style "write a failing test first" does not apply here. Each task uses this verification loop instead:

1. **Type-check:** `npm run type-check --workspace=apps/web`
2. **Lint:** `npm run lint --workspace=apps/web`
3. **Manual browser check:** Run `npm run dev --workspace=apps/web`, visit `http://localhost:3000`, confirm the acceptance criteria for that task.

If you don't have access to a browser, ask the user to verify before committing. Don't claim work is done without verification — see superpowers:verification-before-completion.

**Hero invariance.** Before committing each task, run `git diff -- apps/web/src/components/Hero.tsx apps/web/src/components/hero/` and confirm the output is empty. The hero is out of scope.

**Working directory.** All paths are relative to repo root: `c:\Users\jillj\OneDrive\Desktop\VIMS-EVENT`.

**`bg-dark-section` token.** Defined in `apps/web/src/app/globals.css:166-168`. We are removing all uses of it from the three landing files but **leaving the CSS token in place** (it may be used by future routes; removing it is out of scope).

---

## File Structure

| File                                              | Status   | Responsibility                                                |
| ------------------------------------------------- | -------- | ------------------------------------------------------------- |
| `apps/web/src/hooks/use-auto-spotlight.ts`        | Create   | Cycle an active index every N ms with pause/visibility/RM hooks |
| `apps/web/src/hooks/use-scroll-reveal.ts`         | Create   | One-shot IntersectionObserver hook for scroll-in animations   |
| `apps/web/src/components/landing/WhatYouGet.tsx`  | Modify   | Light theme + auto-cycling spotlight + scroll reveal          |
| `apps/web/src/components/landing/PricingSimple.tsx` | Modify | Light theme + scroll reveal                                   |
| `apps/web/src/components/landing/FinalCTA.tsx`    | Modify   | Light theme + faint emerald decorative blob + scroll reveal   |

No edits to: `Hero.tsx`, `hero/*`, `tailwind.config.ts`, `globals.css`, `(public)/page.tsx` (the page composes the components — composition stays the same).

---

## Task 1: Create `useAutoSpotlight` hook

**Files:**
- Create: `apps/web/src/hooks/use-auto-spotlight.ts`

**Purpose:** Encapsulate the auto-cycling active-index state machine. Returns `{ activeIndex, pause, resume }`. Reads `prefers-reduced-motion` and disables auto-cycling under it.

- [ ] **Step 1: Create the hook file**

Write `apps/web/src/hooks/use-auto-spotlight.ts`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

interface UseAutoSpotlightOptions {
  /** How many items in the cycle. */
  count: number;
  /** Milliseconds between advances. */
  intervalMs: number;
  /** When false, the cycle is paused (e.g., section out of view, hover). */
  enabled: boolean;
  /** Reset to index 0. Increment this value (or change identity) to trigger a reset. */
  resetKey?: unknown;
}

interface UseAutoSpotlightResult {
  activeIndex: number;
  /** Force a manual pause (used by hover/focus handlers). */
  pause: () => void;
  /** Resume after a manual pause. */
  resume: () => void;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useAutoSpotlight({
  count,
  intervalMs,
  enabled,
  resetKey,
}: UseAutoSpotlightOptions): UseAutoSpotlightResult {
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Reset to 0 whenever resetKey changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [resetKey]);

  // Cycle.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const shouldRun = enabled && !manualPause && !reducedMotion && count > 1;
    if (!shouldRun) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, manualPause, reducedMotion, count, intervalMs]);

  return {
    activeIndex,
    pause: () => setManualPause(true),
    resume: () => setManualPause(false),
  };
}
```

- [ ] **Step 2: Verify type-check and lint**

Run from repo root:

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```

Expected: both pass with no new errors. (Pre-existing warnings in unrelated files are fine.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-auto-spotlight.ts
git commit -m "feat(web): add useAutoSpotlight hook for auto-cycling card highlight"
```

---

## Task 2: Create `useScrollReveal` hook

**Files:**
- Create: `apps/web/src/hooks/use-scroll-reveal.ts`

**Purpose:** A one-shot IntersectionObserver helper. Returns a ref + a boolean that flips to `true` the first time the element enters the viewport and stays `true`. Respects `prefers-reduced-motion` by setting the boolean to `true` immediately.

- [ ] **Step 1: Create the hook file**

Write `apps/web/src/hooks/use-scroll-reveal.ts`:

```typescript
"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
  /** Fraction of element that must be visible before reveal triggers. */
  threshold?: number;
  /** Margin around the root for the observer. */
  rootMargin?: string;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reduced motion: skip the animation, reveal immediately.
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      setRevealed(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, revealed };
}
```

- [ ] **Step 2: Verify type-check and lint**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```

Expected: both pass.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/use-scroll-reveal.ts
git commit -m "feat(web): add useScrollReveal one-shot intersection hook"
```

---

## Task 3: Restyle `FinalCTA` to light mode

**Files:**
- Modify: `apps/web/src/components/landing/FinalCTA.tsx` (full rewrite)

**Purpose:** Smallest of the three sections — start here to lock the light-mode token choices before applying them to the larger files.

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/web/src/components/landing/FinalCTA.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

export function FinalCTA() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();

  return (
    <section className="relative bg-white py-24 lg:py-32 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full bg-emerald-200/25 blur-[120px]"
      />

      <div
        ref={ref}
        className={`relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center transition-all duration-700 ease-out ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 mb-4">
          Get started
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance mb-5">
          Ready to transform your event networking?
        </h2>
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Be among the first to use VIMS Events. Set up your first event in under five minutes — completely free during beta.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/organiser/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl px-7 py-3.5 text-base shadow-sm hover:shadow transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Create Your First Event
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </Link>
          <Link
            href="/auth/attendee/login"
            className="inline-flex items-center bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-semibold rounded-xl px-7 py-3.5 text-base transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Attendee? Join Event
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify type-check and lint**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```

Expected: both pass.

- [ ] **Step 3: Verify hero is untouched**

```bash
git diff -- apps/web/src/components/Hero.tsx apps/web/src/components/hero/
```

Expected: no output.

- [ ] **Step 4: Manual browser check**

Run `npm run dev --workspace=apps/web`, open `http://localhost:3000`, scroll to the bottom CTA. Confirm:

- White background (no dark slab)
- "Get started" pill is emerald-on-emerald-50
- Heading is dark slate, body is medium slate
- Primary button is emerald with white text
- Secondary button is white with slate border
- Faint emerald blur visible in the bottom-right corner
- Section content fades up once on first scroll into view

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/landing/FinalCTA.tsx
git commit -m "refactor(web): restyle FinalCTA to light mode with scroll reveal"
```

---

## Task 4: Restyle `PricingSimple` to light mode

**Files:**
- Modify: `apps/web/src/components/landing/PricingSimple.tsx` (full rewrite)

**Purpose:** Light theme for the pricing/email-capture section. Form behavior and validation are unchanged.

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/web/src/components/landing/PricingSimple.tsx` with:

```tsx
"use client";

import { useState, type FormEvent } from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

type Status = "idle" | "submitting" | "success" | "error";

export function PricingSimple() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    // TODO: wire to POST /api/v1/public/launch-notify
    await new Promise((r) => setTimeout(r, 600));
    setStatus("success");
  };

  return (
    <section className="relative bg-gray-50 py-24 lg:py-32 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -left-20 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-emerald-200/20 blur-[120px]"
      />

      <div
        ref={ref}
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 mb-3">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance mb-3">
            Free during beta
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            We&apos;ll lock pricing when we exit beta. Drop your email and we&apos;ll let you know — no spam, no auto-charges.
          </p>
        </div>

        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-200 bg-white p-8 sm:p-10 shadow-sm">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Free during beta
            </span>
          </div>

          <p className="text-slate-700 text-base text-center">
            Unlimited events <span className="text-slate-400">·</span> Unlimited attendees{" "}
            <span className="text-slate-400">·</span> All features unlocked
          </p>

          <div className="my-6 border-t border-slate-200" />

          {status === "success" ? (
            <div role="status" className="flex flex-col items-center text-center py-2">
              <div className="w-10 h-10 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mb-3">
                <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-slate-900">You&apos;re on the list. We&apos;ll email you once.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="launch-email" className="block text-sm text-slate-700 font-medium mb-3">
                Get notified when paid plans launch:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="launch-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  placeholder="you@company.com"
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-colors"
                  disabled={status === "submitting"}
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {status === "submitting" ? "Sending…" : "Notify me"}
                </button>
              </div>
              {status === "error" && (
                <p className="mt-2 text-xs text-rose-600" role="alert">
                  Please enter a valid email address.
                </p>
              )}
              <p className="text-xs text-slate-500 mt-3">
                We&apos;ll only email once — when pricing locks.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify type-check and lint**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```

Expected: both pass.

- [ ] **Step 3: Verify hero is untouched**

```bash
git diff -- apps/web/src/components/Hero.tsx apps/web/src/components/hero/
```

Expected: no output.

- [ ] **Step 4: Manual browser check**

In `http://localhost:3000`, scroll to the Pricing section. Confirm:

- Background is `gray-50` (slightly off-white, distinct from the WhatYouGet section above and FinalCTA below)
- White card with emerald border
- Eyebrow pill, headings, body text use light-mode tokens
- Email input field is white with slate border; focusing it shows an emerald ring
- "Notify me" button is solid emerald with white text
- Submitting an invalid email shows a `rose-600` error
- Submitting a valid email shows the success state with emerald check
- Section fades in once on scroll

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/landing/PricingSimple.tsx
git commit -m "refactor(web): restyle PricingSimple to light mode with scroll reveal"
```

---

## Task 5: Restyle `WhatYouGet` to light mode and wire the auto-cycling spotlight

**Files:**
- Modify: `apps/web/src/components/landing/WhatYouGet.tsx` (full rewrite)

**Purpose:** Light theme + the auto-cycling spotlight behavior. The icon SVG content for each feature is unchanged from current (Heroicons paths). Tab a11y, arrow-key navigation, and role/tabpanel ARIA wiring stay intact.

- [ ] **Step 1: Replace the file contents**

Overwrite `apps/web/src/components/landing/WhatYouGet.tsx` with:

```tsx
"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useAutoSpotlight } from "@/hooks/use-auto-spotlight";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

type Role = "organiser" | "attendee";

interface FeatureBlock {
  title: string;
  body: string;
  icon: ReactNode;
}

const SPOTLIGHT_INTERVAL_MS = 2500;

const ICON_PROPS = {
  className: "h-5 w-5",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.75,
} as const;

const ORGANISER_BLOCKS: FeatureBlock[] = [
  {
    title: "5-minute event setup",
    body: "Wizard handles branding, registration fields, and networking rules in one pass. No drafts to revisit.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Real-time analytics",
    body: "Connections-per-hour, top connectors, drop-off, response times. Visible during the event, not after.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Custom branding",
    body: "Logo, colours, branded business cards. Match your event identity end-to-end.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    title: "Excel export",
    body: "Four structured sheets: attendees, connections, engagement, audit log. Column-aligned to most CRMs.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    title: "Announcements",
    body: "Push messages to all attendees mid-event. SMS-grade urgency, no app download required.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "DPDP compliant",
    body: "Consent capture, right to access, right to erasure. Built in, not retrofitted.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

const ATTENDEE_BLOCKS: FeatureBlock[] = [
  {
    title: "No app needed",
    body: "Works in any mobile browser. Receive your event link, scan, done.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: "One-scan QR exchange",
    body: "Connect with anyone in the room in two seconds. Their vCard lands in your phone's contacts.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
  {
    title: "Smart directory",
    body: "Search by name, company, industry, or interest. Filter to find the people who matter.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: "Privacy-first",
    body: "Phone and email only shared after both sides accept. Pause your profile any time.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: "Personal dashboard",
    body: "Every connection saved, every conversation noted. Follow up without losing context.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "vCard / CSV export",
    body: "Walk out with a clean address book. No retyping, no lost cards.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
];

export function WhatYouGet() {
  const [role, setRole] = useState<Role>("organiser");
  const blocks = role === "organiser" ? ORGANISER_BLOCKS : ATTENDEE_BLOCKS;
  const accent = role === "organiser" ? "emerald" : "indigo";

  const organiserDesktopRef = useRef<HTMLButtonElement>(null);
  const attendeeDesktopRef = useRef<HTMLButtonElement>(null);
  const organiserMobileRef = useRef<HTMLButtonElement>(null);
  const attendeeMobileRef = useRef<HTMLButtonElement>(null);

  const cardsContainerRef = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);

  // Track whether the cards container is in view (for cycle pause).
  useEffect(() => {
    const node = cardsContainerRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const { activeIndex, pause, resume } = useAutoSpotlight({
    count: blocks.length,
    intervalMs: SPOTLIGHT_INTERVAL_MS,
    enabled: inView,
    resetKey: role,
  });

  const { ref: revealRef, revealed } = useScrollReveal<HTMLDivElement>();

  const switchRoleByKey = (
    e: KeyboardEvent<HTMLButtonElement>,
    surface: "desktop" | "mobile",
  ) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const newRole: Role = role === "organiser" ? "attendee" : "organiser";
    setRole(newRole);
    requestAnimationFrame(() => {
      const targetRef =
        surface === "desktop"
          ? newRole === "organiser"
            ? organiserDesktopRef
            : attendeeDesktopRef
          : newRole === "organiser"
            ? organiserMobileRef
            : attendeeMobileRef;
      targetRef.current?.focus();
    });
  };

  const accentBorderActive =
    accent === "emerald" ? "border-emerald-400" : "border-indigo-400";
  const accentRingActive =
    accent === "emerald" ? "ring-emerald-100" : "ring-indigo-100";
  const accentIconBgActive =
    accent === "emerald" ? "bg-emerald-500 text-white border-emerald-500" : "bg-indigo-500 text-white border-indigo-500";
  const accentIconBgIdle =
    accent === "emerald"
      ? "bg-emerald-50 border-emerald-200 text-emerald-600"
      : "bg-indigo-50 border-indigo-200 text-indigo-600";

  return (
    <section className="relative bg-white py-24 lg:py-32 overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-20 right-0 h-[300px] w-[300px] rounded-full bg-emerald-200/20 blur-[120px]"
      />

      <div
        ref={revealRef}
        className={`relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 mb-3">
            What you get
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance mb-3">
            Built for both sides of the room
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Everything organisers need to run the event, everything attendees need to make it count.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Audience"
          className="hidden sm:flex border-b border-slate-200 mt-12 mb-8"
        >
          <button
            ref={organiserDesktopRef}
            id="tab-organiser-d"
            role="tab"
            aria-selected={role === "organiser"}
            aria-controls="features-panel"
            tabIndex={role === "organiser" ? 0 : -1}
            onClick={() => setRole("organiser")}
            onKeyDown={(e) => switchRoleByKey(e, "desktop")}
            className={`px-4 pb-3 text-sm font-semibold transition-colors -mb-px border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              role === "organiser"
                ? "text-slate-900 border-emerald-500"
                : "text-slate-500 hover:text-slate-800 border-transparent"
            }`}
          >
            For Organisers
          </button>
          <button
            ref={attendeeDesktopRef}
            id="tab-attendee-d"
            role="tab"
            aria-selected={role === "attendee"}
            aria-controls="features-panel"
            tabIndex={role === "attendee" ? 0 : -1}
            onClick={() => setRole("attendee")}
            onKeyDown={(e) => switchRoleByKey(e, "desktop")}
            className={`px-4 pb-3 text-sm font-semibold transition-colors -mb-px border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              role === "attendee"
                ? "text-slate-900 border-indigo-500"
                : "text-slate-500 hover:text-slate-800 border-transparent"
            }`}
          >
            For Attendees
          </button>
        </div>

        <div role="tablist" aria-label="Audience" className="sm:hidden flex gap-2 mt-12 mb-8">
          <button
            ref={organiserMobileRef}
            id="tab-organiser-m"
            role="tab"
            aria-selected={role === "organiser"}
            aria-controls="features-panel"
            tabIndex={role === "organiser" ? 0 : -1}
            onClick={() => setRole("organiser")}
            onKeyDown={(e) => switchRoleByKey(e, "mobile")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              role === "organiser" ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Organisers
          </button>
          <button
            ref={attendeeMobileRef}
            id="tab-attendee-m"
            role="tab"
            aria-selected={role === "attendee"}
            aria-controls="features-panel"
            tabIndex={role === "attendee" ? 0 : -1}
            onClick={() => setRole("attendee")}
            onKeyDown={(e) => switchRoleByKey(e, "mobile")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              role === "attendee" ? "bg-indigo-500 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            Attendees
          </button>
        </div>

        <div
          id="features-panel"
          role="tabpanel"
          aria-labelledby={`tab-${role}-d tab-${role}-m`}
          ref={cardsContainerRef}
          onMouseEnter={pause}
          onMouseLeave={resume}
          onFocusCapture={pause}
          onBlurCapture={resume}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {blocks.map((b, idx) => {
            const isActive = idx === activeIndex;
            return (
              <div
                key={b.title}
                className={`rounded-2xl border bg-white p-6 transition-all duration-300 ease-out ${
                  isActive
                    ? `${accentBorderActive} shadow-lg ring-4 ${accentRingActive} -translate-y-1`
                    : "border-slate-200 shadow-sm hover:border-slate-300 hover:shadow"
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 transition-colors duration-300 ease-out ${
                    isActive ? accentIconBgActive : accentIconBgIdle
                  }`}
                >
                  {b.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">{b.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{b.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          {/* TODO: ship full feature matrix in WS 4 or later */}
          <a
            href="/docs/features"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded"
          >
            Want to compare side-by-side? View the full feature matrix
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify type-check and lint**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```

Expected: both pass.

- [ ] **Step 3: Verify hero is untouched**

```bash
git diff -- apps/web/src/components/Hero.tsx apps/web/src/components/hero/
```

Expected: no output.

- [ ] **Step 4: Manual browser check — visual**

In `http://localhost:3000`, scroll to the WhatYouGet section. Confirm:

- White background. No dark slab.
- Eyebrow pill is emerald-on-emerald-50 with emerald-700 text.
- Headings are `slate-900`, body text is `slate-600`.
- Six cards are visible (organiser default), white with thin slate-200 borders.
- One card at a time has: a lifted position, an emerald border, an emerald-100 ring halo, and a solid emerald icon tile with white icon. The other five remain calm.
- The active card advances roughly every 2.5 s.
- Hover anywhere over the grid → cycling stops. Move the mouse out → cycling resumes after a beat.
- Tab into one of the cards (or focus the matrix link below them while the focus is captured) → cycling stops. Tab out → resumes.
- Click the "For Attendees" tab → cards swap to attendee set, accent flips to indigo, spotlight resets to first card and continues cycling.
- Use arrow keys on focused tabs → role flips, focus moves to the new tab.

- [ ] **Step 5: Manual browser check — reduced motion**

In Chrome DevTools, open the Rendering panel (`Cmd/Ctrl+Shift+P` → "Show rendering"). Set "Emulate CSS media feature prefers-reduced-motion" to "reduce". Reload. Confirm:

- No card auto-cycles. All cards stay in resting state.
- Hovering an individual card still gives the slate-300 / shadow hover effect.
- The scroll-reveal fade is gone (sections appear at full opacity immediately).

Reset the rendering setting back to default.

- [ ] **Step 6: Manual browser check — out-of-view pause**

Scroll the WhatYouGet section out of view. Wait ~10 s. Scroll back. Confirm cycling resumes from where it was (or close to it) and does not appear "frozen" or to skip 4 cards instantly. (If it skipped, that means the interval kept running while off-screen — which is what we explicitly tried to prevent. Re-check that `inView` is wired to `enabled`.)

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/landing/WhatYouGet.tsx
git commit -m "refactor(web): restyle WhatYouGet to light mode with auto-cycling spotlight"
```

---

## Task 6: Final QA across the page

**Files:** none modified — verification only.

**Purpose:** End-to-end check across all three sections plus a final hero-invariance proof.

- [ ] **Step 1: Type-check + lint at workspace level**

```bash
npm run type-check --workspace=apps/web
npm run lint --workspace=apps/web
```

Expected: both pass.

- [ ] **Step 2: Production build sanity check**

```bash
npm run build --workspace=apps/web
```

Expected: build completes with no new errors. (If a `.next` cache issue appears, delete `apps/web/.next/` and rebuild.)

- [ ] **Step 3: Hero invariance — final**

```bash
git diff master -- apps/web/src/components/Hero.tsx apps/web/src/components/hero/
```

Expected: no output. The hero has not been modified on this branch.

- [ ] **Step 4: Full landing page browser walkthrough**

Run `npm run dev --workspace=apps/web`, open `http://localhost:3000`, and walk top to bottom. Confirm:

1. **Hero:** dark gradient with phone preview — exactly as before. No regressions.
2. **WhatYouGet:** white background, light cards, auto-spotlight cycling on emerald (organiser) and indigo (attendee).
3. **PricingSimple:** `gray-50` background, white card with emerald border, working email form.
4. **FinalCTA:** white background, emerald primary CTA, decorative emerald blur in the corner.
5. **Section transitions:** dark hero → white WhatYouGet is a clean cut (no fade). White → `gray-50` → white rhythm reads cleanly.
6. **Responsive:** resize the window from desktop down to mobile (`375px`). All three sections reflow correctly. Tabs swap to mobile pill layout. Spotlight still cycles.
7. **Console:** no errors or warnings in the browser DevTools console.

- [ ] **Step 5: Take a "before/after" screenshot pair (optional)**

If you have a screenshot tool handy, capture full-page screenshots of the landing page at desktop width to attach to the commit message or PR description.

- [ ] **Step 6: Final commit (only if anything was tweaked during QA)**

If Step 4 surfaced anything that needed a fix, commit it now:

```bash
git add -p
git commit -m "polish(web): minor adjustments after landing redesign QA"
```

If nothing needed changing, skip this step.

---

## Self-Review Checklist (already performed by the planner)

**Spec coverage:**

| Spec section                                   | Implemented in   |
| ---------------------------------------------- | ---------------- |
| § 2 Foundation tokens                          | Tasks 3, 4, 5    |
| § 3.1 WhatYouGet light restyle                 | Task 5           |
| § 3.2 Auto-cycling spotlight (2.5 s, pause, RM) | Tasks 1, 5       |
| § 3.3 Accessibility                            | Tasks 1, 5       |
| § 4 PricingSimple light restyle                | Task 4           |
| § 5 FinalCTA light restyle + decorative blob   | Task 3           |
| § 6 Cross-section polish (scroll reveal, RM)   | Tasks 2, 3, 4, 5 |
| § 7 Out of scope (hero untouched)              | Steps in Tasks 3–6 verify hero diff is empty |
| § 9 Acceptance criteria                        | Task 6           |

**Type consistency:** `useAutoSpotlight` in Task 1 returns `{ activeIndex, pause, resume }`; Task 5 consumes it as `{ activeIndex, pause, resume }`. `useScrollReveal` in Task 2 returns `{ ref, revealed }`; Tasks 3, 4, 5 consume it as `{ ref, revealed }`. Both hooks accept generic `<T>` — call sites pass `<HTMLDivElement>`, matching how they're attached.

**Placeholder scan:** No "TBD" / "implement later" / vague handlers. Every step has either complete code or an exact command. The single existing `// TODO: ship full feature matrix in WS 4 or later` and `// TODO: wire to POST /api/v1/public/launch-notify` are pre-existing in the source files and explicitly preserved (not new placeholders).
