"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient, setStoredTokens } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

function AttendeeVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const setActiveEvent = useAuthStore((s) => s.setActiveEvent);

  const email = searchParams.get("email") ?? "";
  const eventId = searchParams.get("eventId") ?? "";
  const eventName = searchParams.get("eventName") ?? "this event";
  const isDev = process.env.NODE_ENV === "development";
  const devOtpParam = isDev ? (searchParams.get("devOtp") ?? "") : "";

  const [otp, setOtp] = useState(() =>
    isDev && devOtpParam.length === 6 ? devOtpParam.split("") : ["", "", "", "", "", ""]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(30);
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  function handleOtpChange(idx: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const next = [...otp];
    next[idx] = value.slice(-1);
    setOtp(next);
    if (value && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    const code = otp.join("");
    if (code.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      const { data } = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; role: string; eventId: string };
      }>("/auth/attendee/verify-otp", { email, eventId, otp: code });

      setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      login(
        { id: data.user.id, email: data.user.email, name: email.split("@")[0] ?? email, role: "attendee", eventId: data.user.eventId },
        data.accessToken,
        data.refreshToken,
      );
      setActiveEvent(eventId);
      router.push("/home");
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; response?: { data?: { message?: string } } };
      if (axiosErr.code === "ERR_NETWORK" || axiosErr.code === "ECONNREFUSED") {
        setError("Cannot connect to the server. Please ensure the API is running.");
      } else {
        const msg = axiosErr.response?.data?.message;
        setError(msg ?? "Invalid or expired code. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    try {
      await apiClient.post("/auth/attendee/request-otp", { email, eventId });
      setResendCooldown(30);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch {
      setError("Failed to resend code. Please try again.");
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
          <span className="text-lg font-bold text-white">V</span>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Enter your code</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Check your spam/junk folder if you don't see the email.
        </p>
      </div>

      {isDev && devOtpParam && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center">
          <p className="text-xs font-semibold text-amber-700">Dev mode — OTP auto-filled</p>
          <p className="text-lg font-mono font-bold text-amber-900 tracking-widest mt-0.5">{devOtpParam}</p>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        <div className="flex justify-center gap-3">
          {otp.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => { inputRefs.current[idx] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className="h-14 w-12 rounded-xl border border-border bg-white text-center text-2xl font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          ))}
        </div>

        {error && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || otp.join("").length !== 6}
          className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Verifying…" : `Join ${eventName}`}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Didn&apos;t receive a code?{" "}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
          </button>
        </p>
      </div>
    </div>
  );
}

function AttendeeVerifyFallback() {
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

export default function AttendeeVerifyPage() {
  return (
    <Suspense fallback={<AttendeeVerifyFallback />}>
      <AttendeeVerifyContent />
    </Suspense>
  );
}
