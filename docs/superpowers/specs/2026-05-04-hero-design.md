# VIMS Event — Hero Redesign Design Spec

**Date:** 2026-05-04
**Workstream:** 2 of 3 (Verification → **Hero** → Landing polish)
**Status:** Design approved, ready for implementation plan

## Context

The current hero (`apps/web/src/components/Hero.tsx`, 169 lines) sits on top of `NetworkAnimation.tsx` (268 lines of canvas-based particle animation). User feedback after the verification workstream identified four issues:

1. **The animation feels generic** — the procedural particle network reads as "AI-generated" / not premium.
2. **The animation janks** — canvas can flicker on first paint and during scroll on lower-end devices.
3. **The visual style is dated** — the dark indigo gradient + canvas overlay is overdone in the SaaS landing-page genre.
4. **The structure (badge → headline → subtitle → CTAs → 3-stat grid) feels generic** — no product cue.

This spec replaces the hero entirely while preserving the existing copy, CTAs, and the on-brand "Turn Every Handshake Into a Measurable Connection" headline.

## Goals

- Replace the canvas particle background with a real photograph (P2 — Unsplash conference floor `photo-1531058020387-3be344556be6`) treated with a slow Ken Burns zoom.
- Restructure to a two-column desktop layout: copy + CTAs on the left, a phone mockup with live-feeling notifications on the right.
- Eliminate the canvas-jank by removing all JavaScript-driven background animation.
- Self-host all hero assets (no Unsplash hotlinking) so we control the bytes and survive third-party outages.
- Ship at ~Lighthouse Performance 95+ on the landing page, with **zero** Cumulative Layout Shift from the hero.
- Preserve the existing `Hero` import contract (`import Hero from "@/components/Hero"` from the landing page) so the public landing route doesn't churn.

## Non-Goals

- **No** copy rewrite (headline, subtitle, CTA labels stay as-is). If the user later wants new copy, that's a follow-up.
- **No** changes to the rest of the landing page sections (MissionBar, HowItWorks, Features, etc.) — those are workstream 3.
- **No** new motion library / Framer Motion / GSAP. Pure CSS transforms only.
- **No** A/B test scaffolding.
- **No** dark/light theme variant — hero stays dark-overlay regardless of the rest of the site theme.
- **No** server-side image optimization service (we ship pre-processed static files).

## Approach

```
┌──────────────────────────────────────────────────────────────┐
│  Hero.tsx (orchestrator, ~70 lines)                          │
│   ├─ <HeroBackground />     (photo + gradient + Ken Burns)   │
│   ├─ <div two-col grid>                                      │
│   │    ├─ left: badge + h1 + p + CTAs                       │
│   │    └─ right: <HeroPhonePreview />                        │
│   └─ live-status pill (desktop only)                         │
└──────────────────────────────────────────────────────────────┘
```

Three units, each ≤80 lines, each independently testable.

## Architecture & File Changes

| Action | Path | Notes |
|---|---|---|
| **Modify** | `apps/web/src/components/Hero.tsx` | Restructure to two-column grid; replace `<NetworkAnimation />` with `<HeroBackground />`; drop the inline 3-stat grid; replace the bottom wave-divider SVG with an 80px linear fade |
| **Delete** | `apps/web/src/components/NetworkAnimation.tsx` | 268 lines of canvas + JS removed |
| **Create** | `apps/web/src/components/hero/HeroBackground.tsx` | `<picture>` element (AVIF + WebP + JPEG), eager-loaded, blur-data placeholder, Ken Burns CSS animation. ~50 lines. |
| **Create** | `apps/web/src/components/hero/HeroPhonePreview.tsx` | Phone frame + 2 notification cards + entrance animation. ~90 lines. |
| **Create** | `apps/web/public/hero/conference-floor-2400.avif` | Source: Unsplash `photo-1531058020387-3be344556be6`, 2400×1350, AVIF q=60 |
| **Create** | `apps/web/public/hero/conference-floor-1600.webp` | Same source, 1600×900, WebP q=70 |
| **Create** | `apps/web/public/hero/conference-floor-1200.jpg` | Same source, 1200×675, JPEG q=80 |
| **Create** | `apps/web/public/hero/conference-floor-blur.jpg` | 24×14 px LQIP for `style={{ backgroundImage }}` placeholder |
| **Modify** | `apps/web/src/app/globals.css` | Add `@keyframes kenBurns` + `.animate-ken-burns` utility (~12 lines); add `@keyframes notifSlideIn` (~8 lines) |

Total net code change: roughly **−268 (delete NetworkAnimation) − 99 (Hero shrinks 169→~70) + 50 (HeroBackground) + 90 (HeroPhonePreview) ≈ −227 LOC**. Significant net reduction — we delete more than three times what we add.

## Visual Composition

### Desktop (≥1024px)

- Hero section: `min-h-[680px]` (was `min-h-screen` — too tall to fit the two columns + photo crop nicely)
- Container: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Vertical padding: `py-24 lg:py-28`
- Two-column grid: `grid-cols-[1.4fr_1fr] gap-12` (≈58% / 42%)
- Left column: vertical stack (badge → h1 → p → CTA row), all `text-left` (was center-aligned). Items use existing `animate-in` stagger pattern (80ms between elements).
- Right column: `<HeroPhonePreview />` floated `flex items-center justify-end`. Phone tilts `rotate-2` for energy.
- Below the phone, bottom-right: live-status pill `🟢 1,284 attendees networking now` (frosted-glass element, dummy number, no fetch).

### Tablet (768–1023px)

- Two columns collapse to single-column at `lg` breakpoint. Hero stays single-column from 768 down.
- Photo background still full-bleed.
- Phone shrinks to `w-[220px]` and centers below the CTA row.
- Live-status pill is hidden.

### Mobile (<768px)

- Single-column, all content centered like the original hero.
- Hero height: `min-h-[640px]` (no `screen` — keeps the rest of the page above the fold on smaller phones).
- Phone width: `w-[200px]`, no rotation.
- Padding: `py-20 px-4`.

### Photo treatment

- **Source:** Unsplash `photo-1531058020387-3be344556be6` ("conference floor with depth of field"). Free, commercial use, no attribution required (Unsplash License).
- **Crop:** 16:9 base, with `object-position: 50% 40%` to keep the brightest cluster of attendees slightly above center.
- **Overlay:** `linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,27,75,0.7) 50%, rgba(15,23,42,0.6) 100%)` — heavier on the top-left so the headline always reads against a dark area.
- **Ambient glows:** keep the existing two radial-glow divs (indigo top-left, violet bottom-right) but reduce intensity by ~50% — the photo carries most of the atmosphere now.
- **Noise texture:** keep the existing 2%-opacity SVG noise overlay.

### Bottom edge

The current wave-divider SVG is removed. Replace with an 80px linear fade from the photo into the page background colour: `bg-gradient-to-b from-transparent to-white pointer-events-none absolute bottom-0 inset-x-0 h-20` (and `to-background` if dark mode is active in the rest of the page).

## Right-Column Phone Mockup

### Frame

- Outer device: `w-[260px] rounded-[32px] border-[10px] border-slate-800 bg-slate-900`
- Inner screen: `rounded-[20px]` with a top notch indicator (`w-12 h-1.5 rounded-full bg-black/40 mx-auto mb-3`)
- Drop shadow: `shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]`
- Screen background: `linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)` (matches hero overlay tone)
- Tilt: `rotate-2` on `lg:` and up only
- Entrance: opacity `0 → 1` + `translateY(8px) → 0` over 600ms, `delay-400` (fires after headline finishes its stagger)

### Notification card 1 — Connection request

```
┌──────────────────────────────────────────┐
│ [VP avatar]  Vikram Patel       2m ago   │
│              wants to connect            │
│                                          │
│ "Loved your talk on cloud architecture"  │
│                                          │
│ [+1 mutual · TechSummit Bengaluru]       │
└──────────────────────────────────────────┘
```

- `bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3`
- Avatar: 32×32 circle, gradient `from-indigo-500 to-pink-500`, initials "VP" in white 12px bold
- Title: `text-xs font-semibold text-white`
- Body: `text-[11px] text-white/70 italic`
- Pill: `text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full`

### Notification card 2 — Smart match

```
┌──────────────────────────────────────────┐
│ ✨ Smart match · 92% relevance           │
│ Meet 4 people aligned to your services   │
│ [View matches →]                         │
└──────────────────────────────────────────┘
```

Same styling as card 1. Slides in from below 1.2s after page load (`@keyframes notifSlideIn`, fired once via `animation-fill-mode: forwards`). After it lands, **no further motion**. The phone is then static.

### Live-status pill (desktop only, ≥1024px)

Below the phone, bottom-right area:
```
[🟢] 1,284 attendees networking now
```
- `bg-white/8 backdrop-blur-sm border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/80`
- Green dot: `w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse`
- Text is hardcoded for now (`1,284`). Future workstream may wire to real attendee counts; this spec does not require it.

### Mobile and reduced-motion behaviour

- Mobile (<768px): no rotation, no live-status pill, both notifications visible from page load (no slide-in delay since the phone is below the fold anyway and the entrance animation only matters when seen).
- `@media (prefers-reduced-motion: reduce)`: disable Ken Burns on the photo, disable the notification slide-in, disable the green dot pulse. All entrance animations remain (they're staged stillness, not loops).

## Photo Asset Pipeline

### Acquisition

The photo will be downloaded once during initial implementation from:
```
https://images.unsplash.com/photo-1531058020387-3be344556be6?fm=jpg&q=85&w=2400
```

Saved as a single source file at `apps/web/public/hero/_source.jpg` (≈800KB), then processed into the four artifacts via a one-shot bash script using `sharp` or `cwebp`/`avifenc`. The source file is committed; the script does not run in CI.

### Output

| Format | Size | Quality | Approx bytes |
|---|---|---|---|
| AVIF | 2400×1350 | q=60 | ~280 KB |
| WebP | 1600×900 | q=70 | ~220 KB |
| JPEG | 1200×675 | q=80 | ~190 KB (fallback) |
| JPEG (LQIP) | 24×14 | q=40 | ~700 B |

### `<picture>` markup

```jsx
<picture>
  <source type="image/avif" srcSet="/hero/conference-floor-2400.avif" />
  <source type="image/webp" srcSet="/hero/conference-floor-1600.webp" />
  <img
    src="/hero/conference-floor-1200.jpg"
    alt=""
    aria-hidden="true"
    loading="eager"
    fetchPriority="high"
    decoding="async"
    className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
    style={{ objectPosition: "50% 40%" }}
  />
</picture>
```

The `loading="eager"` + `fetchPriority="high"` ensures LCP. The blur-data placeholder is a `style={{ backgroundImage: 'url(/hero/conference-floor-blur.jpg)', backgroundSize: 'cover' }}` on the parent so there's never a transparent flash.

## Animation Policy

| Effect | Duration | Curve | Repeats? | Disabled by reduced-motion? |
|---|---|---|---|---|
| Photo Ken Burns | 24s (alternate) | ease-in-out | yes (alternate) | yes |
| Headline / subtitle stagger | 700ms each | ease-out | once | no (entrance) |
| Phone entrance | 600ms (delay 400) | ease-out | once | no |
| Notification card 2 slide-in | 500ms (delay 1200) | ease-out | once | yes |
| Live-status green dot pulse | 2s | ease-in-out | yes | yes |

**Principle:** anything that loops is decorative and disableable. Anything that fires once is staged stillness.

## Performance Budget

- Hero LCP candidate: the photo. Target LCP ≤ 1.5s on a fast 4G simulated profile.
- Hero JavaScript on initial render: 0 KB (all components are server-renderable; the only client work is React hydration of static markup).
- Hero CSS additions: ≤ 0.4 KB (gzipped) — two short keyframes + utility classes.
- Removed JS: `NetworkAnimation.tsx` is 268 lines / ~5 KB gzipped of canvas + RAF logic. Net JS reduction.
- CLS: 0 (photo container has fixed aspect ratio; phone has fixed dimensions; no late-arriving content).

## Accessibility

- Photo `<img>` is `alt=""` and `aria-hidden="true"` (decorative).
- Phone frame is wrapped in `aria-hidden="true"` (mockup).
- Notification text is exposed to screen readers as plain `<p>` content (not as fake `role="alert"` — they're decorative).
- Live-status pill: `<span aria-label="1,284 attendees networking now">` with the dot also `aria-hidden`.
- All entrance animations honour `prefers-reduced-motion`.
- Headline and subtitle keep semantic h1/p tags. CTA links keep their existing `aria-label` (none currently — visible text is sufficient).

## Testing Approach

- **Visual smoke:** open `/` at desktop (1280×800), tablet (768×1024), mobile (390×844). Check phone position, rotation, photo crop, no overflow.
- **Console clean:** no warnings about unused canvas refs, no 404s on photo paths.
- **DevTools Network:** confirm the AVIF or WebP loads (not the JPEG fallback) on a modern browser.
- **DevTools Performance:** record initial load, confirm LCP ≤ 1.5s and CLS = 0.
- **Reduced-motion:** toggle `prefers-reduced-motion: reduce` in DevTools, confirm Ken Burns and notif-slide-in are disabled.
- **Lighthouse:** the landing page Performance score should not regress (target ≥ 95).
- No new unit tests required — Hero is a pure presentational component with no logic. The component is verifiable by visual inspection alone.

## Out-of-scope follow-ups (notes for future workstreams)

- Wiring the live-status pill to real attendee counts (would need a public `/api/v1/public/stats` endpoint).
- Localising "1,284 attendees networking now" copy.
- Cycling the photo per visit (would need ≥3 source photos and a session storage flag).
- A/B testing the two-column vs single-column layout.

## Hand-off to Workstream 3 (Landing polish)

The hero stops at the bottom edge of its photo (now a soft fade, not the wave divider). Workstream 3 inherits a stable hero contract — no further hero changes expected — and continues from `MissionBar` onward. The 7 deferred polish items from the verification report (3 organiser + 4 attendee) are unchanged by this work and remain WS 3 inputs.
