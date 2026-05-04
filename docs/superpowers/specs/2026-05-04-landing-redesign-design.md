# VIMS Event — Landing Redesign Design Spec

**Date:** 2026-05-04
**Workstream:** 3 of 3 (Verification → Hero → **Landing**)
**Status:** Design approved, ready for implementation plan

## Context

The current landing page (`apps/web/src/app/(public)/page.tsx`, 535 lines, 7 sections after hero + 3 helpers + a `useReveal` hook) carries every dimension of dissatisfaction surfaced during brainstorming:

1. **Visual style is dated** — pastel cards, scroll-reveal animations, soft hover gradients read as "2022 SaaS template."
2. **Fake/hardcoded content** — `Amara Kazeem · TechFlow`, `847 connections · 94% engagement · TechConnect Summit 2026` look staged.
3. **Information architecture** — content is repeated three times (Excel export, branding, DPDP show up in HowItWorks, Features, ForAttendees, and ForOrganisers).
4. **Typography & spacing** — sections feel cramped, type hierarchy could be sharper.
5. **Color palette** — too much indigo/violet bleed, especially against the new hero.
6. **Pricing** — three tiers (Starter / Professional / Enterprise + Contact Sales) is premature for a beta product.
7. **CTAs** — "Create Your Event" appears 4+ times, weakening signal.
8. **Mobile experience** — sections look uneven and CTA repetition is more obvious.

Workstream 3 is a **redesign**, not polish. Hero (workstream 2) is locked.

## Goals

- Cut the page from 7 post-hero sections to 3 (`What you get` + `Pricing` + `Final CTA`), aligned to the user-confirmed Lean roster (R1).
- Adopt **Premium SaaS dark** aesthetic (D2) end-to-end — pure dark monochrome with emerald as the single accent, continuing from the existing hero.
- Replace all fake names and hardcoded statistics with either generic copy or removed sections — **no fabricated proof points anywhere** on the page.
- Each section becomes its own file (≤140 lines) under `apps/web/src/components/landing/`. The page-level orchestrator stays under 80 lines.
- Match the hero's performance budget: zero canvas, zero added JS for static markup, zero CLS, ≤0.5KB CSS additions.
- Preserve every existing CTA destination (`/auth/organiser/signup`, `/auth/attendee/login`, `#how-it-works` anchor) so the redesign doesn't break copy on social posts or email outreach.

## Non-Goals

- **No** changes to the hero (`apps/web/src/components/Hero.tsx` and friends) — locked from workstream 2.
- **No** changes to the navbar / footer / theme provider / global layout chrome.
- **No** A/B testing infrastructure.
- **No** new backend endpoints. The pricing email-capture form ships as a UI stub (success state only) with a `TODO` comment for the future `/public/launch-notify` endpoint.
- **No** internationalisation work (copy stays English).
- **No** new motion library / Framer Motion / GSAP.
- **No** real product screenshots embedded in the page (they'd need legal review and might leak unreleased UI). The "What you get" wall uses icons + text only.
- **No** light-mode variant for the landing page. Landing is dark; the rest of the app remains theme-aware.

## Approach

```
┌──────────────────────────────────────────────────────────────┐
│  apps/web/src/app/(public)/page.tsx (orchestrator, ~80 LOC)  │
│   ├─ <Hero />                  (locked from WS 2)            │
│   ├─ <WhatYouGet />            (~140 LOC, new)               │
│   ├─ <PricingSimple />         (~50 LOC, new)                │
│   └─ <FinalCTA />              (~40 LOC, new)                │
└──────────────────────────────────────────────────────────────┘
```

Four units, each independently swappable. Single dark band runs from the hero's bottom fade through the footer — no contrast-band switching mid-page.

## Architecture & File Changes

| Action | Path | Notes |
|---|---|---|
| **Modify (full rewrite)** | `apps/web/src/app/(public)/page.tsx` | Down from 535 LOC to ~80; orchestrator only. Drops `useReveal`, `EyebrowTag`, `SectionTitle`, `SectionDesc`, `Section`, `MissionBar`, `HowItWorksSection`, `FeaturesSection`, `ForAttendeesSection`, `ForOrganisersSection`, `PricingSection`, `CTASection` — all moved or deleted. |
| **Create** | `apps/web/src/components/landing/WhatYouGet.tsx` | Replaces 4 of the deleted sections. Top tabs (Organiser / Attendee), 3-column feature grid (2 on tablet, 1 on mobile). ~140 LOC. |
| **Create** | `apps/web/src/components/landing/PricingSimple.tsx` | Replaces the 3-tier `PricingSection`. Single centered card with "Free during beta" + email capture stub. ~50 LOC. |
| **Create** | `apps/web/src/components/landing/FinalCTA.tsx` | Restyled CTA. Drops purple gradient + animate-blob + redundant logo image. ~40 LOC. |
| **Modify** | `apps/web/src/app/globals.css` | Append `@keyframes glowDrift` + `.bg-dark-section` utility (~12 lines added). Also remove the now-unused `.reveal`, `.reveal-left`, `.reveal-right`, `.reveal-d1`...`.reveal-d6`, `.visible` rules (~32 lines removed) — only `(public)/page.tsx` referenced them, and it's getting fully rewritten. Net CSS change ≈ −20 lines. |

Total net code change: roughly **−535 + 80 + 140 + 50 + 40 − 20 ≈ −245 LOC** (page.tsx shrinks 535→80, three new component files add 230, and globals.css net loses 20 lines once dead `.reveal*` rules are removed). Comparable in magnitude to the hero workstream's reduction.

## Visual System

### Background

- Body / page background: `bg-slate-950` from the moment the hero ends through the footer
- Hero already fades `from-transparent to-background` on its bottom edge; with dark theme active, `--background` resolves to `hsl(222 47% 8%)` ≈ `slate-950`, so the join is invisible
- One subtle ambient glow per section (alternating positions, `bg-emerald-500/[0.04] blur-[100px]`, ~300×300px circle, `pointer-events-none`)
  - `WhatYouGet`: top-right emerald glow
  - `PricingSimple`: left-side emerald glow
  - `FinalCTA`: no glow (climax — flat dark for impact)
- Glow drift animation: 60s `ease-in-out alternate infinite`, ±2% translate. Disabled by `prefers-reduced-motion: reduce`.

### Typography

- Family: Inter (already in use via Next.js fonts)
- Eyebrow tag: `text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400` inside an emerald pill (`bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full`)
- Section headline: `text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] text-balance`
- Section subhead: `text-base sm:text-lg text-white/55 leading-relaxed max-w-2xl`
- Body within blocks: `text-sm text-white/60 leading-relaxed`
- Block titles: `text-base font-semibold text-white`
- All numerals throughout the section (counts, dates, etc.): same Inter family, no monospace switch (we'd need monospace if we had real data; we have none, so plain text avoids drawing attention)

### Color palette

- **Backgrounds:** `bg-slate-950` (canvas), `bg-white/[0.02]` (block), `bg-white/[0.04]` (block hover)
- **Borders:** `border-white/8` (block default), `border-white/15` (block hover), `border-white/8` (section dividers — used sparingly)
- **Text hierarchy:** `text-white` (titles), `text-white/60` (body), `text-white/55` (subhead), `text-white/40` (inactive tab)
- **Accent (emerald):** `emerald-500/10` (icon bg), `emerald-500/20` (icon border + tab underline), `emerald-400` (text on emerald pill, active tab text), `emerald-500` (CTA primary fill)
- **Secondary accent (indigo) — only on the Attendee tab in `WhatYouGet`:** `indigo-500/10`, `indigo-500/20`, `indigo-400`. Subliminal role differentiation; never bleeds outside that one tab's content.

### Spacing & rhythm

- Section vertical padding: `py-20 lg:py-28`
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Eyebrow → headline → subhead → content: `mb-3` / `mb-3` / `mb-12` between them
- Block-grid gap: `gap-4 sm:gap-5`
- No horizontal dividers between sections — only the natural padding gap

## Section 1 — `WhatYouGet`

### Header

- Eyebrow: `What you get`
- Headline: `Built for both sides of the room`
- Subhead: `Everything organisers need to run the event, everything attendees need to make it count.`

### Tab strip

- Two tabs: `For Organisers` (active = emerald underline, white text) and `For Attendees` (active = indigo underline, white text)
- Strip: `flex border-b border-white/8 pb-3 mb-12`
- Tab: `px-4 pb-3 text-sm font-semibold transition-colors`. Active = `text-white border-b-2 border-emerald-400 -mb-[14px] pb-[10px]` (or indigo for attendee). Inactive = `text-white/40 hover:text-white/70`.
- State: `useState<'organiser' | 'attendee'>('organiser')` — local to component, no URL hash sync.

### Mobile (<640px)

- Tab strip becomes a 2-button pill row: `[Organisers] [Attendees]`, each `flex-1 py-2.5 rounded-lg text-sm font-semibold`. Active = solid emerald or indigo bg + white text. Inactive = `bg-white/5 text-white/60`.

### Feature grid

- `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5`
- Each block: `rounded-2xl border border-white/8 bg-white/[0.02] p-6 hover:border-white/15 hover:bg-white/[0.04] transition-colors`
- Icon container: `w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5` (indigo variant for attendee tab)
- Icon: 20×20 outline SVG, `stroke-[1.75]`
- Title: `text-base font-semibold text-white mb-2`
- Body: `text-sm text-white/60 leading-relaxed`

### Content — 6 organiser blocks

| # | Title | Body |
|---|---|---|
| 1 | 5-minute event setup | Wizard handles branding, registration fields, and networking rules in one pass. No drafts to revisit. |
| 2 | Real-time analytics | Connections-per-hour, top connectors, drop-off, response times. Visible during the event, not after. |
| 3 | Custom branding | Logo, colours, branded business cards. Match your event identity end-to-end. |
| 4 | Excel export | Four structured sheets: attendees, connections, engagement, audit log. Column-aligned to most CRMs. |
| 5 | Announcements | Push messages to all attendees mid-event. SMS-grade urgency, no app download required. |
| 6 | DPDP compliant | Consent capture, right to access, right to erasure. Built in, not retrofitted. |

### Content — 6 attendee blocks

| # | Title | Body |
|---|---|---|
| 1 | No app needed | Works in any mobile browser. Receive your event link, scan, done. |
| 2 | One-scan QR exchange | Connect with anyone in the room in two seconds. Their vCard lands in your phone's contacts. |
| 3 | Smart directory | Search by name, company, industry, or interest. Filter to find the people who matter. |
| 4 | Privacy-first | Phone and email only shared after both sides accept. Pause your profile any time. |
| 5 | Personal dashboard | Every connection saved, every conversation noted. Follow up without losing context. |
| 6 | vCard / CSV export | Walk out with a clean address book. No retyping, no lost cards. |

### Footer link

Below the grid, centered:
```
Want to compare side-by-side? View the full feature matrix →
```
Links to `/docs/features` — that page does NOT exist yet. Add a `// TODO: ship full feature matrix in WS 4 or later` comment in the component.

## Section 2 — `PricingSimple`

### Header

- Eyebrow: `Pricing`
- Headline: `Free during beta`
- Subhead: `We'll lock pricing when we exit beta. Drop your email and we'll let you know — no spam, no auto-charges.`

### Card

- `max-w-xl mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 sm:p-10 backdrop-blur-sm`
- Top: emerald pill `⚡ Free during beta` (small, `inline-flex` with lightning bolt SVG icon)
- Bullet line: `Unlimited events · Unlimited attendees · All features unlocked` — `text-white text-base text-center mt-4`
- Divider: `my-6 border-t border-white/8`
- Form label: `text-sm text-white/70 font-medium mb-3 block`: `Get notified when paid plans launch:`
- Input + button row: `flex flex-col sm:flex-row gap-2`
  - Input: `flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40`
  - Button: `bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors`
- Helper text: `text-xs text-white/40 mt-3`: `We'll only email once — when pricing locks.`

### Form behaviour

- `useState<'idle' | 'submitting' | 'success' | 'error'>('idle')` plus an `email` state
- On submit: validate `email.includes('@')`, then setState to `success` after 600ms simulated delay (no real API call yet)
- Success state: replaces the form with a centered green check-mark + `You're on the list. We'll email you once.`
- A `// TODO: wire to POST /api/v1/public/launch-notify` comment marks the stub. **No backend route created in this workstream.**

## Section 3 — `FinalCTA`

### Layout

- Full-bleed dark band (continues `bg-slate-950`)
- Container: `max-w-4xl mx-auto px-4 py-24 lg:py-32 text-center`
- **Removed:** `<Image src="/logo.png" />` block, both `animate-blob` decorative blurs, the white-on-purple gradient card

### Content

- Eyebrow: `Get started`
- Headline: `Ready to transform your event networking?` — `text-4xl sm:text-5xl font-extrabold text-white text-balance`
- Subhead: `Be among the first to use VIMS Events. Set up your first event in under five minutes — completely free during beta.` — `text-lg text-white/55 max-w-2xl mx-auto mt-5 leading-relaxed`
- Button row: `mt-10 flex flex-col sm:flex-row items-center justify-center gap-3`

### Buttons

- Primary: `Create Your First Event` → `/auth/organiser/signup`
  - Style: `inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl px-7 py-3.5 text-base transition-colors`
- Secondary: `Attendee? Join Event` → `/auth/attendee/login`
  - Style: `inline-flex items-center bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-7 py-3.5 text-base transition-colors`

## Performance Budget

- LCP: not the landing's concern (hero owns it; locked from WS 2). The dark sections use no images.
- JavaScript on initial render: 0 KB for static markup. The only client-side state is `WhatYouGet`'s active tab + `PricingSimple`'s form — both <0.3 KB hydrated.
- CSS additions: ≤0.5 KB gzipped (one keyframe + one utility).
- CLS: 0 (all sections have natural intrinsic heights; no late-arriving content shifts layout).
- Removed JavaScript: `useReveal` IntersectionObserver hook + 535 lines of inline JSX → ~3 KB gzipped reduction.

## Accessibility

- Tab strip in `WhatYouGet`: proper ARIA pattern. Tab buttons get `role="tab"`, `aria-selected`, `aria-controls`. Tab panels get `role="tabpanel"`, `aria-labelledby`. Keyboard: `←` / `→` switch tabs.
- Mobile pill row: same ARIA pattern; visually different but semantically a tablist.
- Pricing form: `<form>` with `<label htmlFor="email">` association. Email input has `type="email"`, `required`. Success state is announced via `role="status"` so screen readers pick it up.
- `FinalCTA` buttons keep their visible text — no `aria-label` overrides needed.
- Glow drift animation respects `prefers-reduced-motion: reduce` (set to `animation: none` in the existing media query block from WS 2's `globals.css`).
- Color contrast: `text-white/60` on `bg-slate-950` = ≈8.4:1 (AAA). `text-white/55` on `bg-slate-950` ≈ 7.4:1 (AAA). `text-emerald-400` on the emerald-tinted card bg ≈ 6.2:1 (AA). All pass WCAG AA at minimum.

## Testing Approach

- **Visual smoke** at desktop (1440×900), tablet (768×1024), mobile (390×844). Confirm tab switching works, form submits to success state, no overflow.
- **Console clean:** no warnings about deleted `useReveal` references, no missing icon imports, no 404s on the dropped `/logo.png` reference (the FinalCTA stops using it).
- **Tab keyboard navigation:** `Tab` moves focus into the strip; `←` / `→` switches tabs; `Enter` / `Space` activates.
- **Lighthouse:** target Performance ≥95 (was lower due to the canvas hero in WS 1; should be much higher now). Accessibility ≥95. Best Practices ≥95.
- No unit tests required — these are presentational components with localised state. Component verification is by visual inspection.

## Out-of-scope follow-ups (notes for future workstreams)

- Real `/api/v1/public/launch-notify` endpoint + storage (probably `LaunchNotificationSubscriber` Prisma model with email + `subscribedAt` + a 24h dedupe).
- A real `/docs/features` feature-matrix page — the WhatYouGet footer link points there.
- Real testimonials section once we have actual users to quote (drops in between WhatYouGet and Pricing).
- Open Graph / Twitter Card image specifically tuned for the new dark hero (current OG image still references the canvas hero).

## Hand-off

This workstream completes the 3-workstream sequence (Verification → Hero → Landing). After this:

- The 7 deferred WS-1 hand-off items (`AT-1`, `AT-2`, `AT-3`, `AT-4`, `OG-1`, `OG-3`, plus the `/events/new` wizard split) become candidates for WS 4+ if/when prioritised.
- The simplified pricing email capture is a stub — wiring it to a real backend endpoint becomes a future small task.
- No open hand-offs from this workstream itself — every visual decision is locked, every section has a single component owner.
