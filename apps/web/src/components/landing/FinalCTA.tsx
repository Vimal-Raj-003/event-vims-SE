import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative bg-dark-section py-24 lg:py-32 overflow-hidden">
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-4">
          Get started
        </span>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] text-balance mb-5">
          Ready to transform your event networking?
        </h2>
        <p className="text-base sm:text-lg text-white/55 leading-relaxed max-w-2xl mx-auto">
          Be among the first to use VIMS Events. Set up your first event in under five minutes — completely free during beta.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/auth/organiser/signup"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl px-7 py-3.5 text-base transition-colors"
          >
            Create Your First Event
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </Link>
          <Link
            href="/auth/attendee/login"
            className="inline-flex items-center bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl px-7 py-3.5 text-base transition-colors"
          >
            Attendee? Join Event
          </Link>
        </div>
      </div>
    </section>
  );
}
