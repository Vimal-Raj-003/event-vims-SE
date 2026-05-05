"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type Role = "organiser" | "attendee" | "super-admin";
type Flow = "login" | "signup" | "verify" | "register";

function parseContext(pathname: string): { role: Role; flow: Flow } {
  // Examples: /auth/organiser/login, /auth/attendee/verify, /auth/super-admin/login
  const parts = pathname.split("/").filter(Boolean);
  const idx = parts.indexOf("auth");
  const role = (parts[idx + 1] as Role) ?? "organiser";
  const flow = (parts[idx + 2] as Flow) ?? "login";
  return { role, flow };
}

interface PanelContent {
  eyebrow: string;
  headline: ReactNode;
  body: string;
  testimonial?: {
    quote: string;
    author: string;
    title: string;
    initials: string;
  };
  features: { icon: ReactNode; text: string }[];
  proofLabel: string;
  proofValue: string;
}

const ICON_BOLT = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);
const ICON_CHART = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);
const ICON_SHIELD = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
  </svg>
);
const ICON_QR = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
  </svg>
);
const ICON_PHONE = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
  </svg>
);
const ICON_SPARKLES = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
  </svg>
);
const ICON_LOCK = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
);
const ICON_DOWNLOAD = (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

function getPanelContent(role: Role, flow: Flow): PanelContent {
  if (role === "super-admin") {
    return {
      eyebrow: "Platform control",
      headline: (
        <>
          Welcome, <span className="text-emerald-300">admin.</span>
        </>
      ),
      body: "Restricted access. All actions are logged for audit and compliance.",
      features: [
        { icon: ICON_SHIELD, text: "All access events are signed and timestamped" },
        { icon: ICON_LOCK, text: "Multi-factor authentication enforced" },
        { icon: ICON_CHART, text: "Real-time platform health and usage metrics" },
      ],
      proofLabel: "Audit log entries this month",
      proofValue: "12,480",
    };
  }

  if (role === "attendee") {
    if (flow === "verify") {
      return {
        eyebrow: "Almost there",
        headline: (
          <>
            One-time code, <span className="text-emerald-300">no password</span> to remember.
          </>
        ),
        body: "We sent a 6-digit code to your inbox. It expires in 10 minutes for your security.",
        features: [
          { icon: ICON_LOCK, text: "Codes expire after 10 minutes" },
          { icon: ICON_SHIELD, text: "Your phone and email stay private until you connect" },
          { icon: ICON_PHONE, text: "Works in any browser. No app to install." },
        ],
        proofLabel: "Average sign-in time",
        proofValue: "under 30 seconds",
      };
    }
    return {
      eyebrow: "For attendees",
      headline: (
        <>
          Network smarter, <span className="text-emerald-300">not harder.</span>
        </>
      ),
      body: "Skip the small talk. VIMS shows you who's worth meeting and helps you remember every connection.",
      testimonial: {
        quote:
          "I left TechSummit with 14 saved connections and zero paper cards. The smart matches saved me hours of guessing who to talk to.",
        author: "Arjun Mehta",
        title: "Solutions Architect, Bengaluru",
        initials: "AM",
      },
      features: [
        { icon: ICON_QR, text: "One-scan QR exchange. No app needed." },
        { icon: ICON_SPARKLES, text: "Smart matches based on your profile and goals" },
        { icon: ICON_DOWNLOAD, text: "Walk out with a clean address book (vCard or CSV)" },
      ],
      proofLabel: "Connections made today",
      proofValue: "1,284",
    };
  }

  // Organiser
  if (flow === "signup") {
    return {
      eyebrow: "For organisers",
      headline: (
        <>
          Run events that <span className="text-emerald-300">pay back.</span>
        </>
      ),
      body: "Set up your first event in under 5 minutes. Free during beta. Cancel any time.",
      testimonial: {
        quote:
          "VIMS Events transformed our conference. Attendees made 3x more connections, and every one was meaningful.",
        author: "Priya Sharma",
        title: "VP Events, TechConnect India",
        initials: "PS",
      },
      features: [
        { icon: ICON_BOLT, text: "Set up in under 5 minutes" },
        { icon: ICON_CHART, text: "Real-time live analytics for sponsors" },
        { icon: ICON_SHIELD, text: "Privacy-first, DPDP compliant by default" },
      ],
      proofLabel: "Events hosted on VIMS",
      proofValue: "2,100+",
    };
  }
  if (flow === "verify") {
    return {
      eyebrow: "One last step",
      headline: (
        <>
          Verify your email to <span className="text-emerald-300">unlock</span> your dashboard.
        </>
      ),
      body: "We sent a verification link. Open it from the same device, or paste the link into your browser.",
      features: [
        { icon: ICON_LOCK, text: "Verification links expire after 24 hours" },
        { icon: ICON_SHIELD, text: "Your data is encrypted at rest and in transit" },
        { icon: ICON_BOLT, text: "Resend the link any time if you missed it" },
      ],
      proofLabel: "Average verification time",
      proofValue: "under 60 seconds",
    };
  }
  // organiser login
  return {
    eyebrow: "Welcome back",
    headline: (
      <>
        Your events, <span className="text-emerald-300">live ROI</span>, all in one place.
      </>
    ),
    body: "Pick up where you left off. Track who's networking, what's working, and what to do next.",
    testimonial: {
      quote:
        "VIMS Events transformed our conference. Attendees made 3x more connections, and every one was meaningful.",
      author: "Priya Sharma",
      title: "VP Events, TechConnect India",
      initials: "PS",
    },
    features: [
      { icon: ICON_CHART, text: "Real-time analytics from the moment your event opens" },
      { icon: ICON_BOLT, text: "Push announcements to every attendee in seconds" },
      { icon: ICON_DOWNLOAD, text: "Export attendees, connections, and engagement to Excel" },
    ],
    proofLabel: "Connections logged this month",
    proofValue: "180,000+",
  };
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "/auth/organiser/login";
  const { role, flow } = parseContext(pathname);
  const content = getPanelContent(role, flow);

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — Form panel (UNCHANGED) */}
      <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10 group w-fit">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-md shadow-primary/30 transition-transform duration-200 group-hover:scale-105">
              <Image src="/logo.png" alt="VIMS Events" fill className="object-cover" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              VIMS <span className="text-primary">Events</span>
            </span>
          </Link>
          {children}
        </div>
      </div>

      {/* Right — Visual panel (route-aware, no duplicate logo) */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-12 overflow-hidden relative">
        {/* Orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute top-16 right-8 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl" />
          <div
            className="animate-blob absolute bottom-16 left-8 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
            style={{ animationDelay: "3s" }}
          />
        </div>

        {/* Eyebrow + headline */}
        <div className="relative z-10">
          <span className="inline-block rounded-full bg-white/10 border border-white/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/80">
            {content.eyebrow}
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white text-balance">
            {content.headline}
          </h2>
          <p className="mt-3 text-sm text-white/65 leading-relaxed max-w-md">
            {content.body}
          </p>
        </div>

        {/* Testimonial (only when present) — otherwise leaves space for headline to breathe */}
        {content.testimonial ? (
          <blockquote className="relative z-10">
            <div className="flex gap-0.5 mb-3">
              {[1, 2, 3, 4, 5].map((s) => (
                <svg key={s} className="h-3.5 w-3.5 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              ))}
            </div>
            <p className="text-base font-medium text-white/90 leading-relaxed">
              &ldquo;{content.testimonial.quote}&rdquo;
            </p>
            <footer className="mt-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white shadow-md">
                {content.testimonial.initials}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{content.testimonial.author}</p>
                <p className="text-xs text-white/50">{content.testimonial.title}</p>
              </div>
            </footer>
          </blockquote>
        ) : (
          <div aria-hidden="true" />
        )}

        {/* Feature chips */}
        <div className="relative z-10 space-y-2.5">
          {content.features.map((f, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-2xl bg-white/[0.06] border border-white/10 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/10"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300">
                {f.icon}
              </span>
              <span className="text-sm font-medium text-white/85">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom proof — shows live count for attendee/organiser, audit for super-admin */}
        <div className="relative z-10 flex items-center gap-3">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          <p className="text-xs text-white/55">
            <span className="text-white font-bold tabular-nums">{content.proofValue}</span>{" "}
            <span className="text-white/45">·</span> {content.proofLabel}
          </p>
        </div>
      </div>
    </div>
  );
}
