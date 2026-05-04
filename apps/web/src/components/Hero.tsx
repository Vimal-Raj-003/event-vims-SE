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
