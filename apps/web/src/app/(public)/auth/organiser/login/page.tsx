"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient, setStoredTokens } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRouter } from "next/navigation";

export default function OrganiserLoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      const { data } = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: { id: string; email: string; name: string; organisation: string };
      }>("/auth/organiser/login", form);
      setStoredTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      login({ id: data.user.id, email: data.user.email, name: data.user.name, role: "organiser", organisation: data.user.organisation }, data.accessToken, data.refreshToken);
      router.push("/dashboard");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">Log in to your organiser dashboard</p>
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
            placeholder="you@company.com"
            {...field("email")}
            className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-semibold text-foreground">Password</label>
            <Link href="#" className="text-xs font-medium text-primary hover:text-primary-600 transition-colors">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              {...field("password")}
              className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword
                ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="group relative w-full overflow-hidden rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Logging in…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Log In
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </span>
          )}
        </button>
      </form>

      <div className="mt-4 rounded-2xl bg-muted/50 border border-border px-4 py-3">
        <p className="text-xs text-muted-foreground font-medium">Test credentials</p>
        <p className="text-xs text-foreground mt-0.5">testorganiser@example.com · Organiser@2026</p>
      </div>

      {/* Attendee login CTA */}
      <Link
        href="/auth/attendee/login"
        className="mt-5 flex items-center justify-between w-full rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3.5 transition-all hover:bg-emerald-100 hover:border-emerald-300 group"
      >
        <div>
          <p className="text-sm font-bold text-emerald-800">Attendee? Join your event</p>
          <p className="text-xs text-emerald-600 mt-0.5">Sign in with email OTP — no password needed</p>
        </div>
        <svg className="h-4 w-4 text-emerald-600 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
        </svg>
      </Link>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/auth/organiser/signup" className="font-semibold text-primary hover:text-primary-600 transition-colors">
          Sign up free
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground/60">
        Platform admin?{" "}
        <Link href="/auth/super-admin/login" className="font-medium text-muted-foreground hover:text-foreground transition-colors">
          Admin login
        </Link>
      </p>
    </div>
  );
}
