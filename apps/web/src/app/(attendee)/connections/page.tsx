"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

interface Connection {
  connectionId: string;
  connectedAt: string | null;
  attendee: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
    company: string;
    industry: string;
    email: string;
    phone: string;
    profilePhotoUrl?: string;
    services: string[];
    tags: string[];
  };
}

export default function ConnectionsPage() {
  const eventId = useAuthStore((s) => s.activeEventId) ?? "";
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    apiClient
      .get<Connection[]>(`/events/${eventId}/connections`)
      .then(({ data }) => setConnections(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [eventId]);

  async function downloadVCard(attendeeId: string, _name: string) {
    try {
      const { data } = await apiClient.get<{ content: string; filename: string }>(
        `/attendees/${attendeeId}/vcard`
      );
      const blob = new Blob([data.content], { type: "text/vcard" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download vCard.");
    }
  }

  if (loading) return <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">My Connections</h1>
        <span className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-semibold text-primary">
          {connections.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        People you&apos;ve connected with at this event
      </p>

      {connections.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">No connections yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Browse the directory and send connection requests</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {connections.map((conn) => (
            <div key={conn.connectionId} className="rounded-xl border border-border bg-white">
              <button
                className="w-full p-4 text-left"
                onClick={() => setExpanded(expanded === conn.connectionId ? null : conn.connectionId)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary">
                    {conn.attendee.firstName[0]}{conn.attendee.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {conn.attendee.firstName} {conn.attendee.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {conn.attendee.designation} · {conn.attendee.company}
                    </p>
                  </div>
                  <svg
                    className={`h-4 w-4 text-muted-foreground transition-transform ${expanded === conn.connectionId ? "rotate-180" : ""}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expanded === conn.connectionId && (
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
                      <span>{conn.attendee.email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg>
                      <span>{conn.attendee.phone}</span>
                    </div>
                  </div>
                  {conn.attendee.services.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {conn.attendee.services.map((s) => (
                        <span key={s} className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary">{s}</span>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={() => downloadVCard(conn.attendee.id, `${conn.attendee.firstName} ${conn.attendee.lastName}`)}
                    className="mt-3 w-full rounded-lg border border-border py-2 text-xs font-medium text-foreground hover:bg-muted"
                  >
                    Download vCard
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
