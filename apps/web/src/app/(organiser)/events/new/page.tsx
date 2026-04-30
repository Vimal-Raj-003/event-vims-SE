"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface CreateEventPayload {
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  venue: string;
  venueMapUrl: string;
  expectedCount: number | undefined;
  brandPrimary: string;
  brandSecondary: string;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

const inputCls = "block w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all";

export default function NewEventPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [allowExport, setAllowExport] = useState(true);
  const [requireApproval, setRequireApproval] = useState(false);

  const [form, setForm] = useState<CreateEventPayload>({
    name: "",
    description: "",
    startAt: "",
    endAt: "",
    venue: "",
    venueMapUrl: "",
    expectedCount: undefined,
    brandPrimary: "#4F46E5",
    brandSecondary: "#818CF8",
  });

  const set = (key: keyof CreateEventPayload, value: string | number | undefined) =>
    setForm((p) => ({ ...p, [key]: value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!form.startAt || !form.endAt) {
      setError("Please select both start and end date/time.");
      return;
    }
    if (new Date(form.endAt) <= new Date(form.startAt)) {
      setError("End date/time must be after start date/time.");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        venue: form.venue,
        ...(form.venueMapUrl && { venueMapUrl: form.venueMapUrl }),
        ...(form.expectedCount && { expectedCount: form.expectedCount }),
        brandPrimary: form.brandPrimary,
        brandSecondary: form.brandSecondary,
      };
      const { data } = await apiClient.post<{ id: string }>("/events", payload);
      router.push(`/events/${data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Failed to create event. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">

      {/* Page title — compact, no back link needed (sidebar has Events nav) */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Create Event</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Fill in the details below to launch your event</p>
        </div>
        <Link href="/events" className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back
        </Link>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-xl bg-destructive/5 border border-destructive/20 px-4 py-3 shrink-0">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto scrollbar-none">
        <div className="grid gap-4 lg:grid-cols-3">

          {/* ── Left: Event details (2 cols wide) ──────────────────── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Section: Basics */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Event Details</p>
              <div className="space-y-3">
                <Field label="Event Name" required>
                  <input
                    type="text" required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Bengaluru Tech Summit 2026"
                    className={inputCls}
                  />
                </Field>

                <Field label="Description" required>
                  <textarea
                    required rows={2}
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    placeholder="Brief overview of your event…"
                    className={inputCls + " resize-none"}
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Start Date & Time" required>
                    <input
                      type="datetime-local" required
                      value={form.startAt}
                      onChange={(e) => set("startAt", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="End Date & Time" required>
                    <input
                      type="datetime-local" required
                      value={form.endAt}
                      onChange={(e) => set("endAt", e.target.value)}
                      className={inputCls}
                    />
                  </Field>
                </div>

                <Field label="Venue" required>
                  <input
                    type="text" required
                    value={form.venue}
                    onChange={(e) => set("venue", e.target.value)}
                    placeholder="NIMHANS Convention Centre, Bengaluru"
                    className={inputCls}
                  />
                </Field>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Venue Map URL" hint="Optional Google Maps link">
                    <input
                      type="url"
                      value={form.venueMapUrl}
                      onChange={(e) => set("venueMapUrl", e.target.value)}
                      placeholder="https://maps.google.com/…"
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Expected Attendees" hint="Optional capacity estimate">
                    <input
                      type="number" min={1}
                      value={form.expectedCount ?? ""}
                      onChange={(e) => set("expectedCount", e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="200"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Section: Rules */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Networking Rules</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Allow Contact Export</p>
                    <p className="text-xs text-muted-foreground">Attendees can export connections as vCard</p>
                  </div>
                  <Toggle checked={allowExport} onChange={() => setAllowExport((v) => !v)} />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Require Connection Approval</p>
                    <p className="text-xs text-muted-foreground">Requests must be accepted before details are shared</p>
                  </div>
                  <Toggle checked={requireApproval} onChange={() => setRequireApproval((v) => !v)} />
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Branding + Preview + Submit ─────────────────── */}
          <div className="space-y-4">
            {/* Branding */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">Branding</p>
              <div className="space-y-3">
                <Field label="Primary Colour">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.brandPrimary}
                      onChange={(e) => set("brandPrimary", e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-white p-0.5"
                    />
                    <input
                      type="text"
                      value={form.brandPrimary}
                      onChange={(e) => set("brandPrimary", e.target.value)}
                      className={inputCls + " font-mono"}
                    />
                  </div>
                </Field>
                <Field label="Secondary Colour">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.brandSecondary}
                      onChange={(e) => set("brandSecondary", e.target.value)}
                      className="h-9 w-9 cursor-pointer rounded-lg border border-border bg-white p-0.5"
                    />
                    <input
                      type="text"
                      value={form.brandSecondary}
                      onChange={(e) => set("brandSecondary", e.target.value)}
                      className={inputCls + " font-mono"}
                    />
                  </div>
                </Field>
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-2xl border border-border bg-white p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Preview</p>
              <div className="overflow-hidden rounded-xl border border-border">
                <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${form.brandPrimary}, ${form.brandSecondary})` }} />
                <div className="p-3">
                  <p className="text-sm font-bold text-foreground truncate">{form.name || "Your Event Name"}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{form.venue || "Event venue"}</p>
                  <div className="mt-2 flex gap-1.5">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: form.brandPrimary }}>Live</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: form.brandSecondary }}>Networking</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-primary py-3.5 text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all hover:brightness-110 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Creating Event…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Create Event
                </span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
