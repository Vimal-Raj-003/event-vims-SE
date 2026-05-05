"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { NetworkGraphBackdrop } from "./NetworkGraphBackdrop";

const CYCLE_MS = 1500;

type AnimVariant = "zoom" | "bounce" | "tilt";

interface ProofCard {
  key: string;
  variant: AnimVariant;
  render: () => ReactNode;
}

/* ────────────────────────────────────────────────────────────────────
 * Three cards, three distinct entry animations (scale-driven).
 * Each card visualises its specific message:
 *   - speed: time comparison bars
 *   - live:  pulsing activity bars
 *   - compliance: animated checklist
 * ──────────────────────────────────────────────────────────────────── */
const CARDS: ProofCard[] = [
  {
    key: "speed",
    variant: "zoom",
    render: () => (
      <ProofCardShell
        accent="emerald"
        gradient="from-emerald-400 via-teal-400 to-emerald-500"
        icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        }
        badge={
          <>
            <span className="text-emerald-500">↑</span> 24× faster
          </>
        }
        badgeTone="emerald"
        metric={<><span className="text-5xl font-extrabold tracking-tight tabular-nums">5</span><span className="text-xl font-bold text-emerald-700 ml-1.5">min</span></>}
        label="Average event setup"
      >
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-16 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Typical</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="absolute inset-y-0 left-0 rounded-full bg-slate-300 [animation:barGrowFull_900ms_cubic-bezier(0.16,1,0.3,1)_120ms_forwards] [width:0%]" />
            </div>
            <span className="w-14 text-right text-xs font-semibold tabular-nums text-slate-500">~2 hrs</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-16 text-[11px] font-bold uppercase tracking-wider text-emerald-700">VIMS</span>
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-sm shadow-emerald-500/50 [animation:barGrowSmall_1100ms_cubic-bezier(0.16,1,0.3,1)_300ms_forwards] [width:0%]" />
            </div>
            <span className="w-14 text-right text-xs font-bold tabular-nums text-emerald-700">5 min</span>
          </div>
        </div>
      </ProofCardShell>
    ),
  },
  {
    key: "live",
    variant: "bounce",
    render: () => (
      <ProofCardShell
        accent="indigo"
        gradient="from-indigo-400 via-violet-400 to-indigo-500"
        icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        }
        badge={
          <>
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-indigo-500" />
            </span>
            Live
          </>
        }
        badgeTone="indigo"
        metric={<span className="text-5xl font-extrabold tracking-tight">Real-time</span>}
        label="ROI dashboards"
      >
        <div>
          <div className="flex h-14 items-end gap-1.5">
            {[40, 65, 50, 80, 55, 75, 90, 60, 85, 70, 95, 78].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-md bg-gradient-to-t from-indigo-300 to-indigo-500 origin-bottom"
                style={{
                  height: `${h}%`,
                  animation: `liveBar 2.4s ease-in-out ${i * 0.07}s infinite alternate`,
                }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-slate-400">
            <span>Connections / min</span>
            <span className="tabular-nums font-bold text-indigo-600">+128</span>
          </div>
        </div>
      </ProofCardShell>
    ),
  },
  {
    key: "compliance",
    variant: "tilt",
    render: () => (
      <ProofCardShell
        accent="emerald"
        gradient="from-emerald-400 via-emerald-500 to-teal-500"
        icon={
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
        }
        badge={
          <>
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Audit-ready
          </>
        }
        badgeTone="emerald"
        metric={<span className="text-5xl font-extrabold tracking-tight">DPDP-safe</span>}
        label="Consent-first by design"
      >
        <ul className="space-y-2.5">
          {[
            { label: "Consent capture", delay: "150ms" },
            { label: "Right to erasure", delay: "350ms" },
            { label: "Audit log built-in", delay: "550ms" },
          ].map((item) => (
            <li
              key={item.label}
              className="flex items-center gap-3 text-sm font-medium text-slate-700 opacity-0 [animation:checkInLeft_500ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={{ animationDelay: item.delay }}
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 shadow-sm shadow-emerald-500/40">
                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
              {item.label}
            </li>
          ))}
        </ul>
      </ProofCardShell>
    ),
  },
];

interface ShellProps {
  accent: "emerald" | "indigo";
  gradient: string;
  icon: ReactNode;
  badge: ReactNode;
  badgeTone: "emerald" | "indigo";
  metric: ReactNode;
  label: string;
  children: ReactNode;
}

function ProofCardShell(props: ShellProps) {
  const accentText = props.accent === "emerald" ? "text-emerald-700" : "text-indigo-700";
  const badgeBg = props.badgeTone === "emerald" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-indigo-200 bg-indigo-50 text-indigo-700";
  const shadow = props.accent === "emerald" ? "shadow-emerald-900/10" : "shadow-indigo-900/10";
  return (
    <div className={`relative overflow-hidden rounded-3xl border border-slate-200/80 bg-white p-7 shadow-xl ${shadow}`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${props.gradient} text-white shadow-lg shadow-slate-900/10`}>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {props.icon}
          </svg>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${badgeBg}`}>
          {props.badge}
        </span>
      </div>
      <div className="mt-5 flex items-baseline">
        <span className="text-slate-900">{props.metric}</span>
      </div>
      <div className={`mt-1 text-sm font-semibold ${accentText}`}>{props.label}</div>
      <div className="mt-6">{props.children}</div>
    </div>
  );
}

export function ProofMoments() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [tickKey, setTickKey] = useState(0); // forces re-mount of inner card to replay anim
  // restartKey bumps every time we want to throw away the current interval and
  // start fresh — i.e. when the user clicks an indicator dot. Including it in
  // the auto-cycle effect deps gives a clean cancel + restart.
  const [restartKey, setRestartKey] = useState(0);

  // Auto-cycle every 1.5s. Restarts cleanly on `paused` toggle or `restartKey` bump.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setActive((a) => (a + 1) % CARDS.length);
      setTickKey((k) => k + 1);
    }, CYCLE_MS);
    return () => clearInterval(id);
  }, [paused, restartKey]);

  const goTo = (idx: number) => {
    setActive(idx);
    setTickKey((k) => k + 1);
    setRestartKey((k) => k + 1); // ensure the next auto-tick is a full CYCLE_MS away
  };

  return (
    <section
      aria-label="Why teams choose VIMS"
      className="relative bg-white py-14 lg:py-20 overflow-hidden"
    >
      <NetworkGraphBackdrop idPrefix="proofmoments" accentTone="indigo" />

      <div
        ref={ref}
        className={`relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out motion-reduce:transition-none ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-block rounded-full bg-slate-900 text-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] mb-4">
            Why VIMS
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-[1.15] text-balance">
            Three proof points. <span className="text-slate-500">One promise.</span>
          </h2>
          <p className="mt-3 text-sm sm:text-base text-slate-600">
            Faster setup, live ROI, and audit-ready compliance, built into the core.
          </p>
        </div>

        {/* Carousel — single card position */}
        <div
          className="relative mx-auto max-w-md"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          {/* Stage holds all 3 stacked; only active is visible */}
          <div className="relative min-h-[330px]">
            {CARDS.map((c, idx) => {
              const isActive = idx === active;
              const variantClass =
                c.variant === "zoom" ? "proof-anim-zoom"
                : c.variant === "bounce" ? "proof-anim-bounce"
                : "proof-anim-tilt";
              return (
                <div
                  key={`${c.key}-${isActive ? tickKey : "idle"}`}
                  aria-hidden={!isActive}
                  className={`absolute inset-0 ${
                    isActive ? `${variantClass} pointer-events-auto` : "opacity-0 pointer-events-none"
                  }`}
                >
                  {c.render()}
                </div>
              );
            })}
          </div>

          {/* Indicator dots + manual select */}
          <div className="mt-6 flex items-center justify-center gap-3" role="tablist" aria-label="Proof points">
            {CARDS.map((c, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={c.key}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Show proof point ${idx + 1}`}
                  onClick={() => goTo(idx)}
                  className="group relative h-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 rounded-full transition-all"
                  style={{ width: isActive ? 28 : 10 }}
                >
                  <span
                    className={`block h-full w-full rounded-full transition-colors duration-300 ${
                      isActive ? "bg-slate-900" : "bg-slate-300 group-hover:bg-slate-400"
                    }`}
                  />
                  {isActive && !paused && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 rounded-full bg-emerald-500/40 [width:0%] [animation:dotProgress_1500ms_linear_forwards]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
