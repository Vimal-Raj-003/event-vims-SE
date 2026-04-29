"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, type ReactNode } from "react";

/* ─── Scroll-reveal hook ────────────────────────────────────────── */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>(
      ".reveal, .reveal-left, .reveal-right"
    );
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function Section({ id, className = "", children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={`py-16 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}

export default function LandingPage() {
  useReveal();
  return (
    <div className="overflow-x-hidden">
      <HeroSection />
      <MissionBar />
      <HowItWorksSection />
      <FeaturesSection />
      <ForAttendeesSection />
      <ForOrganisersSection />
      <PricingSection />
      <CTASection />
    </div>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -top-32 -left-32 h-[520px] w-[520px] rounded-full bg-indigo-600/20 blur-[100px]" />
        <div className="animate-blob absolute top-1/3 -right-40 h-[480px] w-[480px] rounded-full bg-violet-600/20 blur-[100px]" style={{ animationDelay: "2.5s" }} />
        <div className="animate-blob absolute -bottom-24 left-1/3 h-[400px] w-[400px] rounded-full bg-blue-500/15 blur-[90px]" style={{ animationDelay: "5s" }} />
        {/* Noise texture */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
          }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
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
            Beta Launch · Completely Free to Start
          </div>

          {/* Headline */}
          <h1 className="animate-in text-5xl font-extrabold text-white sm:text-6xl lg:text-7xl leading-[1.06] tracking-tight text-balance" style={{ animationDelay: "80ms" }}>
            Event Networking{" "}
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-blue-300 bg-clip-text text-transparent animate-gradient">
                That Actually Works
              </span>
              {/* Animated draw-in underline */}
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

          <p className="animate-in mt-9 text-lg text-white/65 leading-relaxed max-w-2xl mx-auto sm:text-xl" style={{ animationDelay: "160ms" }}>
            Replace paper business cards with smart digital networking. Attendees connect instantly via QR codes, explore a live directory, and leave with real relationships — not forgotten contacts.
          </p>

          {/* CTAs */}
          <div className="animate-in mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center" style={{ animationDelay: "240ms" }}>
            <Link href="/auth/organiser/signup" className="btn-primary px-8 py-3.5 text-base shadow-xl shadow-primary/30">
              Start for Free
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </Link>
            <a href="#how-it-works" className="btn-ghost px-8 py-3.5 text-base">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
              See How It Works
            </a>
          </div>

          {/* Stats — startup-honest */}
          <div className="animate-in mt-14 grid grid-cols-3 gap-4 max-w-lg mx-auto sm:max-w-2xl sm:gap-6" style={{ animationDelay: "320ms" }}>
            {[
              { value: "5 min", label: "Event setup" },
              { value: "100%", label: "Free in beta" },
              { value: "0", label: "Paper cards" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/10 bg-white/6 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:-translate-y-0.5">
                <p className="text-2xl font-black text-white sm:text-3xl">{s.value}</p>
                <p className="mt-1 text-xs text-white/50 sm:text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Wave divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 40 Q360 80 720 40 Q1080 0 1440 40 L1440 80 L0 80 Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

/* ─── Mission bar (replaces fake logo bar) ──────────────────────── */
function MissionBar() {
  const pillars = [
    { icon: "⚡", text: "Set up in 5 minutes" },
    { icon: "🔒", text: "Privacy-first, DPDP compliant" },
    { icon: "📲", text: "No app download needed" },
    { icon: "🇮🇳", text: "Built for Indian events" },
    { icon: "✅", text: "Zero paper cards" },
  ];
  return (
    <div className="border-b border-border bg-muted/20 py-6">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 mb-4">
          Why teams choose VIMS Events
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
          {pillars.map((p) => (
            <span key={p.text} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150 cursor-default select-none">
              <span>{p.icon}</span>
              {p.text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── How It Works ──────────────────────────────────────────────── */
function HowItWorksSection() {
  const steps = [
    {
      num: "01", delay: "reveal-d1",
      icon: "📋",
      title: "Create Your Event",
      body: "Set up your event in 5 minutes. Add custom branding, registration fields, and networking rules through our guided wizard.",
      color: "from-blue-50 to-indigo-50", border: "border-blue-100", iconBg: "bg-blue-100 text-blue-700",
      ring: "group-hover:ring-2 group-hover:ring-blue-200",
    },
    {
      num: "02", delay: "reveal-d2",
      icon: "📲",
      title: "Attendees Scan & Connect",
      body: "Each attendee gets a unique digital card and QR code. One scan exchanges contact details — no apps, works in any browser.",
      color: "from-violet-50 to-purple-50", border: "border-violet-100", iconBg: "bg-violet-100 text-violet-700",
      ring: "group-hover:ring-2 group-hover:ring-violet-200",
    },
    {
      num: "03", delay: "reveal-d3",
      icon: "🤝",
      title: "Build Real Relationships",
      body: "All connections are saved in a live directory. Export vCards, sync with your CRM, and follow up with every new contact.",
      color: "from-emerald-50 to-teal-50", border: "border-emerald-100", iconBg: "bg-emerald-100 text-emerald-700",
      ring: "group-hover:ring-2 group-hover:ring-emerald-200",
    },
  ];

  return (
    <Section id="how-it-works">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal text-center max-w-2xl mx-auto mb-12">
          <EyebrowTag>How it works</EyebrowTag>
          <SectionTitle>Three steps to transform your event</SectionTitle>
          <SectionDesc>From setup to follow-up, VIMS handles the entire networking lifecycle.</SectionDesc>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className={`reveal ${s.delay} group relative overflow-hidden rounded-3xl border ${s.border} bg-white p-8 transition-all duration-300 ${s.ring} hover:-translate-y-2 hover:shadow-2xl hover:shadow-primary/8`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-3xl`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-6">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${s.iconBg} transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    {s.icon}
                  </div>
                  <span className="text-6xl font-black text-border/40 group-hover:text-primary/10 transition-colors duration-300 select-none">
                    {s.num}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-foreground">{s.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed text-sm">{s.body}</p>
              </div>
              {/* Bottom accent */}
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-primary to-violet-500 transition-all duration-500 group-hover:w-full" />
              {i < 2 && (
                <div className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 z-10">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-border/40">
                    <svg className="h-3 w-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── Features ──────────────────────────────────────────────────── */
function FeaturesSection() {
  const features = [
    { icon: "🔒", tag: "Privacy", title: "Privacy-First Networking", body: "Attendees control who sees their details. Phone and email only shared after mutual connection acceptance.", accent: "from-blue-500/5 to-indigo-500/5", tagCls: "bg-blue-50 text-blue-600 border-blue-100" },
    { icon: "⚡", tag: "Speed", title: "Instant QR Exchange", body: "Scan any attendee's QR to send a connection request. No manual entry, no paper cards, no friction.", accent: "from-amber-500/5 to-orange-500/5", tagCls: "bg-amber-50 text-amber-600 border-amber-100" },
    { icon: "📊", tag: "Analytics", title: "Live Analytics Dashboard", body: "Real-time stats on registrations, connections, and engagement rates — all during the event.", accent: "from-violet-500/5 to-purple-500/5", tagCls: "bg-violet-50 text-violet-600 border-violet-100" },
    { icon: "🎨", tag: "Design", title: "Full Custom Branding", body: "Custom colours, logos, and branded digital cards. Match your event identity perfectly.", accent: "from-rose-500/5 to-pink-500/5", tagCls: "bg-rose-50 text-rose-600 border-rose-100" },
    { icon: "📤", tag: "Export", title: "Excel Export", body: "One-click export of all attendees, connections, and engagement data in structured Excel format.", accent: "from-emerald-500/5 to-teal-500/5", tagCls: "bg-emerald-50 text-emerald-600 border-emerald-100" },
    { icon: "✅", tag: "Legal", title: "DPDP Compliant", body: "Built for India's Digital Personal Data Protection Act. Consent capture, right to access, right to erasure.", accent: "from-sky-500/5 to-cyan-500/5", tagCls: "bg-sky-50 text-sky-600 border-sky-100" },
  ];

  return (
    <Section id="features" className="bg-gradient-to-b from-muted/30 to-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal text-center max-w-2xl mx-auto mb-12">
          <EyebrowTag>Features</EyebrowTag>
          <SectionTitle>Everything you need for better networking</SectionTitle>
          <SectionDesc>Purpose-built tools that make professional connections effortless at any scale.</SectionDesc>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`reveal reveal-d${(i % 3) + 1} group relative overflow-hidden rounded-2xl border border-border bg-white p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/8 hover:border-primary/20`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${f.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-2xl transition-all duration-300 group-hover:scale-110">
                    {f.icon}
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${f.tagCls}`}>
                    {f.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors duration-200">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
              </div>
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-primary to-violet-500 transition-all duration-500 group-hover:w-full" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── For Attendees ─────────────────────────────────────────────── */
function ForAttendeesSection() {
  const benefits = [
    "No app download — works in any mobile browser",
    "Your data stays yours — opt-in connections only",
    "Instant personal networking dashboard",
    "Export connections to vCard or CSV",
    "Smart directory with search and filters",
  ];

  return (
    <Section>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="reveal-left">
            <EyebrowTag color="violet">For Attendees</EyebrowTag>
            <SectionTitle>Network without the awkwardness</SectionTitle>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Walk into any event with confidence. Share your details with a quick scan, browse who&apos;s around you, and leave with a full contact list ready to follow up.
            </p>
            <ul className="mt-6 space-y-2.5">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                    <svg className="h-3 w-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground">{b}</span>
                </li>
              ))}
            </ul>
            <Link href="/auth/organiser/signup" className="btn-primary mt-8 w-fit">
              Create Your Event
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </Link>
          </div>

          {/* Mock card */}
          <div className="reveal-right flex justify-center">
            <div className="relative w-72">
              <div className="absolute -inset-6 rounded-3xl bg-gradient-to-br from-primary/10 to-violet-500/10 blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl bg-white shadow-2xl shadow-primary/10 border border-border">
                <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />
                <div className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-xl font-black text-white shadow-lg shadow-primary/30">
                      AK
                    </div>
                    <div>
                      <p className="font-bold text-foreground">Amara Kazeem</p>
                      <p className="text-xs text-muted-foreground">Product Lead · TechFlow</p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {["AI/ML", "SaaS", "Growth"].map((t) => (
                      <span key={t} className="rounded-full bg-primary/5 border border-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">{t}</span>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center justify-center rounded-2xl border-2 border-dashed border-primary/20 bg-primary/3 p-5">
                    <div className="grid grid-cols-3 gap-1 opacity-70">
                      {Array.from({ length: 9 }).map((_, i) => (
                        <div key={i} className={`h-3 w-3 rounded-sm ${i === 4 ? "bg-white" : "bg-primary/70"}`} />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2 text-center text-xs text-muted-foreground">Scan to connect</p>
                </div>
                <div className="border-t border-border px-5 py-3 flex justify-between items-center bg-muted/20">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map((i) => <div key={i} className="h-1.5 w-1.5 rounded-full bg-primary/20" />)}
                  </div>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live
                  </span>
                </div>
              </div>
              <div className="absolute -right-6 top-8 animate-float rounded-2xl bg-white px-3 py-2 shadow-xl border border-border">
                <p className="text-xs font-bold text-foreground">24 connections</p>
                <p className="text-[10px] text-emerald-500 font-medium">↑ 8 this hour</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── For Organisers ────────────────────────────────────────────── */
function ForOrganisersSection() {
  const benefits = [
    "Set up in under 5 minutes with guided wizard",
    "Real-time analytics during the event",
    "Custom branding to match your event identity",
    "DPDP-compliant with full data control",
    "Excel export with 4 structured sheets",
  ];
  const stats = [
    { v: "847", l: "Connections Made", c: "text-primary" },
    { v: "94%", l: "Engagement Rate",  c: "text-violet-600" },
    { v: "312", l: "Active Now",        c: "text-emerald-600" },
    { v: "4.8★",l: "Satisfaction",     c: "text-amber-500" },
  ];

  return (
    <Section className="bg-gradient-to-b from-white to-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div className="reveal-left order-2 lg:order-1">
            <div className="rounded-3xl border border-border bg-white p-6 shadow-2xl shadow-primary/5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="font-bold text-foreground text-sm">Live Dashboard</p>
                  <p className="text-xs text-muted-foreground">TechConnect Summit 2026</p>
                </div>
                <span className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {stats.map((s) => (
                  <div key={s.l} className="rounded-2xl bg-muted/40 p-4 transition-all duration-200 hover:bg-muted/70 hover:scale-[1.02]">
                    <p className={`text-2xl font-black ${s.c}`}>{s.v}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.l}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl bg-muted/30 p-4">
                <div className="flex items-end justify-between gap-1 h-14">
                  {[30,45,35,60,80,70,95,75,85,100,90,88].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-primary/20 hover:bg-primary/50 transition-colors duration-150 cursor-pointer"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Connections per hour</p>
              </div>
            </div>
          </div>

          <div className="reveal-right order-1 lg:order-2">
            <EyebrowTag>For Organisers</EyebrowTag>
            <SectionTitle>Full control, zero complexity</SectionTitle>
            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Manage every aspect of your event networking from a single dashboard. Track engagement in real time and deliver measurable value to every sponsor.
            </p>
            <ul className="mt-6 space-y-2.5">
              {benefits.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm text-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Pricing ───────────────────────────────────────────────────── */
function PricingSection() {
  const tiers = [
    {
      name: "Starter", price: "Free", period: "",
      desc: "Perfect for small meetups and workshops",
      badge: null,
      features: ["Up to 50 attendees","1 active event","QR code networking","Basic analytics","Email support"],
      cta: "Start Free", href: "/auth/organiser/signup", highlight: false,
    },
    {
      name: "Professional", price: "Free", period: "",
      desc: "Currently in beta — all features unlocked",
      badge: "Beta Free",
      features: ["Unlimited attendees","Unlimited events","Custom branding","Advanced analytics","Priority support","Excel export"],
      cta: "Get Started Free", href: "/auth/organiser/signup", highlight: true,
    },
    {
      name: "Enterprise", price: "Custom", period: "",
      desc: "For large-scale conferences and organisations",
      badge: null,
      features: ["Unlimited attendees","Unlimited events","API access","Dedicated manager","SSO integration","Custom development"],
      cta: "Contact Sales", href: "#", highlight: false,
    },
  ];

  return (
    <Section id="pricing">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal text-center max-w-2xl mx-auto mb-12">
          <EyebrowTag>Pricing</EyebrowTag>
          <SectionTitle>Simple, transparent pricing</SectionTitle>
          <SectionDesc>We&apos;re in beta — start completely free. No hidden fees, no credit card required.</SectionDesc>
        </div>

        {/* Beta notice */}
        <div className="reveal mb-8 mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 text-center">
          <p className="text-sm font-semibold text-emerald-700">
            🎉 Beta Launch — All plans are currently <strong>free of charge</strong>. No billing until we exit beta.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
          {tiers.map((t, i) => (
            <div
              key={t.name}
              className={`reveal reveal-d${i + 1} relative rounded-3xl p-8 transition-all duration-300 ${
                t.highlight
                  ? "bg-gradient-to-b from-primary to-violet-700 text-white shadow-2xl shadow-primary/30 ring-2 ring-primary/50 scale-[1.02] hover:scale-[1.04]"
                  : "border border-border bg-white hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1"
              }`}
            >
              {t.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 px-4 py-1.5 text-xs font-black text-white shadow-lg tracking-wide uppercase">
                  {t.badge}
                </div>
              )}
              <div>
                <p className={`font-bold text-lg ${t.highlight ? "text-white" : "text-foreground"}`}>{t.name}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className={`text-4xl font-black ${t.highlight ? "text-white" : "text-foreground"}`}>{t.price}</span>
                  {t.highlight && (
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white/90">during beta</span>
                  )}
                </div>
                <p className={`mt-2 text-sm ${t.highlight ? "text-white/70" : "text-muted-foreground"}`}>{t.desc}</p>
              </div>
              <ul className="mt-6 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5">
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${t.highlight ? "bg-white/20" : "bg-primary/10"}`}>
                      <svg className={`h-3 w-3 ${t.highlight ? "text-white" : "text-primary"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className={`text-sm ${t.highlight ? "text-white/90" : "text-foreground"}`}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={t.href}
                className={`mt-8 block rounded-2xl py-3.5 text-center text-sm font-bold transition-all duration-200 active:scale-[0.97] ${
                  t.highlight
                    ? "bg-white text-primary hover:bg-primary-50 shadow-lg hover:scale-[1.02]"
                    : "border border-border text-foreground hover:bg-muted hover:border-primary/30 hover:scale-[1.02]"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─── CTA ───────────────────────────────────────────────────────── */
function CTASection() {
  return (
    <Section>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="reveal relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-primary to-violet-800 p-12 text-center sm:p-20">
          <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-blob" />
          <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-white/10 blur-3xl animate-blob" style={{ animationDelay: "4s" }} />
          <div className="relative flex justify-center mb-6">
            <div className="relative h-14 w-14 overflow-hidden rounded-2xl shadow-xl shadow-black/30">
              <Image src="/logo.png" alt="VIMS" fill className="object-cover" />
            </div>
          </div>
          <div className="relative">
            <p className="text-sm font-bold uppercase tracking-widest text-white/50 mb-4">Get started today</p>
            <h2 className="text-4xl font-extrabold text-white sm:text-5xl text-balance">
              Ready to transform your event networking?
            </h2>
            <p className="mt-5 text-lg text-white/65 max-w-2xl mx-auto leading-relaxed">
              Be among the first to use VIMS Events. Set up your first event in under five minutes — completely free during our beta launch.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href="/auth/organiser/signup" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-8 text-base font-black text-primary shadow-2xl transition-all duration-200 hover:scale-[1.03] hover:shadow-xl active:scale-[0.97]">
                Create Your First Event
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                </svg>
              </Link>
              <Link href="/auth/attendee/login" className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/20 hover:border-white/30 hover:scale-[1.02] active:scale-[0.97]">
                Attendee? Join Event
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─── Shared components ─────────────────────────────────────────── */
function EyebrowTag({ children, color = "indigo" }: { children: ReactNode; color?: "indigo" | "violet" }) {
  const cls = color === "violet"
    ? "bg-violet-50 text-violet-600 border-violet-100"
    : "bg-primary/5 text-primary border-primary/10";
  return (
    <span className={`inline-block rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 ${cls}`}>
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl lg:text-5xl tracking-tight text-balance leading-tight">
      {children}
    </h2>
  );
}

function SectionDesc({ children }: { children: ReactNode }) {
  return <p className="mt-4 text-lg text-muted-foreground leading-relaxed">{children}</p>;
}
