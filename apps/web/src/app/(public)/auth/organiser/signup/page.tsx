"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

type ResendStatus = "idle" | "sending" | "sent" | "error";

export default function OrganiserSignupPage() {
  const router = useRouter();
  const { data: platformSettings, loading: settingsLoading } = usePlatformSettings();
  const [form, setForm] = useState({ name: "", organisation: "", email: "", mobile: "", password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [emailExists, setEmailExists] = useState(false);
  const [resendStatus, setResendStatus] = useState<ResendStatus>("idle");
  const [resendMessage, setResendMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const f = (id: keyof typeof form) => ({
    value: form[id],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((p) => ({ ...p, [id]: e.target.value }));
      // Clear the duplicate-email banner once the user edits the email field.
      if (id === "email" && emailExists) {
        setEmailExists(false);
        setError("");
        setResendStatus("idle");
        setResendMessage("");
      }
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setEmailExists(false);
    setResendStatus("idle");
    setResendMessage("");
    if (form.password !== form.confirmPassword) { setError("Passwords do not match."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      await apiClient.post("/auth/organiser/signup", {
        name: form.name, organisation: form.organisation,
        email: form.email, mobile: form.mobile, password: form.password,
      });
      router.push(`/auth/organiser/verify?email=${encodeURIComponent(form.email)}&sent=1`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { message?: string } } };
      const msg = axiosErr.response?.data?.message;
      if (axiosErr.response?.status === 409) {
        setEmailExists(true);
        setError(msg ?? "An account with this email already exists.");
      } else if (
        axiosErr.response?.status === 403 &&
        typeof msg === "string" &&
        msg.toLowerCase().includes("self-signup")
      ) {
        setError(
          `Self-signup is currently disabled. Please contact ${platformSettings.supportEmail}.`,
        );
      } else {
        setError(msg ?? "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    if (!form.email.includes("@")) {
      setResendStatus("error");
      setResendMessage("Enter a valid email address first.");
      return;
    }
    setResendStatus("sending");
    setResendMessage("");
    try {
      const res = await apiClient.post<{ message: string; alreadyVerified?: boolean }>(
        "/auth/organiser/resend-verification",
        { email: form.email },
      );
      if (res?.data?.alreadyVerified) {
        setResendStatus("sent");
        setResendMessage("This email is already verified. Redirecting to login…");
        setTimeout(
          () => router.push(`/auth/organiser/login?email=${encodeURIComponent(form.email)}`),
          1500,
        );
        return;
      }
      setResendStatus("sent");
      setResendMessage(res?.data?.message ?? "Verification email sent. Check your inbox.");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setResendStatus("error");
      setResendMessage(msg ?? "Failed to send verification email.");
    }
  }

  const inputClass = "w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10";
  const labelClass = "block text-sm font-semibold text-foreground mb-1.5";

  // Disabled-state branch: when the platform admin has turned off self-signup,
  // we render a friendly "request access" CTA pointing at the configured
  // support email instead of showing a form that the backend will reject.
  if (!settingsLoading && !platformSettings.selfSignupEnabled) {
    const subject = encodeURIComponent(
      `Organiser account request — ${platformSettings.platformName}`,
    );
    const body = encodeURIComponent(
      `Hi,\n\nI'd like to request an organiser account for ${platformSettings.platformName}.\n\nName:\nOrganisation:\nReason:\n\nThanks.`,
    );
    return (
      <div className="animate-in">
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Self-signup is currently disabled
          </h1>
          <p className="mt-2 text-muted-foreground">
            To request an organiser account on {platformSettings.platformName},
            please get in touch — we&apos;ll get you set up.
          </p>
        </div>

        <a
          href={`mailto:${platformSettings.supportEmail}?subject=${subject}&body=${body}`}
          className="group block w-full overflow-hidden rounded-2xl bg-primary py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.01]"
        >
          Request access →
        </a>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/auth/organiser/login"
            className="font-semibold text-primary hover:text-primary-600 transition-colors"
          >
            Log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Create your account</h1>
        <p className="mt-2 text-muted-foreground">Start hosting networking events in minutes</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-destructive/5 border border-destructive/20 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <div className="flex-1 space-y-2">
            <p className="text-sm text-destructive">{error}</p>
            {emailExists && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <Link
                  href={`/auth/organiser/login?email=${encodeURIComponent(form.email)}`}
                  className="font-semibold text-primary hover:underline"
                >
                  Log in instead →
                </Link>
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendStatus === "sending" || resendStatus === "sent"}
                  className="font-semibold text-primary hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {resendStatus === "sending"
                    ? "Sending…"
                    : resendStatus === "sent"
                      ? "Sent"
                      : "Resend verification email"}
                </button>
              </div>
            )}
            {resendMessage && (
              <p className={`text-xs ${resendStatus === "error" ? "text-destructive" : "text-muted-foreground"}`}>
                {resendMessage}
              </p>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Full Name</label>
            <input type="text" required placeholder="Jane Doe" autoComplete="name" {...f("name")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Organisation</label>
            <input type="text" required placeholder="Acme Corp" {...f("organisation")} className={inputClass} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Email address</label>
          <input type="email" required placeholder="jane@acme.com" autoComplete="email" {...f("email")} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Mobile number</label>
          <input type="tel" required placeholder="+91 98765 43210" autoComplete="tel" {...f("mobile")} className={inputClass} />
        </div>

        <div>
          <label className={labelClass}>Password</label>
          <div className="relative">
            <input type={showPassword ? "text" : "password"} required minLength={8} placeholder="Min. 8 characters" autoComplete="new-password" {...f("password")} className={`${inputClass} pr-11`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-foreground">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        <div>
          <label className={labelClass}>Confirm password</label>
          <input type="password" required minLength={8} placeholder="Repeat your password" autoComplete="new-password" {...f("confirmPassword")} className={inputClass} />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group w-full overflow-hidden rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Creating account…
            </span>
          ) : "Create Account →"}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          By signing up you agree to our{" "}
          <a href="#" className="text-primary hover:underline">Terms</a> &amp;{" "}
          <a href="#" className="text-primary hover:underline">Privacy Policy</a>
        </p>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/organiser/login" className="font-semibold text-primary hover:text-primary-600 transition-colors">
          Log in
        </Link>
      </p>
    </div>
  );
}
