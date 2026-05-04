"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { InviteAttendeeModal } from "@/components/organiser/InviteAttendeeModal";

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation: string;
  company: string;
  businessType: string;
  industry: string;
  city: string;
  registeredAt: string;
  isPaused: boolean;
}

interface Meta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export default function AttendeesPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [eventName, setEventName] = useState<string>("this event");

  const fetchAttendees = useCallback(
    async (q: string, p: number) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p), pageSize: "50" });
        if (q) params.set("search", q);
        const { data } = await apiClient.get<{ data: Attendee[]; meta: Meta }>(
          `/events/${eventId}/attendees?${params}`
        );
        setAttendees(data.data);
        setMeta(data.meta);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    },
    [eventId]
  );

  useEffect(() => {
    const t = setTimeout(() => fetchAttendees(search, 1), 300);
    return () => clearTimeout(t);
  }, [search, fetchAttendees]);

  useEffect(() => {
    if (!eventId) return;
    apiClient
      .get<{ name?: string; data?: { name?: string } }>(`/events/${eventId}`)
      .then(({ data }) => {
        const name = data?.name ?? data?.data?.name;
        if (name) setEventName(name);
      })
      .catch(() => {
        // ignore — fallback "this event"
      });
  }, [eventId]);

  useEffect(() => {
    fetchAttendees(search, page);
  }, [page, fetchAttendees, search]);

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendees</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {meta?.total ?? 0} registered attendees
          </p>
        </div>
        <button
          onClick={() => setInviteOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm px-4 py-2 hover:bg-primary/90 transition-colors"
        >
          Invite attendee
        </button>
      </div>

      <div className="mt-6 relative">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          type="search"
          placeholder="Search by name or company…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full rounded-xl border border-border bg-white py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border bg-white">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/50">
            <tr>
              {["Name", "Company", "Industry", "City", "Registered", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Loading…</td></tr>
            ) : attendees.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No attendees found</td></tr>
            ) : (
              attendees.map((a) => (
                <tr key={a.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary">
                        {a.firstName[0]}{a.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{a.firstName} {a.lastName}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{a.company}<br/><span className="text-xs text-muted-foreground">{a.designation}</span></td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.industry}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{a.city}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(a.registeredAt).toLocaleDateString("en-GB")}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isPaused ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
                      {a.isPaused ? "Paused" : "Active"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>Page {meta.page} of {meta.totalPages}</span>
          <div className="flex gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-50">Previous</button>
            <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages} className="rounded-lg border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      <InviteAttendeeModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onInvited={() => fetchAttendees(search, 1)}
        eventId={eventId}
        eventName={eventName}
      />
    </div>
  );
}
