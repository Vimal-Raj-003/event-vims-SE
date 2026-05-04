"use client";

import { useState, type FormEvent } from "react";

type Status = "idle" | "submitting" | "success" | "error";

export function PricingSimple() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("error");
      return;
    }
    setStatus("submitting");
    // TODO: wire to POST /api/v1/public/launch-notify
    await new Promise((r) => setTimeout(r, 600));
    setStatus("success");
  };

  return (
    <section className="relative bg-dark-section py-20 lg:py-28 overflow-hidden">
      <div
        className="pointer-events-none absolute top-1/2 -left-20 h-[300px] w-[300px] -translate-y-1/2 rounded-full bg-emerald-500/[0.04] blur-[100px] animate-glow-drift"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <span className="inline-block rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-emerald-400 mb-3">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.1] text-balance mb-3">
            Free during beta
          </h2>
          <p className="text-base sm:text-lg text-white/55 leading-relaxed">
            We&apos;ll lock pricing when we exit beta. Drop your email and we&apos;ll let you know — no spam, no auto-charges.
          </p>
        </div>

        <div className="max-w-xl mx-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-8 sm:p-10 backdrop-blur-sm">
          <div className="flex justify-center mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Free during beta
            </span>
          </div>

          <p className="text-white text-base text-center">
            Unlimited events <span className="text-white/40">·</span> Unlimited attendees{" "}
            <span className="text-white/40">·</span> All features unlocked
          </p>

          <div className="my-6 border-t border-white/[0.08]" />

          {status === "success" ? (
            <div role="status" className="flex flex-col items-center text-center py-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-white">You&apos;re on the list. We&apos;ll email you once.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label htmlFor="launch-email" className="block text-sm text-white/70 font-medium mb-3">
                Get notified when paid plans launch:
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="launch-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === "error") setStatus("idle");
                  }}
                  placeholder="you@company.com"
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/40 transition-colors"
                  disabled={status === "submitting"}
                />
                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {status === "submitting" ? "Sending…" : "Notify me"}
                </button>
              </div>
              {status === "error" && (
                <p className="mt-2 text-xs text-rose-400" role="alert">
                  Please enter a valid email address.
                </p>
              )}
              <p className="text-xs text-white/40 mt-3">
                We&apos;ll only email once — when pricing locks.
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
