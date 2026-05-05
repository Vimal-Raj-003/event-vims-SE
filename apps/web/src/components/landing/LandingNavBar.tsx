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
