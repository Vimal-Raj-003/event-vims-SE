"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface EventSettings {
  id: string;
  name: string;
  description: string;
  startAt: string;
  endAt: string;
  venue: string;
  venueMapUrl?: string;
  brandPrimary: string;
  brandSecondary: string;
  qrUrl?: string;
  shortHash: string;
  status: string;
}

export default function EventSettingsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<EventSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", description: "", venue: "", venueMapUrl: "",
    brandPrimary: "#4F46E5", brandSecondary: "#818CF8",
  });

  const fetchEvent = useCallback(async () => {
    try {
      const { data } = await apiClient.get<EventSettings>(`/events/${eventId}`);
      setEvent(data);
      setForm({
        name: data.name,
        description: data.description,
        venue: data.venue,
        venueMapUrl: data.venueMapUrl ?? "",
        brandPrimary: data.brandPrimary,
        brandSecondary: data.brandSecondary,
      });
    } catch {
      setError("Failed to load event settings.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchEvent(); }, [fetchEvent]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      await apiClient.patch(`/events/${eventId}`, form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Event Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Update your event details and branding</p>

      {event?.status === "PUBLISHED" && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-blue-700">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          This event is live. Changes are saved and visible immediately to attendees.
        </div>
      )}

      <form onSubmit={handleSave} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-foreground">Event Name</label>
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Description</label>
          <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} maxLength={500} className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Venue</label>
          <input value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} required className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground">Venue Map URL (optional)</label>
          <input type="url" value={form.venueMapUrl} onChange={(e) => setForm((f) => ({ ...f, venueMapUrl: e.target.value }))} placeholder="https://maps.google.com/…" className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground">Primary Colour</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="color" value={form.brandPrimary} onChange={(e) => setForm((f) => ({ ...f, brandPrimary: e.target.value }))} className="h-10 w-14 cursor-pointer rounded-lg border border-border" />
              <span className="text-sm text-muted-foreground">{form.brandPrimary}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Secondary Colour</label>
            <div className="mt-1 flex items-center gap-2">
              <input type="color" value={form.brandSecondary} onChange={(e) => setForm((f) => ({ ...f, brandSecondary: e.target.value }))} className="h-10 w-14 cursor-pointer rounded-lg border border-border" />
              <span className="text-sm text-muted-foreground">{form.brandSecondary}</span>
            </div>
          </div>
        </div>

        {event?.status === "PUBLISHED" && event.shortHash && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">QR Code</p>
            <div className="flex items-start gap-4">
              <div className="rounded-xl border-2 border-primary/15 bg-white p-2 shadow-sm shrink-0">
                <img
                  src={`${API}/qr/${event.shortHash}/image`}
                  alt="Event QR Code"
                  style={{ width: 120, height: 120, display: "block", imageRendering: "pixelated" }}
                  className="rounded-lg"
                />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <p className="text-xs text-muted-foreground">Attendees scan this to register for your event</p>
                <p className="text-[10px] font-mono text-muted-foreground break-all line-clamp-2">{event.qrUrl}</p>
                <a
                  href={`${API}/qr/${event.shortHash}/download`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Download High-Res (800px)
                </a>
              </div>
            </div>
          </div>
        )}

        {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        {saved && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">Changes saved successfully.</p>}

        <button type="submit" disabled={saving} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}
