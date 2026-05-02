"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function OrganiserVerifyPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token found. Please check your email link.");
      return;
    }

    apiClient
      .post("/auth/organiser/verify-email", { token })
      .then(() => {
        setStatus("success");
        setMessage("Your email has been verified. You can now log in.");
        setTimeout(() => router.push("/auth/organiser/login"), 2500);
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.response?.data?.message ??
            "Verification failed. The link may have expired."
        );
      });
  }, [token, router]);

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
          {status === "error" && (
            <svg className="h-7 w-7 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {status === "verifying" && "Verifying your email…"}
          {status === "success" && "Email Verified!"}
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
        {status === "error" && !token && (
          <p className="mt-1 text-xs text-muted-foreground">
            Tip: Check your spam/junk folder for the verification email.
          </p>
        )}
      </div>

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
