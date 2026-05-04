# Landing Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 535-line pastel landing page with three focused dark-themed components (`WhatYouGet`, `PricingSimple`, `FinalCTA`) plus an 80-line orchestrator, deleting all fake content and the now-unused scroll-reveal CSS.

**Architecture:** Three independently-mounted components under `apps/web/src/components/landing/`. Page-level file just composes them after the locked hero. Single `bg-slate-950` chapter from hero-bottom-fade through footer; emerald is the only accent.

**Tech Stack:** Next.js 15 App Router · React 18 · Tailwind 3 (with arbitrary-value opacity per WS-2 lesson) · pure-CSS keyframes only · no new dependencies.

**Spec:** [docs/superpowers/specs/2026-05-04-landing-redesign-design.md](../specs/2026-05-04-landing-redesign-design.md)

---

## Pre-flight

The dev server should already be running. Confirm:

```bash
curl -s -o /dev/null -w "API:%{http_code}\nWEB:%{http_code}\n" http://localhost:4000/api/v1/health http://localhost:3000
```

Expected: `API:200` / `WEB:200`. If down, start with `npm run dev` from repo root.

Visual verification uses Playwright MCP: `mcp__plugin_playwright_playwright__browser_*`. The browser may still be open from prior workstreams — that's fine, just navigate fresh at the start of each verification step.

**Tailwind 3 opacity gotcha (carryover from WS 2):** the default opacity scale is `0/5/10/15/20/.../100`. Sub-`/5` opacity classes like `bg-white/8`, `bg-white/[0.04]`, `bg-emerald-500/[0.04]` MUST use the arbitrary-value bracket syntax `/[0.0X]`. The plan uses bracket syntax everywhere it needs sub-`/5` alpha.

---

## Task 1: CSS cleanup and new utilities

Remove the now-orphan `.reveal*` rules and add the two utilities the new components need (`@keyframes glowDrift` + `.bg-dark-section`).

**Files:**
- Modify: `apps/web/src/app/globals.css`

- [ ] **Step 1.1: Remove the unused scroll-reveal block (lines ~85–116)**

Open `apps/web/src/app/globals.css`. Find the block starting with `/* ─── Scroll Reveal ────...` (line 85) and delete everything through the closing `.reveal-d6` rule on line 116, including the empty line before the next comment block.

Before the deletion the section reads:

```css
/* ─── Scroll Reveal ────────────────────────────────────────────── */
.reveal {
  opacity: 0;
  transform: translateY(36px);
  transition: opacity 0.75s cubic-bezier(0.16,1,0.3,1),
              transform 0.75s cubic-bezier(0.16,1,0.3,1);
  will-change: opacity, transform;
}
.reveal.visible { opacity: 1; transform: translateY(0); }

.reveal-left { /* ... */ }
.reveal-left.visible { /* ... */ }

.reveal-right { /* ... */ }
.reveal-right.visible { /* ... */ }

.reveal-d1 { transition-delay: 80ms; }
.reveal-d2 { transition-delay: 160ms; }
.reveal-d3 { transition-delay: 240ms; }
.reveal-d4 { transition-delay: 320ms; }
.reveal-d5 { transition-delay: 400ms; }
.reveal-d6 { transition-delay: 480ms; }
```

Delete the entire block. The next existing comment `/* ─── Animations ───...` should sit immediately after the closing `}` of the `h1,h2,h3...` rule (around line 82).

- [ ] **Step 1.2: Append `@keyframes glowDrift` and `.bg-dark-section` utility**

Find the existing animations section. The previous WS-2 work appended `kenBurns` and `notifSlideIn` keyframes plus the `prefers-reduced-motion` guard. Locate the closing `}` of the `prefers-reduced-motion` block (last line of the Animations section, before `/* ─── Utilities ───...`).

Append these rules **inside** the same Animations region (above `/* ─── Utilities ───...`):

```css
@keyframes glowDrift {
  0%   { transform: translate(0, 0); }
  100% { transform: translate(2%, -1%); }
}

.animate-glow-drift {
  animation: glowDrift 60s ease-in-out infinite alternate;
  will-change: transform;
}

.bg-dark-section {
  background-color: hsl(222 47% 8%);
}
```

Then **add `animate-glow-drift` to the existing `prefers-reduced-motion: reduce` `animation: none !important` list** so the drift respects user preference. The block currently looks like:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-ken-burns,
  .animate-notif-slide-in,
  .animate-pulse-ring,
  .animate-gradient,
  .animate-float,
  .animate-blob {
    animation: none !important;
  }
  .animate-notif-slide-in { opacity: 1; }
}
```

Update it to:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-ken-burns,
  .animate-notif-slide-in,
  .animate-glow-drift,
  .animate-pulse-ring,
  .animate-gradient,
  .animate-float,
  .animate-blob {
    animation: none !important;
  }
  .animate-notif-slide-in { opacity: 1; }
}
```

- [ ] **Step 1.3: Verify dev server hot-reload**

```bash
tail -30 /tmp/dev-server.log | grep -i "error\|warn" || echo "no errors"
```

Expected: `no errors` (or only unrelated warnings).

- [ ] **Step 1.4: Visual check the current page didn't break**

The current `(public)/page.tsx` still uses `.reveal` classes via `useReveal()`. The hook will silently no-op (it adds `.visible` to a class that no longer exists in CSS), and elements that had `opacity: 0` from `.reveal` will now render at full opacity by default — which is fine; the page just loses its scroll-reveal animation. Task 5 deletes the hook entirely.

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: page loads, all sections visible (no longer fading in on scroll), zero console errors.

- [ ] **Step 1.5: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(landing): drop unused .reveal CSS, add glowDrift keyframe + bg-dark-section util"
```

---

## Task 2: `WhatYouGet` component

The largest of the three new components. Tab strip switches between Organiser and Attendee views; each shows a 3-column grid of 6 feature blocks.

**Files:**
- Create: `apps/web/src/components/landing/WhatYouGet.tsx`

- [ ] **Step 2.1: Create the directory**

```bash
mkdir -p apps/web/src/components/landing
```

- [ ] **Step 2.2: Write the component**

Create `apps/web/src/components/landing/WhatYouGet.tsx` exactly:

```tsx
"use client";

import { useState, type ReactNode, type KeyboardEvent } from "react";

type Role = "organiser" | "attendee";

interface FeatureBlock {
  title: string;
  body: string;
  icon: ReactNode;
}

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

  const handleTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setRole(role === "organiser" ? "attendee" : "organiser");
    }
  };

  return (
    <section className="relative bg-dark-section py-20 lg:py-28 overflow-hidden">
      <div
        className="pointer-events-none absolute -top-20 right-0 h-[300px] w-[300px] rounded-full bg-emerald-500/[0.04] blur-[100px] animate-glow-drift"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">
            What you get
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] text-balance mb-3">
            Built for both sides of the room
          </h2>
          <p className="text-base sm:text-lg text-white/55 leading-relaxed">
            Everything organisers need to run the event, everything attendees need to make it count.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Audience"
          className="hidden sm:flex border-b border-white/[0.08] mt-12 mb-8"
        >
          <button
            role="tab"
            aria-selected={role === "organiser"}
            aria-controls="features-panel"
            tabIndex={role === "organiser" ? 0 : -1}
            onClick={() => setRole("organiser")}
            onKeyDown={handleTabKey}
            className={`px-4 pb-3 text-sm font-semibold transition-colors -mb-px border-b-2 ${
              role === "organiser"
                ? "text-white border-emerald-400"
                : "text-white/40 hover:text-white/70 border-transparent"
            }`}
          >
            For Organisers
          </button>
          <button
            role="tab"
            aria-selected={role === "attendee"}
            aria-controls="features-panel"
            tabIndex={role === "attendee" ? 0 : -1}
            onClick={() => setRole("attendee")}
            onKeyDown={handleTabKey}
            className={`px-4 pb-3 text-sm font-semibold transition-colors -mb-px border-b-2 ${
              role === "attendee"
                ? "text-white border-indigo-400"
                : "text-white/40 hover:text-white/70 border-transparent"
            }`}
          >
            For Attendees
          </button>
        </div>

        <div role="tablist" aria-label="Audience" className="sm:hidden flex gap-2 mt-12 mb-8">
          <button
            role="tab"
            aria-selected={role === "organiser"}
            aria-controls="features-panel"
            onClick={() => setRole("organiser")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              role === "organiser" ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-white/60"
            }`}
          >
            Organisers
          </button>
          <button
            role="tab"
            aria-selected={role === "attendee"}
            aria-controls="features-panel"
            onClick={() => setRole("attendee")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              role === "attendee" ? "bg-indigo-500 text-white" : "bg-white/5 text-white/60"
            }`}
          >
            Attendees
          </button>
        </div>

        <div
          id="features-panel"
          role="tabpanel"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {blocks.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-white/[0.15] hover:bg-white/[0.04] transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 ${
                  accent === "emerald"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}
              >
                {b.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{b.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          {/* TODO: ship full feature matrix in WS 4 or later */}
          <a
            href="/docs/features"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
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

- [ ] **Step 2.3: Temporarily mount the component to verify rendering**

Open `apps/web/src/app/(public)/page.tsx`. This file will be fully rewritten in Task 5; for now we just want a visual smoke test.

Find the `import Hero from "@/components/Hero";` line near the top. After it, add:

```tsx
import { WhatYouGet } from "@/components/landing/WhatYouGet";
```

Inside the JSX `return`, find the `<Hero />` line. **Immediately after `<Hero />`** (and before any other section), add:

```tsx
<WhatYouGet />
```

Leave all the other sections in place — they'll be removed in Task 5.

- [ ] **Step 2.4: Visual + console check**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-task2-default.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: hero followed by the dark `WhatYouGet` section showing the Organiser tab with 6 emerald-accented blocks. No console errors.

Now click the Attendee tab to verify state-switching:

```js
mcp__plugin_playwright_playwright__browser_click({
  element: "For Attendees tab",
  ref: "[role='tab']:nth-of-type(2)"
})
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-task2-attendee.png" })
```

Expected: blocks swap to the 6 attendee items with indigo accents. The tab underline shifts to indigo.

- [ ] **Step 2.5: Mobile check**

```js
mcp__plugin_playwright_playwright__browser_resize({ width: 390, height: 844 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-task2-mobile.png" })
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
```

Expected: mobile shows pill-row tabs (full-width split), single-column block grid below.

- [ ] **Step 2.6: Commit**

```bash
git add apps/web/src/components/landing/WhatYouGet.tsx apps/web/src/app/\(public\)/page.tsx
git commit -m "feat(landing): add WhatYouGet component (tabbed feature wall, 6 blocks per role)"
```

---

## Task 3: `PricingSimple` component

Single centered card with `Free during beta` badge, three-bullet line, divider, and an email-capture stub form with success state.

**Files:**
- Create: `apps/web/src/components/landing/PricingSimple.tsx`

- [ ] **Step 3.1: Write the component**

Create `apps/web/src/components/landing/PricingSimple.tsx` exactly:

```tsx
"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function PricingSimple() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

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
    <section className="relative bg-dark-section py-20 lg:py-28 overflow-hidden">
      <div
        className="pointer-events-none absolute top-1/2 -left-20 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-emerald-500/[0.04] blur-[100px] animate-glow-drift"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] text-balance mb-3">
            Free during beta
          </h2>
          <p className="text-base sm:text-lg text-white/55 leading-relaxed">
            We&apos;ll lock pricing when we exit beta. Drop your email and we&apos;ll let you know — no spam, no auto-charges.
          </p>
        </div>

        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 sm:p-10 backdrop-blur-sm">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Free during beta
            </span>
          </div>

          <p className="text-white text-base text-center">
            Unlimited events <span className="text-white/40">·</span> Unlimited attendees{" "}
            <span className="text-white/40">·</span> All features unlocked
          </p>

          <div className="my-6 border-t border-white/[0.08]" />

          {status === "success" ? (
            <div role="status" className="flex flex-col items-center text-center py-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-white">You&apos;re on the list. We&apos;ll email you once.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="launch-email" className="block text-sm text-white/70 font-medium mb-3">
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
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40 transition-colors"
                  disabled={status === "submitting"}
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "Sending…" : "Notify me"}
                </button>
              </div>
              {status === "error" && (
                <p className="mt-2 text-xs text-rose-400" role="alert">
                  Please enter a valid email address.
                </p>
              )}
              <p className="text-xs text-white/40 mt-3">
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

- [ ] **Step 3.2: Mount temporarily**

Open `apps/web/src/app/(public)/page.tsx`. Add to imports:

```tsx
import { PricingSimple } from "@/components/landing/PricingSimple";
```

Find the line `<WhatYouGet />` (added in Task 2). Immediately after it, add:

```tsx
<PricingSimple />
```

- [ ] **Step 3.3: Visual check + form interaction**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-task3-default.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: dark pricing section appears below WhatYouGet, with the centered emerald-tinted card and an email form. No console errors.

Test the success path:

```js
mcp__plugin_playwright_playwright__browser_fill_form({
  fields: [{ name: "Launch notification email", type: "textbox", ref: "input#launch-email", value: "test@example.com" }]
})
mcp__plugin_playwright_playwright__browser_click({
  element: "Notify me button",
  ref: "button[type='submit']"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-task3-success.png" })
```

Expected: form is replaced by a centered emerald check with `You're on the list. We'll email you once.`

- [ ] **Step 3.4: Test the error path (invalid email)**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => document.getElementById('launch-email').setAttribute('formnovalidate', 'true')"
})
mcp__plugin_playwright_playwright__browser_fill_form({
  fields: [{ name: "Launch notification email", type: "textbox", ref: "input#launch-email", value: "not-an-email" }]
})
mcp__plugin_playwright_playwright__browser_click({
  element: "Notify me button",
  ref: "button[type='submit']"
})
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-task3-error.png" })
```

Expected: rose-coloured "Please enter a valid email address." error appears below the input.

If the browser's native HTML5 validation prevents the form submit (because `required`/`type=email` blocks it), that's actually fine — it means the browser is doing the right thing for keyboard/screen-reader users. The custom error path then only fires for emails that pass HTML5 validation but fail our `.includes('@')` check (rare). Note this in your report and skip the test if HTML5 blocks it.

- [ ] **Step 3.5: Commit**

```bash
git add apps/web/src/components/landing/PricingSimple.tsx apps/web/src/app/\(public\)/page.tsx
git commit -m "feat(landing): add PricingSimple component (free-during-beta + email capture stub)"
```

---

## Task 4: `FinalCTA` component

Restyled CTA — dark monochrome with emerald accent. Drops the purple gradient, animate-blob decorations, and redundant logo image.

**Files:**
- Create: `apps/web/src/components/landing/FinalCTA.tsx`

- [ ] **Step 4.1: Write the component**

Create `apps/web/src/components/landing/FinalCTA.tsx` exactly:

```tsx
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative bg-dark-section py-24 lg:py-32 overflow-hidden">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-4">
          Get started
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] text-balance mb-5">
          Ready to transform your event networking?
        </h2>
        <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-2xl mx-auto">
          Be among the first to use VIMS Events. Set up your first event in under five minutes — completely free during beta.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/organiser/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl px-7 py-3.5 text-base transition-colors"
          >
            Create Your First Event
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </Link>
          <Link
            href="/auth/attendee/login"
            className="inline-flex items-center bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-7 py-3.5 text-base transition-colors"
          >
            Attendee? Join Event
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4.2: Mount temporarily**

Open `apps/web/src/app/(public)/page.tsx`. Add to imports:

```tsx
import { FinalCTA } from "@/components/landing/FinalCTA";
```

Add `<FinalCTA />` immediately after the existing `<PricingSimple />` line.

- [ ] **Step 4.3: Visual check**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-task4.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: scroll to bottom of page — final CTA section appears in the same dark theme, no purple gradient, two emerald + frosted buttons. No console errors.

- [ ] **Step 4.4: Commit**

```bash
git add apps/web/src/components/landing/FinalCTA.tsx apps/web/src/app/\(public\)/page.tsx
git commit -m "feat(landing): add FinalCTA component (dark monochrome with emerald accent)"
```

---

## Task 5: Page orchestrator rewrite

Collapse the 535-line `(public)/page.tsx` into an ~80-line orchestrator that just composes Hero + the three new components. Delete all old section functions and the `useReveal` hook.

**Files:**
- Modify (full rewrite): `apps/web/src/app/(public)/page.tsx`

- [ ] **Step 5.1: Replace `apps/web/src/app/(public)/page.tsx` entirely**

Overwrite the file with:

```tsx
import Hero from "@/components/Hero";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { PricingSimple } from "@/components/landing/PricingSimple";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <Hero />
      <WhatYouGet />
      <PricingSimple />
      <FinalCTA />
    </div>
  );
}
```

That's the entire file. Eight import lines + a ten-line component = under 20 lines total (the 80-line target was conservative — the orchestrator turns out simpler than expected because every section is self-contained).

- [ ] **Step 5.2: Verify nothing else imports the deleted helpers**

```bash
grep -rn "useReveal\|EyebrowTag\|SectionTitle\|SectionDesc\|MissionBar\|HowItWorksSection\|FeaturesSection\|ForAttendeesSection\|ForOrganisersSection\|PricingSection\|CTASection" apps/web/src/ 2>&1 | grep -v "node_modules\|\.next" || echo "no stale references"
```

Expected: `no stale references`. If matches appear elsewhere in the codebase, do NOT delete them — those would be unrelated re-uses; investigate and report.

- [ ] **Step 5.3: TypeScript check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | tail -20
```

Expected: zero new errors. The pre-existing error in `apps/web/src/app/(organiser)/account/page.tsx:138` (carryover from prior workstreams) is acceptable — leave it alone.

- [ ] **Step 5.4: Visual smoke at three viewports**

```js
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 2 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-final-desktop.png", fullPage: true })

mcp__plugin_playwright_playwright__browser_resize({ width: 768, height: 1024 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-final-tablet.png", fullPage: true })

mcp__plugin_playwright_playwright__browser_resize({ width: 390, height: 844 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-final-mobile.png", fullPage: true })
```

Expected:
- **Desktop:** Hero (locked from WS 2) → dark `WhatYouGet` with tabs → dark `PricingSimple` with centered card → dark `FinalCTA`. Continuous dark band, no contrast switching.
- **Tablet:** same sections, 2-column block grid in WhatYouGet, single-column form below.
- **Mobile:** pill-row tabs, single-column blocks, stacked form, stacked CTA buttons.

- [ ] **Step 5.5: Console clean**

```js
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: zero errors.

- [ ] **Step 5.6: Commit**

```bash
git add apps/web/src/app/\(public\)/page.tsx
git commit -m "feat(landing): rewrite page orchestrator to compose Hero + 3 new components"
```

---

## Task 6: Final verification

Six checks against the spec's success criteria. No code changes expected unless something fails.

- [ ] **Step 6.1: Tab keyboard navigation works in `WhatYouGet`**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => {
    const firstTab = document.querySelector('[role="tablist"][aria-label="Audience"] button[role="tab"]');
    firstTab.focus();
    return { focused: document.activeElement?.textContent?.trim(), aria: document.activeElement?.getAttribute('aria-selected') };
  }`
})
mcp__plugin_playwright_playwright__browser_press_key({ key: "ArrowRight" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => ({ activeRole: document.querySelector('[aria-selected=\"true\"]')?.textContent?.trim() })`
})
```

Expected: first call returns `For Organisers` selected. Arrow-right then switches to `For Attendees`.

- [ ] **Step 6.2: Pricing form submits to success state**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: "() => { document.getElementById('launch-email').value = 'verify@vims.com'; document.getElementById('launch-email').dispatchEvent(new Event('input', { bubbles: true })); }"
})
mcp__plugin_playwright_playwright__browser_click({
  element: "Notify me submit",
  ref: "button[type='submit']"
})
mcp__plugin_playwright_playwright__browser_wait_for({ time: 1.5 })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => document.querySelector('[role="status"]')?.textContent`
})
```

Expected: returns `You're on the list. We'll email you once.`

- [ ] **Step 6.3: No console errors at full-page render**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 2 })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: zero errors.

- [ ] **Step 6.4: No stale `.reveal` or deleted-helper references in source**

```bash
grep -rn "\.reveal\|useReveal\|EyebrowTag\|SectionTitle\|SectionDesc\|MissionBar\|HowItWorksSection\|FeaturesSection\|ForAttendeesSection\|ForOrganisersSection\|PricingSection\|CTASection" apps/web/src/ 2>&1 | grep -v "node_modules\|\.next" || echo "no stale references"
```

Expected: `no stale references`.

- [ ] **Step 6.5: CLS check (zero layout shift goal from spec)**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_evaluate({
  function: `() => new Promise((resolve) => {
    let cls = 0;
    const obs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
    });
    obs.observe({ type: 'layout-shift', buffered: true });
    setTimeout(() => resolve({ cls: Number(cls.toFixed(4)) }), 3000);
  })`
})
```

Expected: `cls` ≤ 0.05 (target 0; minor shifts acceptable from dev-mode webfont swaps).

- [ ] **Step 6.6: Page-load smoke (5 samples)**

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://localhost:3000
done
```

Expected: each row `200`, time under 2 seconds.

- [ ] **Step 6.7: Final desktop screenshot for the record**

```js
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 2 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "landing-redesign-final.png", fullPage: true })
```

- [ ] **Step 6.8: Optional fix commit**

If any verification surfaced a regression and you applied a fix, commit it:

```bash
git add -A
git commit -m "fix(landing): <one-line description>"
```

If everything passed, no extra commit needed.

---

## Self-Review

**Spec coverage:**
- ✅ CSS cleanup (`.reveal*` removal + glowDrift + bg-dark-section) → Task 1
- ✅ `WhatYouGet` with tab strip, mobile pill row, 6 organiser + 6 attendee blocks, role-coloured accent, ARIA tablist + keyboard nav, footer link to `/docs/features` → Task 2
- ✅ `PricingSimple` with eyebrow + headline + subhead, single emerald-tinted card, free-during-beta badge, bullet line, divider, email-capture form with submit/success/error states, helper text → Task 3
- ✅ `FinalCTA` with eyebrow + headline + subhead, 2 buttons (emerald primary + frosted secondary), no logo image, no animate-blob decorations → Task 4
- ✅ Page orchestrator rewrite from 535 LOC down to ~13 LOC actual (target was 80; came in well under) → Task 5
- ✅ Visual smoke at desktop / tablet / mobile → Task 5 (Steps 5.4) + Task 6
- ✅ Tab keyboard navigation → Task 6 (Step 6.1)
- ✅ Form interaction (success + error) → Task 3 (Steps 3.3, 3.4) + Task 6 (Step 6.2)
- ✅ CLS ≤ 0.05 → Task 6 (Step 6.5)
- ✅ Console clean → Tasks 2, 3, 4, 5 each verify; Task 6 (Step 6.3) confirms final
- ✅ No stale references → Task 5 (Step 5.2) + Task 6 (Step 6.4)

**Placeholder scan:** no TBD/TODO without a concrete plan. The two `// TODO` comments inside the components (`launch-notify` endpoint, full feature matrix) are explicit deferrals to future workstreams — documented in the spec's "Out-of-scope follow-ups" section, intentional, not plan failures.

**Type/name consistency:** component names (`WhatYouGet`, `PricingSimple`, `FinalCTA`) match across plan + spec + the page orchestrator. CSS utility names (`bg-dark-section`, `animate-glow-drift`) defined in Task 1 and used in Tasks 2-4 spell-correctly. The `Role` type in `WhatYouGet` is private to that component — no cross-task type sharing needed.

Plan is ready for execution.
