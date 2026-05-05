"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

function AttendeeRegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const eventId = searchParams.get("eventId") ?? "";
  const eventName = searchParams.get("eventName") ?? "this event";

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await apiClient.post("/auth/attendee/request-otp", { email, eventId });
      router.push(
        `/auth/attendee/verify?email=${encodeURIComponent(email)}&eventId=${eventId}&eventName=${encodeURIComponent(eventName)}`
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!eventId) {
    return (
      <div className="w-full max-w-md text-center">
        <h1 className="text-2xl font-bold text-foreground">Invalid Link</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please scan the event QR code to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-lg font-bold text-white">V</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          Join {eventName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your email to receive a one-time login code
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Sending code…" : "Send Login Code"}
        </button>
      </form>

      <p className="text-center text-xs text-muted-foreground">
        By continuing you agree to our{" "}
        <a href="#" className="text-primary hover:underline">privacy policy</a>.
        Your data is only used for event networking.
      </p>
    </div>
  );
}

function AttendeeRegisterFallback() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-lg font-bold text-white">V</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Loading…</h1>
      </div>
    </div>
  );
}

export default function AttendeeRegisterPage() {
  return (
    <Suspense fallback={<AttendeeRegisterFallback />}>
      <AttendeeRegisterContent />
    </Suspense>
  );
}
