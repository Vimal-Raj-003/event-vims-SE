"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

interface Announcement {
  id: string;
  title: string;
  body: string;
  linkUrl?: string;
  sentAt: string;
  recipientCount: number;
}

export default function AnnouncementsPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", linkUrl: "" });
  const [error, setError] = useState("");

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{
        items?: Announcement[];
        data?: Announcement[];
      } | Announcement[]>(`/events/${eventId}/announcements`);
      const list = Array.isArray(data)
        ? data
        : (data.items ?? data.data ?? []);
      setAnnouncements(list);
    } catch {
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSending(true);
    try {
      await apiClient.post(`/events/${eventId}/announcements`, {
        title: form.title,
        body: form.body,
        linkUrl: form.linkUrl || undefined,
      });
      setForm({ title: "", body: "", linkUrl: "" });
      setShowForm(false);
      fetchAnnouncements();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to send announcement.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Announcements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Broadcast messages to all event attendees
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Announcement
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSend} className="mt-6 rounded-xl border border-border bg-white p-6 space-y-4">
          <h2 className="font-semibold text-foreground">Send Announcement</h2>
          <div>
            <label className="block text-sm font-medium text-foreground">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={100}
              placeholder="e.g. Lunch is served in Hall B"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Message</label>
            <textarea
              required
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              maxLength={500}
              rows={3}
              placeholder="Enter your announcement…"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{form.body.length}/500</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground">Link (optional)</label>
            <input
              type="url"
              value={form.linkUrl}
              onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
              placeholder="https://…"
              className="mt-1 w-full rounded-xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          {error && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={sending} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50">
              {sending ? "Sending…" : "Send to All Attendees"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : announcements.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">No announcements sent yet.</p>
          </div>
        ) : (
          announcements.map((ann) => (
            <div key={ann.id} className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-foreground">{ann.title}</h3>
                <span className="text-xs text-muted-foreground">
                  {new Date(ann.sentAt).toLocaleString("en-GB")}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ann.body}</p>
              {ann.linkUrl && (
                <a href={ann.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block text-xs text-primary hover:underline">
                  {ann.linkUrl}
                </a>
              )}
              <p className="mt-3 text-xs text-muted-foreground">
                Sent to {ann.recipientCount} attendees
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
