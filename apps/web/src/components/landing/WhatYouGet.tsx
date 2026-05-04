"use client";

import { useState, type ReactNode, type KeyboardEvent } from "react";

type Role = "organiser" | "attendee";

interface FeatureBlock {
  title: string;
  body: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  className: "h-5 w-5",
  fill: "none",
  viewBox: "0 0 24 24",
  stroke: "currentColor",
  strokeWidth: 1.75,
} as const;

const ORGANISER_BLOCKS: FeatureBlock[] = [
  {
    title: "5-minute event setup",
    body: "Wizard handles branding, registration fields, and networking rules in one pass. No drafts to revisit.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
  {
    title: "Real-time analytics",
    body: "Connections-per-hour, top connectors, drop-off, response times. Visible during the event, not after.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Custom branding",
    body: "Logo, colours, branded business cards. Match your event identity end-to-end.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
  },
  {
    title: "Excel export",
    body: "Four structured sheets: attendees, connections, engagement, audit log. Column-aligned to most CRMs.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  },
  {
    title: "Announcements",
    body: "Push messages to all attendees mid-event. SMS-grade urgency, no app download required.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.894.149c-.424.07-.764.383-.929.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.398.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.272-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    title: "DPDP compliant",
    body: "Consent capture, right to access, right to erasure. Built in, not retrofitted.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
      </svg>
    ),
  },
];

const ATTENDEE_BLOCKS: FeatureBlock[] = [
  {
    title: "No app needed",
    body: "Works in any mobile browser. Receive your event link, scan, done.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    ),
  },
  {
    title: "One-scan QR exchange",
    body: "Connect with anyone in the room in two seconds. Their vCard lands in your phone's contacts.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
  },
  {
    title: "Smart directory",
    body: "Search by name, company, industry, or interest. Filter to find the people who matter.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: "Privacy-first",
    body: "Phone and email only shared after both sides accept. Pause your profile any time.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    title: "Personal dashboard",
    body: "Every connection saved, every conversation noted. Follow up without losing context.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    title: "vCard / CSV export",
    body: "Walk out with a clean address book. No retyping, no lost cards.",
    icon: (
      <svg {...ICON_PROPS}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
      </svg>
    ),
  },
];

export function WhatYouGet() {
  const [role, setRole] = useState<Role>("organiser");
  const blocks = role === "organiser" ? ORGANISER_BLOCKS : ATTENDEE_BLOCKS;
  const accent = role === "organiser" ? "emerald" : "indigo";

  const handleTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setRole(role === "organiser" ? "attendee" : "organiser");
    }
  };

  return (
    <section className="relative bg-dark-section py-20 lg:py-28 overflow-hidden">
      <div
        className="pointer-events-none absolute -top-20 right-0 h-[300px] w-[300px] rounded-full bg-emerald-500/[0.04] blur-[100px] animate-glow-drift"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">
            What you get
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] text-balance mb-3">
            Built for both sides of the room
          </h2>
          <p className="text-base sm:text-lg text-white/55 leading-relaxed">
            Everything organisers need to run the event, everything attendees need to make it count.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Audience"
          className="hidden sm:flex border-b border-white/[0.08] mt-12 mb-8"
        >
          <button
            role="tab"
            aria-selected={role === "organiser"}
            aria-controls="features-panel"
            tabIndex={role === "organiser" ? 0 : -1}
            onClick={() => setRole("organiser")}
            onKeyDown={handleTabKey}
            className={`px-4 pb-3 text-sm font-semibold transition-colors -mb-px border-b-2 ${
              role === "organiser"
                ? "text-white border-emerald-400"
                : "text-white/40 hover:text-white/70 border-transparent"
            }`}
          >
            For Organisers
          </button>
          <button
            role="tab"
            aria-selected={role === "attendee"}
            aria-controls="features-panel"
            tabIndex={role === "attendee" ? 0 : -1}
            onClick={() => setRole("attendee")}
            onKeyDown={handleTabKey}
            className={`px-4 pb-3 text-sm font-semibold transition-colors -mb-px border-b-2 ${
              role === "attendee"
                ? "text-white border-indigo-400"
                : "text-white/40 hover:text-white/70 border-transparent"
            }`}
          >
            For Attendees
          </button>
        </div>

        <div role="tablist" aria-label="Audience" className="sm:hidden flex gap-2 mt-12 mb-8">
          <button
            role="tab"
            aria-selected={role === "organiser"}
            aria-controls="features-panel"
            onClick={() => setRole("organiser")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              role === "organiser" ? "bg-emerald-500 text-slate-950" : "bg-white/5 text-white/60"
            }`}
          >
            Organisers
          </button>
          <button
            role="tab"
            aria-selected={role === "attendee"}
            aria-controls="features-panel"
            onClick={() => setRole("attendee")}
            className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              role === "attendee" ? "bg-indigo-500 text-white" : "bg-white/5 text-white/60"
            }`}
          >
            Attendees
          </button>
        </div>

        <div
          id="features-panel"
          role="tabpanel"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5"
        >
          {blocks.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 hover:border-white/[0.15] hover:bg-white/[0.04] transition-colors"
            >
              <div
                className={`w-10 h-10 rounded-xl border flex items-center justify-center mb-5 ${
                  accent === "emerald"
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                }`}
              >
                {b.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{b.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          {/* TODO: ship full feature matrix in WS 4 or later */}
          <a
            href="/docs/features"
            className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Want to compare side-by-side? View the full feature matrix
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
}
