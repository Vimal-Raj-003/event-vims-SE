"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function AttendeeLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", eventId: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const field = (id: keyof typeof form) => ({
    value: form[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [id]: e.target.value })),
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ message?: string; otpToken?: string; otp?: string }>(
        "/auth/attendee/request-otp",
        { email: form.email, eventId: form.eventId },
      );
      // Dev mode: OTP returned in response body
      const otp = data?.otpToken ?? data?.otp ?? null;
      router.push(
        `/auth/attendee/verify?email=${encodeURIComponent(form.email)}&eventId=${encodeURIComponent(form.eventId)}${otp ? `&devOtp=${otp}` : ""}`
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Could not send OTP. Check your Event ID and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5">
          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9a2 2 0 10-4 0v5a2 2 0 104 0V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h.01M15 9h.01" />
          </svg>
          <span className="text-xs font-semibold text-emerald-700">Attendee Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Join your event</h1>
        <p className="mt-2 text-muted-foreground">Enter your email and event ID to receive a login code</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-destructive/5 border border-destructive/20 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground">Email address</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            {...field("email")}
            className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground">Event ID</label>
          <input
            type="text"
            required
            placeholder="Paste the event ID from your invitation"
            {...field("eventId")}
            className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10"
          />
          <p className="text-xs text-muted-foreground">
            The event ID is in the invitation email or QR code from your organiser.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Sending code…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Send Login Code
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </span>
          )}
        </button>
      </form>

      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold text-amber-700">Dev mode — test credentials</p>
          <p className="text-xs text-amber-900 mt-0.5 font-mono">rahul.krishnan@gmail.com</p>
          <p className="text-xs text-amber-900 font-mono">Event ID: cmoj5g67h0003n628x95wm4a9</p>
        </div>
      )}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Are you an organiser?{" "}
        <Link href="/auth/organiser/login" className="font-semibold text-primary hover:text-primary-600 transition-colors">
          Organiser login
        </Link>
      </p>
    </div>
  );
}
