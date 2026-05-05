# Landing Hero / Nav / How-It-Works Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a sticky landing-page nav, restyle the hero's headline gradient to emerald, add a "Free during beta" badge in the hero, add a new "How It Works" section, wire all in-page anchors to working section IDs, and speed up the Features card cycle to 2 seconds.

**Architecture:** One new sticky `LandingNavBar` component (with a private helper hook `useNavSurface` that observes the hero element via `IntersectionObserver` to switch between transparent and solid). One new `HowItWorks` light section composed of two role columns. Targeted edits to `Hero.tsx` (gradient + badge + `data-landing-hero` attribute), `WhatYouGet.tsx` (id + scroll-mt + 2-second interval), and `PricingSimple.tsx` (id + scroll-mt). Composition update in `(public)/page.tsx`.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, no component test framework. Verification = `npm run type-check` + manual browser walkthrough.

**Spec:** [docs/superpowers/specs/2026-05-04-landing-hero-howitworks-design.md](../specs/2026-05-04-landing-hero-howitworks-design.md)

---

## Notes Before Starting

- **No tests.** The repo has no Jest/Vitest. Each task uses: `npm run type-check --workspace=apps/web` + manual check after the dev server runs.
- **Lint config missing.** Pre-existing — do **not** run `npm run lint`.
- **Working directory:** `c:\Users\jillj\OneDrive\Desktop\VIMS-EVENT`. Branch: `master` (user-approved, continuing the previous round's pattern).
- **No edits to:** `globals.css`, `tailwind.config.ts`, `FinalCTA.tsx`, `hero/HeroBackground.tsx`, `hero/HeroPhonePreview.tsx`, hooks (`use-auto-spotlight.ts`, `use-scroll-reveal.ts`), or anything outside `apps/web/src/components/landing/` and the two specific in-scope files in `apps/web/src/components/Hero.tsx` and `apps/web/src/app/(public)/page.tsx`.

---

## File Structure

| File                                                     | Status   | Responsibility                                                          |
| -------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `apps/web/src/components/landing/LandingNavBar.tsx`      | Create   | Sticky transparent→solid nav with mobile drawer; private `useNavSurface` |
| `apps/web/src/components/landing/HowItWorks.tsx`         | Create   | Two-column "For Organisers / For Attendees" 3-step section              |
| `apps/web/src/components/Hero.tsx`                       | Modify   | Add `data-landing-hero`, change "Measurable Connection" gradient + SVG, add "Free during beta" badge |
| `apps/web/src/components/landing/WhatYouGet.tsx`         | Modify   | Add `id="features" scroll-mt-20`; `SPOTLIGHT_INTERVAL_MS` → 2000        |
| `apps/web/src/components/landing/PricingSimple.tsx`      | Modify   | Add `id="pricing" scroll-mt-20`                                         |
| `apps/web/src/app/(public)/page.tsx`                     | Modify   | Mount `<LandingNavBar />` and `<HowItWorks />` in correct order         |

---

## Task 1: Create `LandingNavBar` component (and mount it)

**Files:**
- Create: `apps/web/src/components/landing/LandingNavBar.tsx`
- Modify: `apps/web/src/app/(public)/page.tsx`

- [ ] **Step 1: Create the navbar file**

Write `apps/web/src/components/landing/LandingNavBar.tsx` with EXACTLY this content:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type NavSurface = "transparent" | "solid";

const NAV_LINKS: ReadonlyArray<{ label: string; href: string }> = [
  { label: "How It Works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
];

function useNavSurface(): NavSurface {
  const [surface, setSurface] = useState<NavSurface>("transparent");

  useEffect(() => {
    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") return;
    const hero = document.querySelector<HTMLElement>("[data-landing-hero]");
    if (!hero) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        setSurface(entry.intersectionRatio < 0.1 ? "solid" : "transparent");
      },
      { threshold: [0, 0.1, 1], rootMargin: "-64px 0px 0px 0px" },
    );
    observer.observe(hero);
    return () => observer.disconnect();
  }, []);

  return surface;
}

export function LandingNavBar() {
  const surface = useNavSurface();
  const [menuOpen, setMenuOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        hamburgerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isSolid = surface === "solid";

  const wrapperClass = isSolid
    ? "bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm"
    : "bg-transparent border-b border-transparent";

  const brandClass = isSolid ? "text-slate-900" : "text-white";
  const linkClass = isSolid
    ? "text-slate-700 hover:text-slate-900"
    : "text-white/80 hover:text-white";
  const ghostClass = isSolid
    ? "text-slate-700 hover:bg-slate-100"
    : "text-white hover:bg-white/10";
  const focusRingClass = isSolid
    ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
    : "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent";

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav
      aria-label="Primary"
      className={`sticky top-0 z-50 w-full transition-colors duration-200 motion-reduce:transition-none ${wrapperClass}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        <Link
          href="/"
          className={`text-lg font-bold tracking-tight transition-colors ${brandClass} ${focusRingClass} rounded`}
        >
          VIMS
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition-colors ${linkClass} ${focusRingClass} rounded px-1 py-0.5`}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/auth/organiser/login"
            className={`text-sm font-semibold rounded-lg px-3 py-1.5 transition-colors ${ghostClass} ${focusRingClass}`}
          >
            Sign in
          </Link>
          <Link
            href="/auth/organiser/signup"
            className={`bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg px-4 py-2 text-sm transition-colors ${focusRingClass}`}
          >
            Start for Free
          </Link>
        </div>

        <button
          ref={hamburgerRef}
          type="button"
          aria-expanded={menuOpen}
          aria-controls="landing-nav-mobile"
          onClick={() => setMenuOpen((o) => !o)}
          className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg transition-colors ${ghostClass} ${focusRingClass}`}
        >
          <span className="sr-only">{menuOpen ? "Close menu" : "Open menu"}</span>
          {menuOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {menuOpen && (
        <div
          id="landing-nav-mobile"
          className="md:hidden border-t border-slate-200 bg-white shadow-lg"
        >
          <div className="px-4 py-4 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMenu}
                className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                {link.label}
              </a>
            ))}
            <div className="my-2 border-t border-slate-200" />
            <Link
              href="/auth/organiser/login"
              onClick={closeMenu}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Sign in
            </Link>
            <Link
              href="/auth/organiser/signup"
              onClick={closeMenu}
              className="rounded-lg px-3 py-2.5 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Start for Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
```

- [ ] **Step 2: Mount the navbar in the landing page**

Modify `apps/web/src/app/(public)/page.tsx` so it imports and renders `<LandingNavBar />` as the first child of the wrapper `<div>`. Final file content:

```tsx
import Hero from "@/components/Hero";
import { LandingNavBar } from "@/components/landing/LandingNavBar";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { PricingSimple } from "@/components/landing/PricingSimple";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <LandingNavBar />
      <Hero />
      <WhatYouGet />
      <PricingSimple />
      <FinalCTA />
    </div>
  );
}
```

(Note: `<HowItWorks />` is NOT yet mounted — it doesn't exist yet. It will be inserted between `<Hero />` and `<WhatYouGet />` in Task 3.)

- [ ] **Step 3: Verify type-check**

```bash
npm run type-check --workspace=apps/web
```

Expected: passes with no NEW errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/landing/LandingNavBar.tsx apps/web/src/app/\(public\)/page.tsx
git commit -m "feat(web): add sticky LandingNavBar with transparent->solid hero observer"
```

---

## Task 2: Update `Hero.tsx` — gradient, badge, `data-landing-hero`

**Files:**
- Modify: `apps/web/src/components/Hero.tsx` (full rewrite)

The hero file is rewritten so that subagents don't have to perform fragmented edits. The diff vs. master is small: a `data-landing-hero` attribute on the section, an updated `bg-gradient-to-r` palette on the "Measurable Connection" span, three updated `<stop>` colors inside the SVG `linearGradient`, and a new "Free during beta" anchor pill between the body paragraph and the CTA row.

- [ ] **Step 1: Replace `Hero.tsx` contents**

Overwrite `apps/web/src/components/Hero.tsx` with EXACTLY this content:

```tsx
"use client";

import Link from "next/link";
import { HeroBackground } from "./hero/HeroBackground";
import { HeroPhonePreview } from "./hero/HeroPhonePreview";

export default function Hero() {
  return (
    <section
      data-landing-hero
      className="relative min-h-[640px] lg:min-h-[680px] flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950"
    >
      <HeroBackground />

      <div className="relative mx-auto max-w-7xl w-full px-4 py-20 sm:px-6 sm:py-24 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-12 items-center">
          <div className="text-center lg:text-left max-w-2xl mx-auto lg:mx-0">
            <div
              className="animate-in inline-flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-300 backdrop-blur-sm mb-8 shadow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              Beta Launch &middot; Completely Free to Start
            </div>

            <h1
              className="animate-in text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl xl:text-7xl leading-[1.06] tracking-tight text-balance"
              style={{ animationDelay: "80ms" }}
            >
              Turn Every Handshake Into a{" "}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent animate-gradient">
                  Measurable Connection
                </span>
                <svg
                  className="absolute -bottom-3 left-0 w-full overflow-visible"
                  viewBox="0 0 400 12"
                  preserveAspectRatio="none"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    className="animate-draw"
                    d="M4 8 Q80 2 160 6 Q240 10 320 4 Q360 2 396 6"
                    stroke="url(#heroUL)"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="heroUL" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#34d399" />
                      <stop offset="0.5" stopColor="#5eead4" />
                      <stop offset="1" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
              </span>
            </h1>

            <p
              className="animate-in mt-9 text-lg text-white/65 leading-relaxed max-w-xl mx-auto lg:mx-0 sm:text-xl"
              style={{ animationDelay: "160ms" }}
            >
              The only event networking platform built for ROI. Track engagement,
              capture leads, and deliver quantifiable value to sponsors.
            </p>

            <a
              href="#pricing"
              className="animate-in mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-4 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/50 transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              style={{ animationDelay: "200ms" }}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Free during beta
              <span className="text-emerald-200/70">· See pricing</span>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </a>

            <div
              className="animate-in mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/auth/organiser/signup"
                className="btn-primary px-8 py-3.5 text-base shadow-xl shadow-primary/30"
              >
                Start for Free
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </Link>
              <a href="#how-it-works" className="btn-ghost px-8 py-3.5 text-base">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                See How It Works
              </a>
            </div>
          </div>

          <div
            className="relative animate-in flex flex-col items-center lg:items-end gap-4"
            style={{ animationDelay: "400ms" }}
          >
            <HeroPhonePreview />
            <div className="hidden lg:inline-flex items-center gap-2 rounded-full bg-white/[0.08] backdrop-blur-sm border border-white/10 px-4 py-1.5 text-xs text-white/80">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              <span aria-label="1,284 attendees networking now">
                <strong className="font-semibold">1,284</strong> attendees networking now
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

What changed from the previous file:
- Section opening tag now spans multiple lines and includes `data-landing-hero`.
- "Measurable Connection" span: gradient classes were `from-indigo-300 via-violet-300 to-blue-300` → `from-emerald-400 via-teal-300 to-emerald-500`.
- SVG `linearGradient`: stops were `#818cf8 / #c4b5fd / #93c5fd` → `#34d399 / #5eead4 / #10b981`.
- Added a new "Free during beta · See pricing" anchor pill between the `<p>` and the CTA row, with `mt-8` on the pill and `mt-6` (was `mt-10`) on the CTA row so total spacing balances.
- The CTA row's "See How It Works" `<a href="#how-it-works">` is unchanged (kept the existing anchor).

- [ ] **Step 2: Verify type-check**

```bash
npm run type-check --workspace=apps/web
```

Expected: passes.

- [ ] **Step 3: Verify hero subcomponents are untouched**

```bash
git diff -- apps/web/src/components/hero/
```

Expected: no output. (The hero subdirectory is out of scope; only `Hero.tsx` itself changes in this round.)

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/Hero.tsx
git commit -m "feat(web): hero - emerald gradient, free-during-beta badge, data-landing-hero"
```

---

## Task 3: Create `HowItWorks` section (and mount it)

**Files:**
- Create: `apps/web/src/components/landing/HowItWorks.tsx`
- Modify: `apps/web/src/app/(public)/page.tsx`

- [ ] **Step 1: Create the component file**

Write `apps/web/src/components/landing/HowItWorks.tsx` with EXACTLY this content:

```tsx
"use client";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";

type Track = "organiser" | "attendee";

interface Step {
  title: string;
  body: string;
}

interface TrackColumn {
  track: Track;
  label: string;
  steps: readonly [Step, Step, Step];
}

const COLUMNS: ReadonlyArray<TrackColumn> = [
  {
    track: "organiser",
    label: "For Organisers",
    steps: [
      {
        title: "Set up in 5 minutes",
        body: "A guided wizard handles branding, registration fields, and networking rules. No drafts to revisit.",
      },
      {
        title: "Share the event link",
        body: "Attendees join with one tap from any phone browser. No app downloads.",
      },
      {
        title: "Track ROI in real time",
        body: "Live analytics, top connectors, drop-off, exportable Excel.",
      },
    ],
  },
  {
    track: "attendee",
    label: "For Attendees",
    steps: [
      {
        title: "Open the event link",
        body: "Works in any mobile browser. No app, no friction.",
      },
      {
        title: "One-scan QR exchange",
        body: "Connect with anyone in two seconds; their vCard lands in your phone.",
      },
      {
        title: "Walk out with a clean address book",
        body: "Every connection saved, exportable to CSV/vCard.",
      },
    ],
  },
];

const ORGANISER_BADGE_CLASS = "bg-emerald-100 text-emerald-700 border-emerald-200";
const ATTENDEE_BADGE_CLASS = "bg-indigo-100 text-indigo-700 border-indigo-200";

const ORGANISER_LABEL_CLASS = "bg-emerald-50 text-emerald-700 border-emerald-200";
const ATTENDEE_LABEL_CLASS = "bg-indigo-50 text-indigo-700 border-indigo-200";

export function HowItWorks() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="how-it-works"
      className="relative bg-white py-24 lg:py-32 scroll-mt-20 overflow-hidden"
    >
      <div
        ref={ref}
        className={`relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out motion-reduce:transition-none ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="max-w-2xl mb-14">
          <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 mb-3">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance mb-3">
            From setup to follow-up in three steps
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Whether you run the event or attend it, the path is short and the wins are measurable.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {COLUMNS.map((col) => {
            const badgeClass =
              col.track === "organiser" ? ORGANISER_BADGE_CLASS : ATTENDEE_BADGE_CLASS;
            const labelClass =
              col.track === "organiser" ? ORGANISER_LABEL_CLASS : ATTENDEE_LABEL_CLASS;
            return (
              <div key={col.track} className="relative">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] mb-6 ${labelClass}`}
                >
                  {col.label}
                </span>

                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute left-5 top-10 bottom-10 w-px bg-slate-200"
                  />

                  <ol className="flex flex-col gap-8">
                    {col.steps.map((step, idx) => (
                      <li key={step.title} className="relative flex items-start gap-4">
                        <div
                          className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold ${badgeClass}`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div className="flex-1 pt-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                            {step.title}
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {step.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount the component in the landing page**

Modify `apps/web/src/app/(public)/page.tsx` so it imports `<HowItWorks />` and renders it between `<Hero />` and `<WhatYouGet />`. Final file content:

```tsx
import Hero from "@/components/Hero";
import { LandingNavBar } from "@/components/landing/LandingNavBar";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { WhatYouGet } from "@/components/landing/WhatYouGet";
import { PricingSimple } from "@/components/landing/PricingSimple";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <LandingNavBar />
      <Hero />
      <HowItWorks />
      <WhatYouGet />
      <PricingSimple />
      <FinalCTA />
    </div>
  );
}
```

- [ ] **Step 3: Verify type-check**

```bash
npm run type-check --workspace=apps/web
```

Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/landing/HowItWorks.tsx apps/web/src/app/\(public\)/page.tsx
git commit -m "feat(web): add HowItWorks two-column landing section"
```

---

## Task 4: Anchor IDs + faster spotlight (WhatYouGet & PricingSimple edits)

**Files:**
- Modify: `apps/web/src/components/landing/WhatYouGet.tsx`
- Modify: `apps/web/src/components/landing/PricingSimple.tsx`

Three small edits. Use the Edit tool for each so the rest of these files stays untouched.

- [ ] **Step 1: Update `SPOTLIGHT_INTERVAL_MS` in WhatYouGet**

In `apps/web/src/components/landing/WhatYouGet.tsx`:

OLD STRING:
```
const SPOTLIGHT_INTERVAL_MS = 2500;
```

NEW STRING:
```
const SPOTLIGHT_INTERVAL_MS = 2000;
```

- [ ] **Step 2: Add anchor id and `scroll-mt-20` to the WhatYouGet section**

In `apps/web/src/components/landing/WhatYouGet.tsx`:

OLD STRING:
```
    <section className="relative bg-white py-24 lg:py-32 overflow-hidden">
```

NEW STRING:
```
    <section id="features" className="relative bg-white py-24 lg:py-32 scroll-mt-20 overflow-hidden">
```

- [ ] **Step 3: Add anchor id and `scroll-mt-20` to the PricingSimple section**

In `apps/web/src/components/landing/PricingSimple.tsx`:

OLD STRING:
```
    <section className="relative bg-gray-50 py-24 lg:py-32 overflow-hidden">
```

NEW STRING:
```
    <section id="pricing" className="relative bg-gray-50 py-24 lg:py-32 scroll-mt-20 overflow-hidden">
```

- [ ] **Step 4: Verify type-check**

```bash
npm run type-check --workspace=apps/web
```

Expected: passes.

- [ ] **Step 5: Verify only the two intended files changed**

```bash
git status --short
```

Expected: only `apps/web/src/components/landing/WhatYouGet.tsx` and `apps/web/src/components/landing/PricingSimple.tsx` are listed as modified.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/landing/WhatYouGet.tsx apps/web/src/components/landing/PricingSimple.tsx
git commit -m "feat(web): anchor ids on features/pricing, 2s spotlight cycle"
```

---

## Task 5: Final QA across the page

**Files:** none modified — verification only.

- [ ] **Step 1: Type-check**

```bash
npm run type-check --workspace=apps/web
```

Expected: passes with zero errors.

- [ ] **Step 2: Verify hero subcomponents and globals are untouched**

```bash
git diff f6bcec0 HEAD -- apps/web/src/components/hero/ apps/web/src/app/globals.css apps/web/tailwind.config.ts
```

Expected: no output. (`f6bcec0` is the spec commit, before any code changes for this round.)

- [ ] **Step 3: Confirm composition**

Read `apps/web/src/app/(public)/page.tsx` and confirm the children render order is exactly:

```
LandingNavBar → Hero → HowItWorks → WhatYouGet → PricingSimple → FinalCTA
```

- [ ] **Step 4: Manual browser walkthrough**

Run `npm run dev --workspace=apps/web`, open `http://localhost:3000`. Walk through:

1. **Hero** — gradient on "Measurable Connection" is now emerald/teal/emerald, NOT pastel indigo. The hand-drawn underline matches.
2. **Free during beta badge** — visible below the body paragraph, above the CTA row. Click it → page smooth-scrolls to Pricing, the heading is not hidden by the nav.
3. **Sticky nav (transparent state)** — Over the hero, the nav bar is transparent, white text. "VIMS · How It Works · Features · Pricing · Sign in · Start for Free".
4. **Sticky nav (solid state)** — Scroll down past the hero. The nav transitions to white (with backdrop blur and a thin slate border) and the text turns slate-900.
5. **Nav links** — Click each of `How It Works`, `Features`, `Pricing` from the nav bar. Each scrolls smoothly to the right section, with no heading hidden by the nav.
6. **HowItWorks** — Two columns on desktop: For Organisers (emerald) on the left, For Attendees (indigo) on the right. Three numbered steps each. Vertical guide line behind the numbers. On mobile, columns stack.
7. **WhatYouGet (Features)** — Cards now cycle every 2 seconds (was 2.5). Hover/focus pause, off-screen pause, organiser/attendee tabs all still work.
8. **PricingSimple (Pricing)** — Section reachable via `#pricing` anchor. Form submission still mocked.
9. **FinalCTA** — Unchanged.
10. **Mobile nav** — Resize to ~375px. Hamburger appears in place of the inline nav. Tap it → drawer slides down with all links and CTAs. Press `Esc` → drawer closes, focus returns to hamburger.
11. **Console** — No errors or warnings.

If you don't have access to a browser, ask the user to verify before claiming done.

- [ ] **Step 5: Commit only if QA produced changes**

If anything had to be tweaked during QA, commit the polish:

```bash
git add -p
git commit -m "polish(web): minor adjustments after round-2 landing QA"
```

If nothing needed changing, skip this step.

---

## Self-Review Checklist (already performed by the planner)

**Spec coverage:**

| Spec section                                    | Implemented in    |
| ----------------------------------------------- | ----------------- |
| § 2 Page structure (anchor IDs)                 | Tasks 1, 3, 4     |
| § 3 LandingNavBar (sticky, transparent→solid)   | Task 1            |
| § 3.4 Mobile drawer + Esc close                 | Task 1            |
| § 4.1 Headline gradient (emerald/teal/emerald)  | Task 2            |
| § 4.2 "Free during beta" badge                  | Task 2            |
| § 4.4 `data-landing-hero` attribute             | Task 2            |
| § 5 HowItWorks section + content                | Task 3            |
| § 6 Anchor ids on WhatYouGet & PricingSimple    | Task 4            |
| § 7 Cycle interval 2500 → 2000                  | Task 4            |
| § 8 Files touched (no out-of-scope)             | Tasks 1–4         |
| § 9 Acceptance criteria                         | Task 5 walkthrough |

**Type consistency:**

- `LandingNavBar`: named export, no props.
- `useNavSurface`: returns `"transparent" | "solid"`. Used only inside `LandingNavBar`.
- `HowItWorks`: named export, no props.
- `useScrollReveal<HTMLDivElement>()` is used identically in `HowItWorks` and the existing three light sections — same destructuring `{ ref, revealed }`, same default options.
- The `SPOTLIGHT_INTERVAL_MS` constant in `WhatYouGet.tsx` is the only call site of the value; changing it from 2500 → 2000 has no other ripple.

**Placeholder scan:** No "TBD" / "implement later" / vague handlers. Every step has either complete code or an exact command. The pre-existing TODOs in `WhatYouGet.tsx` and `PricingSimple.tsx` (feature-matrix and launch-notify) are intentionally untouched.

**No backend changes:** Nothing in this plan touches `apps/api`, Prisma schema, or any database migration. The launch-notify form remains mocked, which matches the user's "Keep it mocked" decision in brainstorming.
