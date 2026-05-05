"use client";

import { useScrollReveal } from "@/hooks/use-scroll-reveal";

type Track = "organiser" | "attendee";

interface Step {
  title: string;
  body: string;
}

interface TrackColumn {
  track: Track;
  label: string;
  steps: readonly [Step, Step, Step];
}

const COLUMNS: ReadonlyArray<TrackColumn> = [
  {
    track: "organiser",
    label: "For Organisers",
    steps: [
      {
        title: "Set up in 5 minutes",
        body: "A guided wizard handles branding, registration fields, and networking rules. No drafts to revisit.",
      },
      {
        title: "Share the event link",
        body: "Attendees join with one tap from any phone browser. No app downloads.",
      },
      {
        title: "Track ROI in real time",
        body: "Live analytics, top connectors, drop-off, exportable Excel.",
      },
    ],
  },
  {
    track: "attendee",
    label: "For Attendees",
    steps: [
      {
        title: "Open the event link",
        body: "Works in any mobile browser. No app, no friction.",
      },
      {
        title: "One-scan QR exchange",
        body: "Connect with anyone in two seconds; their vCard lands in your phone.",
      },
      {
        title: "Walk out with a clean address book",
        body: "Every connection saved, exportable to CSV/vCard.",
      },
    ],
  },
];

const ORGANISER_BADGE_CLASS = "bg-emerald-100 text-emerald-700 border-emerald-200";
const ATTENDEE_BADGE_CLASS = "bg-indigo-100 text-indigo-700 border-indigo-200";

const ORGANISER_LABEL_CLASS = "bg-emerald-50 text-emerald-700 border-emerald-200";
const ATTENDEE_LABEL_CLASS = "bg-indigo-50 text-indigo-700 border-indigo-200";

export function HowItWorks() {
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();

  return (
    <section
      id="how-it-works"
      className="relative bg-white py-14 lg:py-20 scroll-mt-20 overflow-hidden"
    >
      <div
        ref={ref}
        className={`relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 transition-all duration-700 ease-out motion-reduce:transition-none ${
          revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        <div className="max-w-2xl mb-14">
          <span className="inline-block rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-700 mb-3">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.1] text-balance mb-3">
            From setup to follow-up in three steps
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Whether you run the event or attend it, the path is short and the wins are measurable.
          </p>
        </div>

        {/* Journey infographic: organiser path meets attendee path at the connection node */}
        <div
          aria-hidden="true"
          className="relative hidden lg:block mb-14 select-none"
        >
          {/* Top labels (above the line so they never collide with endpoints) */}
          <div className="relative z-10 flex items-end justify-between mb-3 px-4">
            <div className="flex flex-col items-start gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-emerald-700">Organiser</span>
              <span className="text-xs text-slate-500">Sets up &amp; tracks ROI</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-indigo-700">Attendee</span>
              <span className="text-xs text-slate-500">Joins &amp; connects</span>
            </div>
          </div>

          {/* The journey graphic */}
          <div className="relative h-24">
            <svg
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              fill="none"
            >
              <defs>
                <linearGradient id="orgPath" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#10b981" />
                </linearGradient>
                <linearGradient id="attPath" x1="1" y1="0" x2="0" y2="0">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
                <radialGradient id="hubAura" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#6366f1" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </radialGradient>
                <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Organiser path — proper round dots (not dashes) */}
              <path
                d="M 80 50 C 220 50, 340 50, 470 50"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeDasharray="0 11"
                strokeLinecap="round"
                opacity="0.55"
              />
              {/* Attendee path — proper round dots */}
              <path
                d="M 920 50 C 780 50, 660 50, 530 50"
                stroke="#6366f1"
                strokeWidth="2.5"
                strokeDasharray="0 11"
                strokeLinecap="round"
                opacity="0.55"
              />
              {/* Solid colored leader near each endpoint to anchor the eye */}
              <path
                d="M 80 50 C 130 50, 170 50, 200 50"
                stroke="url(#orgPath)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.35"
              />
              <path
                d="M 920 50 C 870 50, 830 50, 800 50"
                stroke="url(#attPath)"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.35"
              />

              {/* Center hub glow */}
              <circle cx="500" cy="50" r="55" fill="url(#hubAura)" />

              {/* Slow rotating outer ring (live-activity feel) */}
              <g transform="translate(500 50)">
                <circle r="30" fill="none" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 4" opacity="0.6">
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0"
                    to="360"
                    dur="20s"
                    repeatCount="indefinite"
                  />
                </circle>
              </g>

              {/* Pulse ring */}
              <circle cx="500" cy="50" r="22" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.55">
                <animate attributeName="r" values="22;42" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.55;0" dur="2.6s" repeatCount="indefinite" />
              </circle>

              {/* Hub disc */}
              <circle cx="500" cy="50" r="22" fill="white" stroke="#e2e8f0" strokeWidth="1.5" filter="url(#softGlow)" />

              {/* Connection icon — two interlocking rings (one in each accent color) */}
              <g transform="translate(500 50)" fill="none" strokeWidth="2" strokeLinecap="round">
                {/* Emerald ring (left) */}
                <circle cx="-3.5" cy="0" r="5.5" stroke="#10b981" />
                {/* Indigo ring (right) */}
                <circle cx="3.5" cy="0" r="5.5" stroke="#6366f1" />
                {/* Tiny center accent — the connection point */}
                <circle cx="0" cy="0" r="1.4" fill="#0f172a" stroke="none" />
              </g>

              {/* Endpoint: Organiser (briefcase glyph) */}
              <g transform="translate(50 50)">
                <circle r="18" fill="white" stroke="#10b981" strokeWidth="2" />
                <g stroke="#10b981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <rect x="-7" y="-4" width="14" height="9" rx="1.5" />
                  <path d="M -3 -4 V -6 H 3 V -4" />
                  <path d="M -7 0 H 7" />
                </g>
              </g>

              {/* Endpoint: Attendee (person glyph) */}
              <g transform="translate(950 50)">
                <circle r="18" fill="white" stroke="#6366f1" strokeWidth="2" />
                <g stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
                  <circle cx="0" cy="-3" r="3" />
                  <path d="M -6 7 C -6 3, -3 1, 0 1 C 3 1, 6 3, 6 7" />
                </g>
              </g>

              {/* Animated traveling pulse dots with trailing glow */}
              <circle r="5" fill="#10b981" filter="url(#softGlow)">
                <animateMotion dur="2.6s" repeatCount="indefinite" path="M 80 50 C 220 50, 340 50, 470 50" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle r="3" fill="#10b981" opacity="0.5">
                <animateMotion dur="2.6s" begin="0.15s" repeatCount="indefinite" path="M 80 50 C 220 50, 340 50, 470 50" />
                <animate attributeName="opacity" values="0;0.5;0.5;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin="0.15s" repeatCount="indefinite" />
              </circle>

              <circle r="5" fill="#6366f1" filter="url(#softGlow)">
                <animateMotion dur="2.6s" begin="1.3s" repeatCount="indefinite" path="M 920 50 C 780 50, 660 50, 530 50" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin="1.3s" repeatCount="indefinite" />
              </circle>
              <circle r="3" fill="#6366f1" opacity="0.5">
                <animateMotion dur="2.6s" begin="1.45s" repeatCount="indefinite" path="M 920 50 C 780 50, 660 50, 530 50" />
                <animate attributeName="opacity" values="0;0.5;0.5;0" keyTimes="0;0.1;0.85;1" dur="2.6s" begin="1.45s" repeatCount="indefinite" />
              </circle>
            </svg>

            {/* Center "Connection" pill — anchored above, not on the line */}
            <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-3">
              <div className="relative">
                <div className="absolute -inset-2 rounded-full bg-gradient-to-r from-emerald-400/30 via-white to-indigo-400/30 blur-md" />
                <div className="relative inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  </span>
                  Connection
                </div>
              </div>
            </div>
          </div>

          {/* Bottom timing strip */}
          <div className="relative mt-3 flex items-center justify-between px-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            <span>5 min</span>
            <span>Live event</span>
            <span>2 sec</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {COLUMNS.map((col) => {
            const badgeClass =
              col.track === "organiser" ? ORGANISER_BADGE_CLASS : ATTENDEE_BADGE_CLASS;
            const labelClass =
              col.track === "organiser" ? ORGANISER_LABEL_CLASS : ATTENDEE_LABEL_CLASS;
            return (
              <div key={col.track} className="relative">
                <span
                  className={`inline-block rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] mb-6 ${labelClass}`}
                >
                  {col.label}
                </span>

                <div className="relative">
                  <div
                    aria-hidden="true"
                    className="absolute left-5 top-10 bottom-10 w-px bg-slate-200"
                  />

                  <ol className="flex flex-col gap-8">
                    {col.steps.map((step, idx) => (
                      <li key={step.title} className="relative flex items-start gap-4">
                        <div
                          className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border flex items-center justify-center text-sm font-bold ${badgeClass}`}
                        >
                          {String(idx + 1).padStart(2, "0")}
                        </div>
                        <div className="flex-1 pt-1">
                          <h3 className="text-lg font-semibold text-slate-900 mb-1.5">
                            {step.title}
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {step.body}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
