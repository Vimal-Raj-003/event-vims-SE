# Landing Page Light-Mode Redesign — Design Spec

**Date:** 2026-05-04
**Scope:** All landing page sections **below the hero**. The hero (`apps/web/src/components/Hero.tsx` and `hero/*`) is **out of scope and must not be modified**.
**Goal:** Convert the dark below-hero sections to a polished, professional light theme, and add an auto-cycling spotlight to the feature cards.

---

## 1. Constraints (locked)

- **Hero section:** untouched. No edits to `Hero.tsx`, `HeroBackground.tsx`, `HeroPhonePreview.tsx`, or any of its imports.
- **Theme below hero:** light mode only. No dark surfaces.
- **Brand cohesion:** retain the same emerald (organiser) and indigo (attendee) accent palette used in the hero, applied to a light surface.
- **Section transition:** hard cut from dark hero to light. No gradient bridge, no curve divider.

---

## 2. Foundation tokens (applied to all below-hero sections)

| Token            | Value                                                  | Use                                  |
| ---------------- | ------------------------------------------------------ | ------------------------------------ |
| Base background  | `#FFFFFF` (white) and `#FAFAFA` (`gray-50`)            | Alternating section rhythm           |
| Heading text     | `slate-900`                                            | All `<h2>`/`<h3>`                    |
| Body text        | `slate-600`                                            | Paragraphs, descriptions             |
| Muted text       | `slate-400` / `slate-500`                              | Captions, footer-ish text            |
| Card background  | `#FFFFFF`                                              | Resting state for all cards          |
| Card border      | `slate-200` (resting) → accent-400 (active)            | Spotlight system                     |
| Card shadow      | `shadow-sm` (resting) → `shadow-lg` + ring (spotlight) | Depth                                |
| Accent emerald   | `emerald-500` (primary), `emerald-50` (tint)           | Organiser tab + primary CTAs         |
| Accent indigo    | `indigo-500` (primary), `indigo-50` (tint)             | Attendee tab + secondary highlights  |
| Section spacing  | `py-24 lg:py-32`                                       | Vertical rhythm                      |
| Focus ring       | `ring-2 ring-emerald-500 ring-offset-2`                | Light-bg-friendly accessibility      |

**Section rhythm (top to bottom, below hero):**

1. `WhatYouGet` — `bg-white`
2. `PricingSimple` — `bg-gray-50`
3. `FinalCTA` — `bg-white` (with subtle decorative emerald blob, very low opacity)

---

## 3. Section: `WhatYouGet`

**File:** `apps/web/src/components/landing/WhatYouGet.tsx`

### 3.1 Visual restyle (light mode)

- Section background: `bg-white`. Remove existing `bg-dark-section` and the white/dark-glow blur ornament (replace with a faint emerald-50 radial blob, optional).
- Eyebrow pill ("What you get"): `bg-emerald-50 text-emerald-700 border-emerald-200`.
- Heading: `text-slate-900`.
- Subhead: `text-slate-600`.
- Tab strip (desktop): bottom border `border-slate-200`. Active tab: `text-slate-900` with `border-emerald-500` (or `border-indigo-500` for attendee). Inactive tab: `text-slate-500 hover:text-slate-800`.
- Tab pills (mobile): active = `bg-emerald-500 text-white` (emerald) or `bg-indigo-500 text-white` (indigo). Inactive = `bg-slate-100 text-slate-600`.
- Cards (resting): `bg-white border border-slate-200 shadow-sm rounded-2xl`.
- Card icon tile: emerald-50 / indigo-50 background tinted with `border-emerald-200` / `border-indigo-200`, accent-600 icon stroke.
- Card title: `text-slate-900`.
- Card body: `text-slate-600`.
- "View full feature matrix" link: `text-slate-500 hover:text-slate-900`, arrow stays.

### 3.2 Auto-cycling spotlight (the new behavior)

**Behavior:**

- Every **2500 ms (2.5 s)**, the active card index advances by 1, wrapping back to 0 after the last card.
- The active card receives:
  - `translate-y(-4px)` lift
  - Border color → accent-400 (emerald-400 or indigo-400 based on active tab)
  - `ring-4` halo in accent-100 (emerald-100 / indigo-100)
  - `shadow-lg`
  - Icon tile background fills to accent-500 with white icon stroke (so the icon "ignites")
- Other cards stay at full opacity — no dimming. Just resting style.
- Transition: 350 ms, ease-out spring (use `transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]` or equivalent).

**Pause rules:**

- Pauses when the user **hovers anywhere within the cards container**. Resumes ~800 ms after `mouseleave`.
- Pauses when the user **focuses any interactive element inside the section** (keyboard a11y).
- Pauses when the section is **not in viewport** (`IntersectionObserver`, `threshold: 0.2`). Resumes when re-entering.
- **Resets to index 0** on tab change (`organiser` ↔ `attendee`).
- If `prefers-reduced-motion: reduce` — auto-cycle is **disabled entirely**. Cards rely on hover-highlight only.

**Implementation outline (no code in spec; for the plan to expand):**

- New custom hook `useAutoSpotlight({ count, intervalMs, enabled })` returning `{ activeIndex, pause, resume }`.
- Hook internally uses `setInterval`, an enabled ref to avoid stale closures, and reads `matchMedia('(prefers-reduced-motion: reduce)')`.
- `WhatYouGet` wires the hook, an `IntersectionObserver` on the cards container ref, and `onMouseEnter` / `onMouseLeave` / `onFocusCapture` / `onBlurCapture` handlers.
- Active state passed into each card via prop `isActive: boolean`. Card styling switches via Tailwind class composition.

### 3.3 Accessibility

- Cards remain non-interactive (they're informational), so the spotlight is presentational only — no focus shifts.
- Active state must not be the only signal of "what the user is reading." Resting cards remain fully readable (full opacity, full contrast).
- Auto-cycle disabled under `prefers-reduced-motion`. Confirmed via `matchMedia`.

---

## 4. Section: `PricingSimple`

**File:** `apps/web/src/components/landing/PricingSimple.tsx`

### 4.1 Visual restyle (light mode)

- Section background: `bg-gray-50`. Remove `bg-dark-section`. Remove the existing emerald blur orb (or replace with very faint emerald-100 radial — optional, keep restrained).
- Eyebrow pill ("Pricing"): `bg-emerald-50 text-emerald-700 border-emerald-200`.
- Heading: `text-slate-900`. Subhead: `text-slate-600`.
- Pricing card: `bg-white border-emerald-200 shadow-sm rounded-2xl`. Optional `bg-emerald-50/30` tint inside if it reads too plain — confirm visually.
- "Free during beta" badge: `bg-emerald-100 text-emerald-700 border-emerald-200`.
- Description text inside card: `text-slate-700`.
- Divider line: `border-slate-200`.
- Email label: `text-slate-700`.
- Email input: `bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:ring-emerald-500/20`.
- Submit button: `bg-emerald-500 hover:bg-emerald-600 text-white` (white text on emerald reads cleaner on a light page than slate-950).
- Error text: `text-rose-600`.
- Success state: emerald-100 circle with emerald-600 check, `text-slate-900` confirmation copy.
- Footer micro-copy: `text-slate-500`.

### 4.2 Behavior

No functional changes. Form submission, validation, and status handling stay as-is.

---

## 5. Section: `FinalCTA`

**File:** `apps/web/src/components/landing/FinalCTA.tsx`

### 5.1 Visual restyle (light mode)

- Section background: `bg-white`. Remove `bg-dark-section`.
- Decorative: a single very-low-opacity emerald radial blob in one corner (e.g., bottom-right) — `bg-emerald-200/20 blur-[120px]`. Restrained so the section doesn't end flat.
- Eyebrow pill ("Get started"): `bg-emerald-50 text-emerald-700 border-emerald-200`.
- Heading: `text-slate-900`.
- Subhead: `text-slate-600`.
- Primary CTA (Create Your First Event): `bg-emerald-500 hover:bg-emerald-600 text-white` with same arrow icon. Same shape and padding.
- Secondary CTA (Attendee? Join Event): `bg-white border-slate-300 text-slate-800 hover:bg-slate-50`.

---

## 6. Cross-section polish

- **Scroll-in animation:** Section heads and cards do a one-shot `opacity-0 → opacity-100` + `translate-y(8px) → translate-y(0)` reveal when entering viewport. Stagger card reveals by 60 ms. Use `IntersectionObserver` (one-shot) — do not re-trigger on subsequent scrolls.
- **Reduced motion:** All scroll-in transitions and the auto-spotlight respect `prefers-reduced-motion: reduce`. With reduced motion, content appears immediately at final state.
- **Focus styles:** Every interactive element gets a visible `focus-visible` ring tuned for light bg (`ring-2 ring-emerald-500 ring-offset-2 ring-offset-white`).
- **No CSS class deletions outside the three section files.** Tailwind utility class `bg-dark-section` may stay defined globally; we just stop using it in these three files. (Verify it's not used elsewhere on the landing route before deciding to remove the token.)

---

## 7. Out of scope

- Hero section and its subcomponents.
- Global navbar / footer changes (if any exist on the landing route).
- Backend wiring for the launch-notify form (already TODO; unchanged).
- The `/docs/features` page linked at the bottom of `WhatYouGet`.
- Any non-landing routes.

---

## 8. Files touched

| File                                                       | Change                                              |
| ---------------------------------------------------------- | --------------------------------------------------- |
| `apps/web/src/components/landing/WhatYouGet.tsx`           | Light theme restyle + auto-cycling spotlight       |
| `apps/web/src/components/landing/PricingSimple.tsx`        | Light theme restyle                                 |
| `apps/web/src/components/landing/FinalCTA.tsx`             | Light theme restyle + faint decorative blob        |
| `apps/web/src/hooks/useAutoSpotlight.ts` *(new)*           | Auto-cycle hook with pause/reduced-motion support  |
| `apps/web/src/hooks/useScrollReveal.ts` *(new, optional)*  | One-shot scroll reveal hook (only if not already present) |

No edits to global Tailwind config, theme tokens, or `Hero*` files.

---

## 9. Acceptance criteria

1. Hero section is byte-identical (no diff against current `master` for hero files).
2. The three below-hero sections render on a light background. No dark backgrounds visible.
3. Cards in `WhatYouGet` auto-cycle highlight every 2.5 s, pausing on hover/focus/off-screen, resetting on tab change, and disabled when `prefers-reduced-motion: reduce`.
4. Tab switching (Organiser ↔ Attendee) still works on desktop and mobile, with arrow-key navigation preserved.
5. Pricing form still validates, submits (mock), and shows success state.
6. All interactive elements have a visible light-bg focus ring.
7. Lighthouse contrast checks pass (AA minimum) for body text, headings, badges, and CTA labels.
8. No console warnings or React strict-mode warnings introduced.
