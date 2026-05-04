"use client";

import { useEffect, useState, type FormEvent } from "react";
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

const DRAFT_KEY = "vims:event-draft:v1";
const TTL_MS = 24 * 60 * 60 * 1000;

interface Draft {
  savedAt: string;
  form: CreateEventPayload;
}

const INITIAL_FORM: CreateEventPayload = {
  name: "",
  description: "",
  startAt: "",
  endAt: "",
  venue: "",
  venueMapUrl: "",
  expectedCount: undefined,
  brandPrimary: "#4F46E5",
  brandSecondary: "#818CF8",
};

function readDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Draft;
    if (
      !parsed ||
      typeof parsed.savedAt !== "string" ||
      typeof parsed.form !== "object" ||
      Date.now() - new Date(parsed.savedAt).getTime() > TTL_MS
    ) {
      localStorage.removeItem(DRAFT_KEY);
      return null;
    }
    return parsed;
  } catch {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}

function writeDraft(form: CreateEventPayload) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ savedAt: new Date().toISOString(), form }),
    );
  } catch {
    // localStorage full / disabled — silently swallow
  }
}

function clearDraft() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minutes ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

function isInitialForm(form: CreateEventPayload): boolean {
  return (
    form.name === INITIAL_FORM.name &&
    form.description === INITIAL_FORM.description &&
    form.startAt === INITIAL_FORM.startAt &&
    form.endAt === INITIAL_FORM.endAt &&
    form.venue === INITIAL_FORM.venue &&
    form.venueMapUrl === INITIAL_FORM.venueMapUrl &&
    form.expectedCount === INITIAL_FORM.expectedCount &&
    form.brandPrimary === INITIAL_FORM.brandPrimary &&
    form.brandSecondary === INITIAL_FORM.brandSecondary
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

  const [form, setForm] = useState<CreateEventPayload>(INITIAL_FORM);

  const [draftStatus, setDraftStatus] = useState<"unknown" | "has-draft" | "no-draft">("unknown");
  const [pendingDraft, setPendingDraft] = useState<Draft | null>(null);

  // Mount: check for an existing draft
  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setPendingDraft(draft);
      setDraftStatus("has-draft");
    } else {
      setDraftStatus("no-draft");
    }
  }, []);

  // Save on form change (debounced 400ms), but only after the user has resolved the prompt
  useEffect(() => {
    if (draftStatus !== "no-draft") return;
    if (isInitialForm(form)) return;
    const handle = setTimeout(() => writeDraft(form), 400);
    return () => clearTimeout(handle);
  }, [form, draftStatus]);

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
      clearDraft();
      router.push(`/events/${data.id}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(", ") : (msg ?? "Failed to create event. Please try again."));
    } finally {
      setSubmitting(false);
    }
  }

  function restoreDraft() {
    if (!pendingDraft) return;
    setForm({ ...INITIAL_FORM, ...pendingDraft.form });
    setPendingDraft(null);
    setDraftStatus("no-draft");
  }

  function startFresh() {
    clearDraft();
    setPendingDraft(null);
    setDraftStatus("no-draft");
  }

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto">

      {/* Page title */}
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

      {/* Restore-draft prompt */}
      {draftStatus === "has-draft" && pendingDraft && (
        <div
          role="status"
          className="mb-4 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 shrink-0"
        >
          <svg className="mt-0.5 h-5 w-5 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Continue your draft?</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Started {relativeTime(pendingDraft.savedAt)}.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={restoreDraft}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition-colors"
            >
              Restore draft
            </button>
            <button
              type="button"
              onClick={startFresh}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              Start fresh
            </button>
          </div>
        </div>
      )}

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
