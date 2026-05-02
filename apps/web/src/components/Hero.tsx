"use client";

import Link from "next/link";
import dynamic from "next/dynamic";

const NetworkAnimation = dynamic(
  () => import("./NetworkAnimation").then((m) => m.NetworkAnimation),
  { ssr: false }
);

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
      {/* Networking animation */}
      <NetworkAnimation />

      {/* Ambient radial glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-[10%] left-[5%] h-[300px] w-[300px] rounded-full bg-indigo-600/8 blur-[80px]" />
        <div className="absolute bottom-[15%] right-[10%] h-[250px] w-[250px] rounded-full bg-violet-600/6 blur-[70px]" />
        {/* Noise texture */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 sm:py-36 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Beta badge */}
          <div className="animate-in inline-flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-5 py-2 text-sm text-emerald-300 backdrop-blur-sm mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-pulse-ring absolute inline-flex h-full w-full rounded-full bg-emerald-400" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            Beta Launch &middot; Completely Free to Start
          </div>

          {/* Headline */}
          <h1
            className="animate-in text-5xl font-extrabold text-white sm:text-6xl lg:text-7xl leading-[1.06] tracking-tight text-balance"
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
            className="animate-in mt-9 text-lg text-white/65 leading-relaxed max-w-2xl mx-auto sm:text-xl"
            style={{ animationDelay: "160ms" }}
          >
            The only event networking platform built for ROI. Track engagement,
            capture leads, and deliver quantifiable value to sponsors.
          </p>

          {/* CTAs */}
          <div
            className="animate-in mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5-5 5M6 12h12"
                />
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              See How It Works
            </a>
          </div>

          {/* Stats */}
          <div
            className="animate-in mt-14 grid grid-cols-3 gap-4 max-w-lg mx-auto sm:max-w-2xl sm:gap-6"
            style={{ animationDelay: "320ms" }}
          >
            {[
              { value: "5 min", label: "Event setup" },
              { value: "100%", label: "Free in beta" },
              { value: "0", label: "Paper cards" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5"
              >
                <p className="text-2xl font-black text-white sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-white/50 sm:text-sm">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg
          viewBox="0 0 1440 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full"
        >
          <path
            d="M0 40 Q360 80 720 40 Q1080 0 1440 40 L1440 80 L0 80 Z"
            fill="white"
          />
        </svg>
      </div>
    </section>
  );
}
