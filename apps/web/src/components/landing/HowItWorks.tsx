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
      className="relative bg-white py-24 lg:py-32 scroll-mt-20 overflow-hidden"
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
