"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hero background slideshow.
 *
 * Cycles through 4 networking/conference scenes with a smooth 1.5s crossfade
 * every 7s. Each slide carries an independent Ken Burns animation so even a
 * static-looking photo feels alive while it's on screen.
 *
 * Reliability:
 *   - Slide 0 is the existing local asset — guaranteed to load offline.
 *   - Slides 1-3 are CDN photos (Unsplash images.unsplash.com). If any fail
 *     to load, the slideshow simply skips that index — the user never sees a
 *     broken image or a frozen carousel.
 *   - The blur fallback layer is always rendered underneath so first paint
 *     never shows a blank canvas.
 *
 * Visual layer order (back → front):
 *   1. Blurred backdrop (always visible)
 *   2. Slide images (only the active one is fully opaque)
 *   3. Diagonal gradient tint (preserves text contrast for the hero copy)
 *   4. Soft accent orbs (indigo + violet) for depth
 *   5. Subtle film grain
 *   6. Bottom fade into the page background
 */

interface Slide {
  src: string;
  /** CSS object-position so the most flattering crop is visible */
  position: string;
  /** Which Ken Burns variant to apply on this slide (alternating zoom in/out, pan) */
  motion: "zoom-in" | "zoom-out" | "pan-right" | "pan-left";
  /** Optional preferred sources for higher quality (only meaningful for local asset) */
  avif?: string;
  webp?: string;
}

/* Pool of 8 networking / conference / connection scenes.
 * On every page refresh the slideshow randomly picks 4 of these and
 * randomises their order, so the hero never looks the same twice in a row. */
const SLIDE_POOL: Slide[] = [
  {
    // Local conference floor — guaranteed to load even offline
    src: "/hero/conference-floor-1200.jpg",
    avif: "/hero/conference-floor-2400.avif",
    webp: "/hero/conference-floor-1600.webp",
    position: "50% 40%",
    motion: "zoom-in",
  },
  {
    // Networking event — people in conversation
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2400&q=85",
    position: "50% 30%",
    motion: "zoom-out",
  },
  {
    // Conference attendees — wider room shot
    src: "https://images.unsplash.com/photo-1591115765373-5207764f72e4?auto=format&fit=crop&w=2400&q=85",
    position: "50% 50%",
    motion: "pan-right",
  },
  {
    // Business networking handshake
    src: "https://images.unsplash.com/photo-1559223607-a43c990c692c?auto=format&fit=crop&w=2400&q=85",
    position: "50% 35%",
    motion: "pan-left",
  },
  {
    // Audience listening to speaker — conference hall
    src: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=2400&q=85",
    position: "50% 40%",
    motion: "zoom-in",
  },
  {
    // Speaker on stage — engagement moment
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=2400&q=85",
    position: "50% 35%",
    motion: "zoom-out",
  },
  {
    // Group networking — tech meetup
    src: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&w=2400&q=85",
    position: "50% 40%",
    motion: "pan-right",
  },
  {
    // Modern conference hall with attendees mingling
    src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=2400&q=85",
    position: "50% 45%",
    motion: "pan-left",
  },
];

const SLIDES_PER_SHOW = 4;
// Industry-standard hero-slideshow cadence (B2B/SaaS landing pages):
//   - 6s per slide gives users time to read the hero copy without rushing.
//   - 1.5s crossfade is the smooth, premium feel used by Stripe / Apple / Linear.
const SLIDE_DURATION_MS = 6000;
const CROSSFADE_MS = 1500;
const BLUR_PLACEHOLDER = "/hero/conference-floor-blur.jpg";

/**
 * Fisher-Yates shuffle (in-place on a copy). Returns a new shuffled array.
 * Used only inside useEffect so SSR / hydration are unaffected.
 */
function shuffleSlides(arr: Slide[]): Slide[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i]!;
    a[i] = a[j]!;
    a[j] = tmp;
  }
  return a;
}

/* Deterministic initial set used only for first paint / SSR.
 * Replaced on the client immediately after mount with a randomised selection. */
const INITIAL_SLIDES: Slide[] = SLIDE_POOL.slice(0, SLIDES_PER_SHOW);

export function HeroBackground() {
  // Slides start as a deterministic subset for SSR safety, then get shuffled
  // immediately on the client after mount — different selection per refresh.
  const [slides, setSlides] = useState<Slide[]>(INITIAL_SLIDES);
  const [activeIdx, setActiveIdx] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(() =>
    INITIAL_SLIDES.map((s) => s.src.startsWith("/")),
  );
  const reducedMotionRef = useRef(false);

  // After mount: shuffle pool, pick 4, start at a random index.
  // Math.random must NOT run during render (would mismatch SSR), so it lives here.
  useEffect(() => {
    const shuffled = shuffleSlides(SLIDE_POOL).slice(0, SLIDES_PER_SHOW);
    setSlides(shuffled);
    setLoaded(shuffled.map((s) => s.src.startsWith("/")));
    setActiveIdx(Math.floor(Math.random() * shuffled.length));
  }, []);

  // Capture prefers-reduced-motion so we can freeze the slideshow if requested.
  useEffect(() => {
    if (typeof window === "undefined") return;
    reducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Auto-advance, skipping any slide that hasn't loaded yet.
  useEffect(() => {
    if (reducedMotionRef.current) return;

    const id = setInterval(() => {
      setActiveIdx((prev) => {
        let next = (prev + 1) % slides.length;
        for (let i = 0; i < slides.length; i++) {
          if (loaded[next]) return next;
          next = (next + 1) % slides.length;
        }
        return prev;
      });
    }, SLIDE_DURATION_MS);
    return () => clearInterval(id);
  }, [loaded, slides.length]);

  const markLoaded = (idx: number, success: boolean) => {
    setLoaded((prev) => {
      if (prev[idx] === success) return prev;
      const next = [...prev];
      next[idx] = success;
      return next;
    });
  };

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      {/* Layer 1 — blurred backdrop, always visible (no flash of empty canvas) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${BLUR_PLACEHOLDER})`,
          backgroundSize: "cover",
          backgroundPosition: "50% 40%",
          filter: "blur(20px)",
          transform: "scale(1.1)",
        }}
      />

      {/* Layer 2 — slides stacked, only active is opaque */}
      {slides.map((slide, idx) => {
        const isActive = idx === activeIdx && loaded[idx];
        const isLocalAsset = !!(slide.avif && slide.webp);
        const isPrimary = idx === 0; // primary slide gets eager priority
        const motionClass =
          slide.motion === "zoom-in"
            ? "animate-hero-zoom-in"
            : slide.motion === "zoom-out"
              ? "animate-hero-zoom-out"
              : slide.motion === "pan-right"
                ? "animate-hero-pan-right"
                : "animate-hero-pan-left";

        // alt="" is set explicitly on each <img> below so the
        // jsx-a11y/alt-text lint rule (which doesn't follow spreads) passes.
        const sharedImgProps = {
          decoding: "async" as const,
          onLoad: () => markLoaded(idx, true),
          onError: () => markLoaded(idx, false),
          className: `absolute inset-0 w-full h-full object-cover ${motionClass}`,
          style: {
            objectPosition: slide.position,
            opacity: isActive ? 1 : 0,
            transition: `opacity ${CROSSFADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            willChange: "opacity, transform" as const,
          },
        };

        // Local asset uses <picture> for AVIF/WebP — works at any shuffled position
        if (isLocalAsset) {
          return (
            <picture key={`${slide.src}-${idx}`}>
              <source type="image/avif" srcSet={slide.avif} />
              <source type="image/webp" srcSet={slide.webp} />
              <img
                src={slide.src}
                alt=""
                loading={isPrimary ? "eager" : "lazy"}
                fetchPriority={isPrimary ? "high" : "auto"}
                {...sharedImgProps}
              />
            </picture>
          );
        }

        return (
          <img
            key={`${slide.src}-${idx}`}
            src={slide.src}
            alt=""
            loading={isPrimary ? "eager" : "lazy"}
            fetchPriority={isPrimary ? "high" : "auto"}
            crossOrigin="anonymous"
            {...sharedImgProps}
          />
        );
      })}

      {/* Layer 3 — diagonal gradient tint (text contrast guard) */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,27,75,0.7) 50%, rgba(15,23,42,0.6) 100%)",
        }}
      />

      {/* Layer 4 — soft accent orbs */}
      <div className="absolute top-[10%] left-[5%] h-[300px] w-[300px] rounded-full bg-indigo-600/[0.04] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] h-[250px] w-[250px] rounded-full bg-violet-600/[0.03] blur-[70px] pointer-events-none" />

      {/* Layer 5 — fine film grain */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      {/* Layer 6 — bottom fade into page background */}
      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-b from-transparent to-background pointer-events-none" />

      {/* Slide indicators (visible on lg+ for clarity, no buttons — pure decoration) */}
      <div className="hidden lg:flex absolute bottom-6 right-6 z-10 items-center gap-1.5">
        {slides.map((_, idx) => (
          <span
            key={idx}
            className={`block h-1 rounded-full transition-all duration-500 ${
              idx === activeIdx ? "w-7 bg-white/70" : "w-1.5 bg-white/25"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
