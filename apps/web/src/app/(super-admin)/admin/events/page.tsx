"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Event { id: string; name: string; venue: string; startAt: string; status: string; attendeeCount: number; organiser: { name: string; organisation: string }; }

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const fetch = useCallback(async (p: number, q: string, s: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: "20" });
      if (q) params.set("search", q); if (s) params.set("status", s);
      const { data } = await apiClient.get<{ data: Event[]; meta: { totalPages: number } }>(`/admin/events?${params}`);
      setEvents(data.data); setTotalPages(data.meta.totalPages);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => fetch(1, search, status), 300); return () => clearTimeout(t); }, [search, status, fetch]);
  useEffect(() => { fetch(page, search, status); }, [page, fetch, search, status]);

  const sc: Record<string, string> = { PUBLISHED: "bg-emerald-50 text-emerald-700", DRAFT: "bg-yellow-50 text-yellow-700", DELETED: "bg-red-50 text-red-700" };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">All Events</h1>
        <p className="mt-1 text-sm text-muted-foreground">Cross-tenant event management</p>
      </div>
      <div className="flex gap-3">
        <input type="search" placeholder="Search events…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="flex-1 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} className="rounded-2xl border border-border bg-white px-3 py-2.5 text-sm focus:outline-none">
          {["","DRAFT","PUBLISHED","DELETED"].map(s => <option key={s} value={s}>{s || "All statuses"}</option>)}
        </select>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40"><tr>{["Event","Organiser","Date","Attendees","Status",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-border">
            {loading ? <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">Loading…</td></tr>
            : events.length === 0 ? <tr><td colSpan={6} className="py-12 text-center text-sm text-muted-foreground">No events found</td></tr>
            : events.map(ev => (
              <tr key={ev.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3"><p className="text-sm font-semibold text-foreground">{ev.name}</p><p className="text-xs text-muted-foreground">{ev.venue}</p></td>
                <td className="px-4 py-3"><p className="text-sm text-foreground">{ev.organiser.name}</p><p className="text-xs text-muted-foreground">{ev.organiser.organisation}</p></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(ev.startAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{ev.attendeeCount}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${sc[ev.status] ?? "bg-muted text-muted-foreground"}`}>{ev.status}</span></td>
                <td className="px-4 py-3"><Link href={`/admin/events/${ev.id}`} className="text-xs font-semibold text-primary hover:underline">View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="rounded-xl border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Previous</button><button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="rounded-xl border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Next</button></div></div>}
    </div>
  );
}
