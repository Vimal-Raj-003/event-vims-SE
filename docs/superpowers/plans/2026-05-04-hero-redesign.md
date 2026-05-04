# Hero Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the canvas-particle hero with a two-column photo-based hero (left: copy + CTAs; right: phone preview with notifications) and ship a self-hosted, modern-format image pipeline.

**Architecture:** Three focused components — `Hero.tsx` (orchestrator), `HeroBackground.tsx` (photo + Ken Burns), `HeroPhonePreview.tsx` (phone mockup) — driven by static assets in `/public/hero/`. Zero JavaScript runs for the background; only React hydrates the static markup.

**Tech Stack:** Next.js 15 App Router · React 18 · Tailwind CSS · pure-CSS keyframes (no Framer Motion / GSAP) · `<picture>` element with AVIF/WebP/JPEG fallback · Unsplash-hosted source photo (downloaded once, committed to repo).

**Spec:** [docs/superpowers/specs/2026-05-04-hero-design.md](../specs/2026-05-04-hero-design.md)

---

## Pre-flight

The dev servers (API on `:4000`, web on `:3000`) should already be running from prior work. Confirm:

```bash
curl -s -o /dev/null -w "API:%{http_code}\nWEB:%{http_code}\n" http://localhost:4000/api/v1/health http://localhost:3000
```

Expected: `API:200` / `WEB:200`. If not running, start with `npm run dev` from the repo root.

The Playwright MCP browser is the verification tool — `mcp__plugin_playwright_playwright__browser_*`. Use it for every visual checkpoint.

---

## Task 1: Acquire and commit photo assets

**Files:**
- Create: `apps/web/public/hero/conference-floor-2400.avif`
- Create: `apps/web/public/hero/conference-floor-1600.webp`
- Create: `apps/web/public/hero/conference-floor-1200.jpg`
- Create: `apps/web/public/hero/conference-floor-blur.jpg` (LQIP, 24×14 px)

The source is Unsplash photo `1531058020387-3be344556be6` (free, commercial use, no attribution required). Unsplash's CDN supports format conversion + resize via URL params, so we don't need `sharp` or ImageMagick locally.

- [ ] **Step 1.1: Create the hero asset directory**

```bash
mkdir -p apps/web/public/hero
ls apps/web/public/hero
```

Expected: empty directory listing (no error).

- [ ] **Step 1.2: Download the AVIF (2400×1350)**

```bash
curl -L --fail -o apps/web/public/hero/conference-floor-2400.avif \
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?fm=avif&q=60&w=2400&fit=crop&crop=entropy"
ls -la apps/web/public/hero/conference-floor-2400.avif
```

Expected: file exists, size between 200KB and 500KB. If `curl` reports HTTP error, fall through to JPEG-only and remove the AVIF `<source>` from `HeroBackground.tsx` in Task 3.

- [ ] **Step 1.3: Download the WebP (1600×900)**

```bash
curl -L --fail -o apps/web/public/hero/conference-floor-1600.webp \
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?fm=webp&q=70&w=1600&fit=crop&crop=entropy"
ls -la apps/web/public/hero/conference-floor-1600.webp
```

Expected: file exists, size 150–300KB.

- [ ] **Step 1.4: Download the JPEG fallback (1200×675)**

```bash
curl -L --fail -o apps/web/public/hero/conference-floor-1200.jpg \
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?fm=jpg&q=80&w=1200&fit=crop&crop=entropy"
ls -la apps/web/public/hero/conference-floor-1200.jpg
```

Expected: file exists, size 130–250KB.

- [ ] **Step 1.5: Download the LQIP placeholder (24×14, blurred)**

```bash
curl -L --fail -o apps/web/public/hero/conference-floor-blur.jpg \
  "https://images.unsplash.com/photo-1531058020387-3be344556be6?fm=jpg&q=40&w=24&blur=200&fit=crop&crop=entropy"
ls -la apps/web/public/hero/conference-floor-blur.jpg
```

Expected: file exists, size under 2KB.

- [ ] **Step 1.6: Verify all four files load via the dev server**

```bash
curl -s -o /dev/null -w "AVIF:%{http_code} %{size_download}b\n" "http://localhost:3000/hero/conference-floor-2400.avif"
curl -s -o /dev/null -w "WEBP:%{http_code} %{size_download}b\n" "http://localhost:3000/hero/conference-floor-1600.webp"
curl -s -o /dev/null -w "JPG: %{http_code} %{size_download}b\n" "http://localhost:3000/hero/conference-floor-1200.jpg"
curl -s -o /dev/null -w "LQIP:%{http_code} %{size_download}b\n" "http://localhost:3000/hero/conference-floor-blur.jpg"
```

Expected: each line shows `200` and a non-zero byte count matching the file size.

- [ ] **Step 1.7: Commit**

```bash
git add apps/web/public/hero/
git commit -m "feat(hero): add self-hosted photo assets (AVIF + WebP + JPEG + LQIP)"
```

---

## Task 2: Add CSS keyframes for Ken Burns and notification slide-in

**Files:**
- Modify: `apps/web/src/app/globals.css` (append to the existing `Animations` section around line 152)

- [ ] **Step 2.1: Append `kenBurns` and `notifSlideIn` keyframes plus utility classes**

Open `apps/web/src/app/globals.css`. Find the existing block:

```css
.animate-pulse-ring {
  animation: pulseRing 1.8s cubic-bezier(0.2,0.8,0.2,1) infinite;
}
```

Immediately after it (still inside the Animations comment-block region, before the `Utilities` block at line 170), append:

```css
@keyframes kenBurns {
  0%   { transform: scale(1) translate(0, 0); }
  100% { transform: scale(1.03) translate(-1%, -0.5%); }
}
@keyframes notifSlideIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-ken-burns {
  animation: kenBurns 24s ease-in-out infinite alternate;
  transform-origin: 50% 40%;
  will-change: transform;
}
.animate-notif-slide-in {
  opacity: 0;
  animation: notifSlideIn 0.5s ease-out 1.2s forwards;
}

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

- [ ] **Step 2.2: Verify the dev server hot-reloaded with no CSS errors**

In the existing dev-server log (`/tmp/dev-server.log`):

```bash
tail -20 /tmp/dev-server.log | grep -i "error\|warn" || echo "no errors"
```

Expected: `no errors` (or only unrelated warnings; nothing matching `globals.css`).

- [ ] **Step 2.3: Visual sanity check — open landing page, confirm no regression**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: page loads, no new console errors. (The keyframes are inert until a class uses them.)

- [ ] **Step 2.4: Commit**

```bash
git add apps/web/src/app/globals.css
git commit -m "feat(hero): add kenBurns and notifSlideIn keyframes + reduced-motion guard"
```

---

## Task 3: Create `HeroBackground` component

**Files:**
- Create: `apps/web/src/components/hero/HeroBackground.tsx`

This component owns the photo, the gradient overlay, the noise texture, and the ambient radial glows. It does NOT own the headline or any text content.

- [ ] **Step 3.1: Create the directory**

```bash
mkdir -p apps/web/src/components/hero
ls apps/web/src/components/hero
```

Expected: empty directory listing.

- [ ] **Step 3.2: Write the component**

Create `apps/web/src/components/hero/HeroBackground.tsx`:

```tsx
export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/hero/conference-floor-blur.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "50% 40%",
          filter: "blur(20px)",
          transform: "scale(1.1)",
        }}
      />

      <picture>
        <source type="image/avif" srcSet="/hero/conference-floor-2400.avif" />
        <source type="image/webp" srcSet="/hero/conference-floor-1600.webp" />
        <img
          src="/hero/conference-floor-1200.jpg"
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
          style={{ objectPosition: "50% 40%" }}
        />
      </picture>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,27,75,0.7) 50%, rgba(15,23,42,0.6) 100%)",
        }}
      />

      <div className="absolute top-[10%] left-[5%] h-[300px] w-[300px] rounded-full bg-indigo-600/4 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] h-[250px] w-[250px] rounded-full bg-violet-600/3 blur-[70px] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 3.3: Mount it temporarily to verify it renders**

Open `apps/web/src/components/Hero.tsx` and at the top of the JSX in the `return`, **temporarily** add the import and replace `<NetworkAnimation />` with `<HeroBackground />`:

Add to the top of the file:
```tsx
import { HeroBackground } from "./hero/HeroBackground";
```

In the JSX, replace:
```tsx
<NetworkAnimation />
```
with:
```tsx
<HeroBackground />
```

(The `NetworkAnimation` import line stays for now — Task 5 cleans it up.)

- [ ] **Step 3.4: Visually verify the photo renders**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "hero-bg-step3.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: screenshot shows the conference-floor photo with dark gradient overlay behind the existing headline. No console errors. No 404 on the image paths.

- [ ] **Step 3.5: Verify the modern format actually loads**

```js
mcp__plugin_playwright_playwright__browser_network_requests()
```

Expected: a request for `/hero/conference-floor-2400.avif` (or `.webp` on browsers without AVIF support) returns 200. The `.jpg` fallback should NOT appear in requests on Chromium-based browsers.

- [ ] **Step 3.6: Commit**

```bash
git add apps/web/src/components/hero/HeroBackground.tsx apps/web/src/components/Hero.tsx
git commit -m "feat(hero): add HeroBackground component (photo + Ken Burns + overlay)"
```

---

## Task 4: Create `HeroPhonePreview` component

**Files:**
- Create: `apps/web/src/components/hero/HeroPhonePreview.tsx`

The phone shows two notification cards. Card 1 is visible immediately; card 2 slides in 1.2s after page load (via the `animate-notif-slide-in` utility added in Task 2). No JavaScript is required.

- [ ] **Step 4.1: Write the component**

Create `apps/web/src/components/hero/HeroPhonePreview.tsx`:

```tsx
export function HeroPhonePreview() {
  return (
    <div
      className="relative w-[200px] sm:w-[220px] lg:w-[260px] mx-auto lg:mx-0 lg:rotate-2"
      aria-hidden="true"
    >
      <div className="relative rounded-[32px] border-[10px] border-slate-800 bg-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]">
        <div
          className="rounded-[20px] p-4 sm:p-5"
          style={{
            background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
            minHeight: 360,
          }}
        >
          <div className="w-12 h-1.5 rounded-full bg-black/40 mx-auto mb-4" />

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 mb-3">
            <div className="flex items-start gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
                VP
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-tight">
                  Vikram Patel
                </p>
                <p className="text-[10px] text-white/60 leading-tight">
                  wants to connect · 2m ago
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/70 italic mb-2 leading-snug">
              &ldquo;Loved your talk on cloud architecture&rdquo;
            </p>
            <span className="inline-block text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              +1 mutual · TechSummit Bengaluru
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 animate-notif-slide-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">✨</span>
              <p className="text-xs font-semibold text-white leading-tight">
                Smart match · 92% relevance
              </p>
            </div>
            <p className="text-[11px] text-white/70 leading-snug mb-1.5">
              Meet 4 people aligned to your services
            </p>
            <p className="text-[10px] text-indigo-300 font-medium">
              View matches →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4.2: Mount it temporarily for a quick visual check**

Open `apps/web/src/components/Hero.tsx`. Add to the imports:
```tsx
import { HeroPhonePreview } from "./hero/HeroPhonePreview";
```

Inside the `<div className="text-center max-w-4xl mx-auto">` block, **temporarily** add at the very end (after the stats grid but before the closing `</div>`):
```tsx
<div className="mt-10 flex justify-center">
  <HeroPhonePreview />
</div>
```

This is throw-away wiring — Task 5 deletes the old structure entirely. The point is to confirm the component renders and the slide-in fires.

- [ ] **Step 4.3: Visually verify the phone renders and the second notification slides in**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 2 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "hero-phone-step4.png" })
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: screenshot shows the phone mockup below the existing stats grid. Both notification cards are visible. No console errors.

- [ ] **Step 4.4: Verify reduced-motion doesn't break the second card**

```js
mcp__plugin_playwright_playwright__browser_run_code_unsafe({
  code: "Object.defineProperty(window, 'matchMedia', { value: (q) => ({ matches: q.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {} }) })"
})
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "hero-phone-reduced-motion.png" })
```

Expected: both notification cards visible immediately (the CSS `prefers-reduced-motion: reduce` rule sets `opacity: 1` on the slide-in card, so it doesn't stay invisible).

- [ ] **Step 4.5: Commit**

```bash
git add apps/web/src/components/hero/HeroPhonePreview.tsx apps/web/src/components/Hero.tsx
git commit -m "feat(hero): add HeroPhonePreview component (phone + 2 notifications)"
```

---

## Task 5: Restructure `Hero.tsx` and delete `NetworkAnimation`

**Files:**
- Modify: `apps/web/src/components/Hero.tsx` (full rewrite)
- Delete: `apps/web/src/components/NetworkAnimation.tsx`

This task collapses the temporary scaffolding from Tasks 3 and 4 into the final layout: two-column desktop, single-column mobile, no stats grid, no canvas import, no wave divider.

- [ ] **Step 5.1: Replace `Hero.tsx` with the final version**

Overwrite `apps/web/src/components/Hero.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { HeroBackground } from "./hero/HeroBackground";
import { HeroPhonePreview } from "./hero/HeroPhonePreview";

export default function Hero() {
  return (
    <section className="relative min-h-[640px] lg:min-h-[680px] flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
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
                <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-blue-300 bg-clip-text text-transparent animate-gradient">
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
                      <stop stopColor="#818cf8" />
                      <stop offset="0.5" stopColor="#c4b5fd" />
                      <stop offset="1" stopColor="#93c5fd" />
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

            <div
              className="animate-in mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start"
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
            <div className="hidden lg:inline-flex items-center gap-2 rounded-full bg-white/8 backdrop-blur-sm border border-white/10 px-4 py-1.5 text-xs text-white/80">
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

Note the changes from the current file:
- Removed `import dynamic from "next/dynamic"` and the `NetworkAnimation` dynamic import
- Removed the inline ambient-glow / noise-texture divs (now inside `HeroBackground`)
- Removed the bottom wave-divider SVG (replaced by the linear fade inside `HeroBackground`)
- Removed the 3-stat grid block
- New two-column grid wrapping the existing copy + a new right column

- [ ] **Step 5.2: Verify nothing imports `NetworkAnimation` anymore**

```bash
grep -rn "NetworkAnimation" apps/web/src/ || echo "no references"
```

Expected: `no references`.

- [ ] **Step 5.3: Delete the now-orphan `NetworkAnimation.tsx`**

```bash
rm apps/web/src/components/NetworkAnimation.tsx
ls apps/web/src/components/NetworkAnimation.tsx 2>&1 | head -1
```

Expected: error like `cannot access ... No such file or directory`.

- [ ] **Step 5.4: TypeScript / lint check**

```bash
cd apps/web && npx tsc --noEmit 2>&1 | tail -20
```

Expected: zero errors. If any errors mention `NetworkAnimation` or `Hero`, fix them — likely a forgotten import.

- [ ] **Step 5.5: Visual check at desktop, tablet, mobile**

```js
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "hero-final-desktop.png" })

mcp__plugin_playwright_playwright__browser_resize({ width: 768, height: 1024 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "hero-final-tablet.png" })

mcp__plugin_playwright_playwright__browser_resize({ width: 390, height: 844 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "hero-final-mobile.png" })
```

Expected:
- **Desktop (1440):** photo background, two columns. Headline + CTAs left-aligned on the left half. Phone tilted on the right with both notification cards visible after ~1.2s. Live-status pill below phone bottom-right.
- **Tablet (768):** single column. Phone centered below CTA buttons. No live-status pill.
- **Mobile (390):** single column, smaller phone (~200px wide), no rotation, no live-status pill.

- [ ] **Step 5.6: Console clean check**

```js
mcp__plugin_playwright_playwright__browser_console_messages({ onlyErrors: true })
```

Expected: no errors. Warnings are acceptable as long as they're not new.

- [ ] **Step 5.7: Commit**

```bash
git add apps/web/src/components/Hero.tsx
git rm apps/web/src/components/NetworkAnimation.tsx
git commit -m "feat(hero): two-column layout, drop canvas + stats grid"
```

---

## Task 6: Final verification — performance, accessibility, regression

This task verifies the spec's success criteria are actually met before declaring done. No code changes expected unless verification fails.

- [ ] **Step 6.1: Confirm zero CLS and acceptable LCP**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_run_code_unsafe({
  code: `
    new Promise((resolve) => {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        resolve({ lcp_ms: last.renderTime || last.loadTime, element: last.element?.tagName });
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      setTimeout(() => resolve({ lcp_ms: null, note: 'no LCP entry within 5s' }), 5000);
    });
  `
})
```

Expected: `lcp_ms` under 2500ms (target 1500ms but be lenient on dev mode); `element` should be `IMG` or `H1`. If LCP is the H1, that's fine — the photo loaded fast enough that the headline became the LCP.

```js
mcp__plugin_playwright_playwright__browser_run_code_unsafe({
  code: `
    new Promise((resolve) => {
      let cls = 0;
      const obs = new PerformanceObserver((list) => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) cls += e.value;
      });
      obs.observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => resolve({ cls }), 3000);
    });
  `
})
```

Expected: `cls` very close to 0 (anything under 0.1 is acceptable). If higher, the phone or image is causing layout shift — most likely the image needs explicit `width`/`height` attributes; add them to `HeroBackground.tsx`.

- [ ] **Step 6.2: Confirm modern image format is used**

```js
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_network_requests()
```

Expected: among requests, exactly one of `conference-floor-2400.avif` or `conference-floor-1600.webp` returned 200, NOT the `.jpg` (Chromium supports both). The LQIP `conference-floor-blur.jpg` may also load — that's expected.

- [ ] **Step 6.3: Confirm reduced-motion support**

```js
mcp__plugin_playwright_playwright__browser_run_code_unsafe({
  code: "document.documentElement.style.setProperty('--motion-test', 'true'); window.matchMedia = (q) => ({ matches: q.includes('reduce'), addEventListener: () => {}, removeEventListener: () => {} });"
})
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_run_code_unsafe({
  code: `
    const img = document.querySelector('section img.animate-ken-burns');
    const computed = window.getComputedStyle(img);
    return { animationName: computed.animationName, animationPlayState: computed.animationPlayState };
  `
})
```

Expected: with the actual OS-level `prefers-reduced-motion: reduce` set, `animationName` should be `none`. (The `matchMedia` override above only affects JS reads, not the CSS rule — the CSS rule still relies on the actual user setting. If you can toggle DevTools "Emulate CSS prefers-reduced-motion: reduce" via Chromium DevTools protocol, that's a more authoritative test.)

If you cannot toggle it via Playwright MCP, manually verify in a browser DevTools session at the end of the task and note the result.

- [ ] **Step 6.4: Confirm no stale file references**

```bash
grep -rn "NetworkAnimation\|conference-floor" apps/web/src/ apps/web/public/ 2>&1 | grep -v "public/hero/" || echo "no stale references"
```

Expected: `no stale references` (or only matches inside `apps/web/public/hero/` which is the asset directory itself).

- [ ] **Step 6.5: Confirm landing page loads under load test**

```bash
for i in 1 2 3 4 5; do
  curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" http://localhost:3000
done
```

Expected: each row shows `200` and a time under 2 seconds (dev mode is slow; production would be much faster).

- [ ] **Step 6.6: Run a final desktop screenshot for the record**

```js
mcp__plugin_playwright_playwright__browser_resize({ width: 1440, height: 900 })
mcp__plugin_playwright_playwright__browser_navigate({ url: "http://localhost:3000" })
mcp__plugin_playwright_playwright__browser_wait_for({ time: 2 })
mcp__plugin_playwright_playwright__browser_take_screenshot({ filename: "hero-final-record.png" })
```

This screenshot is for the implementation summary. Save the file path in the final commit message.

- [ ] **Step 6.7: Final summary commit (only if any tweaks were applied during verification)**

If Steps 6.1–6.5 surfaced no issues, no commit needed — the previous commits already represent the final state. If you applied a fix (e.g., explicit `width`/`height` on the image to clear CLS), commit it:

```bash
git add -A
git commit -m "fix(hero): <one-line description of the verification fix>"
```

---

## Self-Review

**Spec coverage:**
- ✅ Replace `NetworkAnimation` (canvas) with `HeroBackground` (photo) → Tasks 1, 3, 5
- ✅ Two-column desktop layout, single-column mobile → Task 5 (Step 5.1, 5.5)
- ✅ Self-hosted assets, AVIF + WebP + JPEG → Task 1
- ✅ Ken Burns + notifSlideIn keyframes + reduced-motion guard → Task 2
- ✅ HeroBackground component (~50 lines) → Task 3
- ✅ HeroPhonePreview component (~90 lines) → Task 4
- ✅ Restructured Hero.tsx (~70 lines, two-col, no stats grid, no wave) → Task 5
- ✅ NetworkAnimation deleted → Task 5 (Step 5.3)
- ✅ Live-status pill (desktop only, dummy 1,284) → Task 5 (Step 5.1)
- ✅ Performance budget (LCP, CLS) verified → Task 6 (Step 6.1)
- ✅ Accessibility (aria-hidden, reduced-motion) verified → Task 6 (Step 6.3) + components themselves
- ✅ Visual smoke test at desktop/tablet/mobile → Task 5 (Step 5.5)

**Placeholder scan:** no TBD/TODO/"implement later". Each step has concrete commands, file paths, complete code blocks, and explicit expected outcomes.

**Type/name consistency:** component names (`HeroBackground`, `HeroPhonePreview`, default-exported `Hero`), file paths (`apps/web/src/components/hero/*`), asset filenames (`conference-floor-2400.avif` etc.), and CSS utility names (`animate-ken-burns`, `animate-notif-slide-in`) are consistent across all six tasks.

Plan is ready for execution.
