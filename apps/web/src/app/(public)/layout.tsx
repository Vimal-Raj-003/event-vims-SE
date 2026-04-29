"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Fragment } from "react";

const NAV_LINKS = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Features",     href: "/#features" },
  { label: "Pricing",      href: "/#pricing" },
];

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isAuth = pathname.startsWith("/auth");
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  /* Immediately check scroll position on mount to avoid flash */
  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 24);
    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, []);

  /* Close menu on route change */
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  /* Auth pages: no header/footer — just the split-screen form */
  if (isAuth) return <Fragment>{children}</Fragment>;

  const transparent = isHome && !scrolled;

  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          transparent
            ? "border-transparent bg-transparent"
            : "border-b border-white/10 bg-white/90 shadow-sm shadow-black/5 backdrop-blur-xl"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="relative h-9 w-9 overflow-hidden rounded-xl shadow-md shadow-primary/30 transition-transform duration-200 group-hover:scale-105">
              <Image src="/logo.png" alt="VIMS Events" fill className="object-cover" priority />
            </div>
            <span
              className={`text-lg font-extrabold tracking-tight transition-colors duration-300 drop-shadow-sm ${
                transparent ? "text-white" : "text-foreground"
              }`}
            >
              VIMS{" "}
              <span className={transparent ? "text-violet-300" : "text-primary"}>
                Events
              </span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-all duration-200 ${
                  transparent
                    ? "text-white/85 hover:text-white hover:bg-white/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/auth/organiser/login"
              className={`hidden sm:inline-flex rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                transparent
                  ? "text-white hover:bg-white/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              Log In
            </Link>

            <Link
              href="/auth/organiser/signup"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-md shadow-primary/30 transition-all duration-200 hover:scale-[1.03] hover:shadow-primary/50 hover:brightness-110 active:scale-[0.97]"
            >
              Get Started
              <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
              className={`md:hidden rounded-xl p-2 transition-colors duration-200 ${
                transparent ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                }
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            menuOpen ? "max-h-64 border-t border-white/10 bg-slate-900/95 backdrop-blur-xl" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-1 px-4 py-4">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-150"
              >
                {label}
              </a>
            ))}
            <Link
              href="/auth/organiser/login"
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 transition-colors duration-150"
            >
              Log In
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="flex-1">{children}</main>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-white">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

            {/* Brand */}
            <div className="lg:col-span-1">
              <Link href="/" className="flex items-center gap-2.5 group w-fit">
                <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-md shadow-primary/30 transition-transform group-hover:scale-105">
                  <Image src="/logo.png" alt="VIMS Events" fill className="object-cover" />
                </div>
                <span className="text-lg font-extrabold text-white tracking-tight">
                  VIMS <span className="text-violet-400">Events</span>
                </span>
              </Link>
              <p className="mt-4 text-sm text-slate-400 leading-relaxed max-w-xs">
                Smart networking for conferences, meetups, and corporate events. Replace paper cards with meaningful digital connections.
              </p>
              {/* Social links */}
              <div className="mt-5 flex items-center gap-3">
                {[
                  { label: "LinkedIn", path: "M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z M4 6a2 2 0 100-4 2 2 0 000 4z" },
                  { label: "Twitter", path: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" },
                  { label: "GitHub", path: "M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 00-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0020 4.77 5.07 5.07 0 0019.91 1S18.73.65 16 2.48a13.38 13.38 0 00-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 005 4.77a5.44 5.44 0 00-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 009 18.13V22" },
                ].map((s) => (
                  <a key={s.label} href="#" aria-label={s.label}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 transition-all duration-200 hover:bg-white/10 hover:text-white hover:scale-110">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Product</h4>
              <ul className="space-y-3">
                {["Features", "Pricing", "Security", "DPDP Compliance", "Changelog"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-150">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Company</h4>
              <ul className="space-y-3">
                {["About Us", "Contact", "Blog", "Careers", "Press Kit"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-150">{l}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-5">Legal</h4>
              <ul className="space-y-3">
                {["Privacy Policy", "Terms of Service", "Cookie Policy", "GDPR", "DPDP Act"].map((l) => (
                  <li key={l}>
                    <a href="#" className="text-sm text-slate-400 hover:text-white transition-colors duration-150">{l}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/8 pt-6 sm:flex-row">
            <p className="text-xs text-slate-500">
              © {new Date().getFullYear()} VIMS Enterprise Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-slate-500">
                All systems operational · Powered by{" "}
                <span className="text-violet-400 font-medium">VIMS Enterprise</span>
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
