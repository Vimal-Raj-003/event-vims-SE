"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

type VerifyStatus = "verifying" | "success" | "error" | "sent";
type ResendStatus = "idle" | "sending" | "sent" | "error";

function ResendSection({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<ResendStatus>("idle");
  const [message, setMessage] = useState("");

  async function handleResend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }
    setStatus("sending");
    setMessage("");
    try {
      const res = await apiClient.post<{
        message: string;
        alreadyVerified?: boolean;
      }>("/auth/organiser/resend-verification", { email });
      if (res?.data?.alreadyVerified) {
        setStatus("sent");
        setMessage(res.data.message ?? "This email is already verified. Redirecting to login…");
        setTimeout(() => router.push("/auth/organiser/login"), 1500);
        return;
      }
      setStatus("sent");
      setMessage(
        res?.data?.message ??
          "If an account exists for this email, a new verification link has been sent.",
      );
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setStatus("error");
      setMessage(msg ?? "Could not send verification email. Please try again.");
    }
  }

  return (
    <form onSubmit={handleResend} className="space-y-2 rounded-xl border border-border bg-muted/30 p-4">
      <p className="text-xs font-semibold text-foreground">Didn&apos;t get the email?</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error" || status === "sent") {
              setStatus("idle");
              setMessage("");
            }
          }}
          placeholder="you@company.com"
          disabled={status === "sending"}
          className="flex-1 rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "sending"}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "sending" ? "Sending…" : "Resend"}
        </button>
      </div>
      {status === "sent" && (
        <p className="text-xs text-success" role="status">
          {message}
        </p>
      )}
      {status === "error" && (
        <p className="text-xs text-destructive" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}

function OrganiserVerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const sent = searchParams.get("sent") === "1";
  const email = searchParams.get("email");

  const initialStatus: VerifyStatus = token ? "verifying" : sent ? "sent" : "error";
  const [status, setStatus] = useState<VerifyStatus>(initialStatus);
  const [message, setMessage] = useState(
    sent && !token
      ? `We sent a verification link${email ? ` to ${email}` : ""}. Open it from your inbox to activate your account.`
      : !token
        ? "No verification token found. Please check your email link."
        : "",
  );

  useEffect(() => {
    if (!token) return;

    apiClient
      .post<{ message: string; alreadyVerified?: boolean }>(
        "/auth/organiser/verify",
        { token, ...(email ? { email } : {}) },
      )
      .then((res) => {
        setStatus("success");
        setMessage(
          res?.data?.message ??
            "Your email has been verified. You can now log in.",
        );
        const delay = res?.data?.alreadyVerified ? 1500 : 2500;
        setTimeout(() => router.push("/auth/organiser/login"), delay);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.response?.data?.message ??
            "Verification failed. The link may have expired.",
        );
      });
  }, [token, email, router]);

  const showResend = status === "sent" || status === "error";

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-white">
          {status === "verifying" && (
            <svg className="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {status === "success" && (
            <svg className="h-7 w-7 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === "sent" && (
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
          {status === "error" && (
            <svg className="h-7 w-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {status === "verifying" && "Verifying your email…"}
          {status === "success" && "Email Verified!"}
          {status === "sent" && "Check your inbox"}
          {status === "error" && "Verification Failed"}
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          {status === "verifying" && "Please wait while we confirm your address."}
          {message && message}
        </p>

        {status === "success" && (
          <p className="mt-1 text-xs text-muted-foreground">
            Redirecting you to login…
          </p>
        )}
        {showResend && (
          <p className="mt-1 text-xs text-muted-foreground">
            Tip: Check your spam/junk folder for the verification email.
          </p>
        )}
      </div>

      {showResend && <ResendSection initialEmail={email ?? ""} />}

      {status === "sent" && (
        <Link
          href="/auth/organiser/login"
          className="block w-full rounded-xl border border-border py-3 text-center text-sm font-medium text-foreground hover:bg-muted"
        >
          Back to Login
        </Link>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <Link
            href="/auth/organiser/signup"
            className="block w-full rounded-xl bg-primary py-3 text-center text-sm font-semibold text-white hover:bg-primary-600"
          >
            Sign Up Again
          </Link>
          <Link
            href="/auth/organiser/login"
            className="block w-full rounded-xl border border-border py-3 text-center text-sm font-medium text-foreground hover:bg-muted"
          >
            Back to Login
          </Link>
        </div>
      )}
    </div>
  );
}

function OrganiserVerifyFallback() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-white">
          <svg className="h-7 w-7 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Loading…</h1>
      </div>
    </div>
  );
}

export default function OrganiserVerifyPage() {
  return (
    <Suspense fallback={<OrganiserVerifyFallback />}>
      <OrganiserVerifyContent />
    </Suspense>
  );
}
