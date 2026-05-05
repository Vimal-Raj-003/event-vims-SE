# Landing Page — Hero, Nav, "How It Works" — Design Spec

**Date:** 2026-05-04
**Round:** 2 (follows the light-mode redesign already merged on `master`)
**Goal:** Add a sticky top nav, restyle the hero's headline gradient, add a "Free during beta" badge in the hero, add a new "How It Works" section, wire all in-page anchor links to working section IDs, and speed up the Features card cycle to every 2 seconds.

---

## 1. Constraints

- The hero (`apps/web/src/components/Hero.tsx`, `apps/web/src/components/hero/*`) **may now be modified** for this round (the previous "do not touch hero" constraint was scoped to the light-mode redesign; this round explicitly updates the hero).
- The light-theme system established for the below-hero sections is **preserved as-is**.
- No backend/API changes. The launch-notify form stays mocked (out of scope this round).
- No Tailwind config or `globals.css` token additions. All work uses existing utilities.
- Brand cohesion: emerald accent system stays primary; indigo stays the attendee accent.

---

## 2. Page structure (after this round)

```
<LandingNavBar>            ← sticky, transparent over hero, solid over light sections
[Hero]                     ← updated (gradient + badge + nav-aware spacing)
[HowItWorks]   id="how-it-works"   ← new section
[WhatYouGet]   id="features"        ← anchor id added; otherwise unchanged
[PricingSimple] id="pricing"        ← anchor id added; otherwise unchanged
[FinalCTA]                          ← unchanged
```

All anchored sections receive `scroll-mt-20` (Tailwind utility) so the 64-px sticky nav never covers the heading when scrolled to via anchor.

In-page anchors:
- Hero "See How It Works" button → `#how-it-works`
- Hero "Free during beta" badge → `#pricing`
- Nav `How It Works` → `#how-it-works`
- Nav `Features` → `#features`
- Nav `Pricing` → `#pricing`

`scroll-behavior: smooth` is already global (in `globals.css`).

---

## 3. New component — `LandingNavBar`

**File:** `apps/web/src/components/landing/LandingNavBar.tsx`

### 3.1 Layout

- Position: `sticky top-0 z-50 w-full`.
- Height: `h-16` (64 px).
- Inner container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6`.
- **Left:** brand wordmark "VIMS" (font-bold, tracking-tight). On the hero (transparent state) it renders `text-white`; over light sections, `text-slate-900`.
- **Center (desktop, `md:flex` only):** three anchor links — `How It Works · Features · Pricing` — each `text-sm font-semibold`, with the same dark/light dual coloring.
- **Right:** `Sign in` (ghost link to `/auth/organiser/login`) + `Start for Free` (emerald solid button to `/auth/organiser/signup`).
- **Mobile (`md:hidden`):** hamburger button on the right that opens a slide-down panel containing the three links and the two CTAs vertically. Clicking any item closes the panel.

### 3.2 Transparent → solid transition

A small private helper hook `useNavSurface()` is defined at the top of the same `LandingNavBar.tsx` module (not a separate file). Inside the `LandingNavBar` component, it owns:

- A `<div ref={sentinelRef} aria-hidden className="absolute top-[80vh] h-px w-full pointer-events-none" />` sentinel rendered as the **first child of the navbar** with `position: relative` on the navbar's outer wrapper. Because the sentinel is positioned `top-[80vh]` relative to the page (using a fixed viewport-height offset), it sits roughly 80% down the hero. When the user scrolls past it, `entry.isIntersecting` flips to `false`.
- An `IntersectionObserver` watching the sentinel with `threshold: 0` and `rootMargin: "-64px 0px 0px 0px"` (subtracting the nav height so the trigger feels right). When the sentinel is **not** intersecting (i.e., user has scrolled past), `useNavSurface` returns `surface: "solid"`. Otherwise `surface: "transparent"`.
- SSR fallback: initial state is `"transparent"`. The hook never reads `window` outside an effect.

- **Transparent state** (hero in view): `bg-transparent`, no border, no shadow. Text classes use `text-white` / `text-white/70`. Buttons keep their normal emerald style; the ghost button uses `text-white hover:bg-white/10`.
- **Solid state** (hero out of view): `bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm`. Text classes use `text-slate-900` / `text-slate-600`. Ghost button uses `text-slate-700 hover:bg-slate-100`.
- Transition: `transition-colors duration-200`. Add `motion-reduce:transition-none`.
- Z-index above the hero (`z-50`).

### 3.3 Hero ↔ nav coordination

- The hero must reserve top space for the nav. Currently the hero uses `min-h-[640px] lg:min-h-[680px]` with `py-20 sm:py-24 lg:py-28`. Reduce the top padding by 16 px (one nav-height worth) on mobile and tighten the top spacing so the nav doesn't visually overlap the headline. Concretely: keep the section's `min-h` and outer padding the same; the nav sits in its own 64-px slot above and the hero's content distributes correctly because the nav is `sticky` (not `fixed`), so it consumes layout space.

### 3.4 Accessibility

- `<nav aria-label="Primary">`.
- Hamburger button: `aria-expanded` toggles, `aria-controls` references the panel id.
- Mobile panel: closed by `Esc`, traps focus while open is **not required** (the panel contains five links/buttons; standard sequential focus is fine), but focus must return to the hamburger on close.
- Focus rings: emerald-500 on light, white on dark. Use `focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2` in solid state and `focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent` in transparent state.

### 3.5 Composition

`apps/web/src/app/(public)/page.tsx` adds `<LandingNavBar />` as the first child of the wrapping div, before `<Hero />`.

---

## 4. Hero modifications (`Hero.tsx`)

### 4.1 Headline gradient

**Current:** `bg-gradient-to-r from-indigo-300 via-violet-300 to-blue-300`.

**Replace with:** `bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500`.

The hand-drawn underline SVG (`#heroUL` linearGradient, currently `#818cf8 → #c4b5fd → #93c5fd`) updates to:
- stop 0: `#34d399` (emerald-400)
- stop 0.5: `#5eead4` (teal-300)
- stop 1: `#10b981` (emerald-500)

### 4.2 "Free during beta" badge

A new clickable pill, placed **below the existing body paragraph and above the CTA buttons** (not above the headline — that area is already occupied by the "Beta Launch" status pill).

```
<a
  href="#pricing"
  class="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/30 px-4 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/25 hover:border-emerald-400/50 transition-colors backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
>
  <svg ...lightning-bolt icon /> Free during beta
  <span class="text-emerald-200/70">· See pricing</span>
  <svg ...arrow-right icon />
</a>
```

The badge is positioned in the existing CTA cluster, just **before** the CTA row, with `mt-8 mb-2` spacing. It's an `<a>` not a `<button>` so semantics are correct ("scroll to pricing"). On click, the global `scroll-behavior: smooth` handles the scroll; `scroll-mt-20` on the pricing section ensures the heading isn't hidden by the nav.

### 4.3 CTA anchor

The "See How It Works" `<a href="#how-it-works">` already exists in the hero. The HowItWorks section will provide that anchor — no change to the hero CTA itself.

### 4.4 Out of scope

The "Beta Launch · Completely Free to Start" status pill above the headline stays untouched. The phone preview, "1,284 attendees networking now" mini-badge, and animated background components stay untouched.

---

## 5. New section — `HowItWorks`

**File:** `apps/web/src/components/landing/HowItWorks.tsx`

### 5.1 Layout

- Section: `bg-white py-24 lg:py-32 scroll-mt-20`, `id="how-it-works"`.
- Heading block (centered or left-aligned to match `WhatYouGet`): eyebrow pill "How it works" (`bg-emerald-50 border-emerald-200 text-emerald-700`), `<h2>` "From setup to follow-up in three steps", subhead "Whether you run the event or attend it, the path is short and the wins are measurable."
- Two-column grid on desktop (`lg:grid-cols-2 gap-12`), single column on mobile/tablet, max width `max-w-6xl mx-auto`.

### 5.2 Step content

**Left column — "For Organisers"** (emerald accent):

| # | Title | Body |
| - | - | - |
| 01 | Set up in 5 minutes | A guided wizard handles branding, registration fields, and networking rules. No drafts to revisit. |
| 02 | Share the event link | Attendees join with one tap from any phone browser. No app downloads. |
| 03 | Track ROI in real time | Live analytics, top connectors, drop-off, exportable Excel. |

**Right column — "For Attendees"** (indigo accent):

| # | Title | Body |
| - | - | - |
| 01 | Open the event link | Works in any mobile browser. No app, no friction. |
| 02 | One-scan QR exchange | Connect with anyone in two seconds; their vCard lands in your phone. |
| 03 | Walk out with a clean address book | Every connection saved, exportable to CSV/vCard. |

### 5.3 Step visuals

Each step renders a row with:

- A circular badge containing the step number `01` / `02` / `03`. Active accent fill: `bg-emerald-100 text-emerald-700 border-emerald-200` for organiser, `bg-indigo-100 text-indigo-700 border-indigo-200` for attendee. Size `w-10 h-10`, `text-sm font-bold`, full literal Tailwind class strings (do not template-concatenate).
- A title (`text-lg font-semibold text-slate-900`) and body (`text-sm text-slate-600 leading-relaxed`).
- Steps within a column are stacked vertically with `gap-8`. A subtle vertical guide line behind the numbers (a 1px `bg-slate-200` line absolute-positioned, height = column inner height) creates the "process flow" feel. Render this line only when there are at least 2 visible steps and hide it via `aria-hidden`.

### 5.4 Reveal

Wrap the heading + grid in a single container that uses `useScrollReveal<HTMLDivElement>()`. Apply the same fade-up class pattern used by `WhatYouGet`/`PricingSimple`/`FinalCTA`, including `motion-reduce:transition-none`.

### 5.5 Composition

Insert `<HowItWorks />` into `apps/web/src/app/(public)/page.tsx` between `<Hero />` and `<WhatYouGet />`.

---

## 6. Anchor IDs added to existing sections

These two single-line edits are the only changes to existing light sections:

- `WhatYouGet.tsx` — outer `<section>` gets `id="features" scroll-mt-20`.
- `PricingSimple.tsx` — outer `<section>` gets `id="pricing" scroll-mt-20`.

`FinalCTA` does not need an id.

---

## 7. Card cycle interval

In `WhatYouGet.tsx`, change `SPOTLIGHT_INTERVAL_MS = 2500` → `SPOTLIGHT_INTERVAL_MS = 2000`. No other changes to the spotlight system.

---

## 8. Files touched

| File                                                       | Status   | Change                                                              |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------- |
| `apps/web/src/components/landing/LandingNavBar.tsx`        | Create   | Sticky transparent→solid nav with mobile drawer                     |
| `apps/web/src/components/landing/HowItWorks.tsx`           | Create   | New "How It Works" two-column section                               |
| `apps/web/src/components/Hero.tsx`                         | Modify   | Headline gradient (emerald) + "Free during beta" badge + SVG colors |
| `apps/web/src/components/landing/WhatYouGet.tsx`           | Modify   | Add `id="features" scroll-mt-20`; change `SPOTLIGHT_INTERVAL_MS` to 2000 |
| `apps/web/src/components/landing/PricingSimple.tsx`        | Modify   | Add `id="pricing" scroll-mt-20`                                     |
| `apps/web/src/app/(public)/page.tsx`                       | Modify   | Mount `<LandingNavBar />` and `<HowItWorks />` in correct order     |

No edits to: `globals.css`, `tailwind.config.ts`, `FinalCTA.tsx`, hero subcomponents (`hero/HeroBackground.tsx`, `hero/HeroPhonePreview.tsx`), or any non-landing file.

---

## 9. Acceptance criteria

1. **Page composition:** Visiting `/` renders, in order: nav bar, hero, How It Works, Features, Pricing, Final CTA.
2. **Anchors:** Clicking any of the four nav links or the two new in-hero anchors (`See How It Works`, `Free during beta`) smooth-scrolls to the correct section, and the section's heading is not obscured by the sticky nav.
3. **Nav transparent→solid:** The nav has no background while the hero is in view; once the hero leaves the viewport, the nav becomes white with backdrop blur and a thin slate-200 bottom border. The transition is animated at 200 ms and disabled under reduced motion.
4. **Hero gradient:** The "Measurable Connection" text uses `from-emerald-400 via-teal-300 to-emerald-500`. The hand-drawn underline matches the same emerald palette.
5. **Free during beta badge:** Visible in the hero, between the body paragraph and the CTA row. Clicking it scrolls to `#pricing`.
6. **HowItWorks section:** Two columns on desktop, single column on mobile, organiser steps emerald, attendee steps indigo, three steps each with the exact copy in §5.2. Scroll-reveal animates once.
7. **Card cycle:** Active card advances every 2 seconds (was 2.5 s). Hover/focus pause + reduced-motion respect still work.
8. **Mobile nav:** Hamburger opens a vertical drawer with all five items; `Esc` closes; focus returns to the hamburger.
9. **A11y:** Type-check passes. All interactive elements have visible focus rings appropriate to their surface (white on dark, emerald on light).
10. **Hero subcomponents and below-hero light theme** unchanged in shape (only the hero file gets edits, only `Hero.tsx` itself; `hero/*` is left alone).

---

## 10. Out of scope

- Backend wiring for the launch-notify form (stays mocked).
- Adding new Tailwind tokens or theme entries.
- A redesign of the phone preview, hero background, or animated counters.
- A footer (none currently exists; not adding one).
- Any non-landing route changes.

