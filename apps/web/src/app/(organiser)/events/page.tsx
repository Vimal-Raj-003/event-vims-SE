"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Event {
  id: string;
  name: string;
  status: string;
  startAt: string;
  endAt: string;
  venue: string;
  attendeeCount: number;
  expectedCount?: number;
  slug: string;
}

const STATUS_CFG: Record<string, { label: string; dot?: string; badge: string; bar: string }> = {
  PUBLISHED: { label: "Live",      dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-700 border-emerald-100", bar: "#10b981" },
  DRAFT:     { label: "Draft",     dot: "bg-amber-400",                  badge: "bg-amber-50 text-amber-700 border-amber-100",       bar: "#f59e0b" },
  ENDED:     { label: "Ended",                                            badge: "bg-muted text-muted-foreground border-border",      bar: "#94a3b8" },
  CANCELLED: { label: "Cancelled",                                        badge: "bg-red-50 text-red-700 border-red-100",             bar: "#ef4444" },
};
const getS = (s: string) => (STATUS_CFG[s] ?? STATUS_CFG["DRAFT"])!;

type Filter = "ALL" | "PUBLISHED" | "DRAFT" | "ENDED";

export default function EventsListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    apiClient.get<Event[]>("/events")
      .then(({ data }) => setEvents(data ?? []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = events.filter((e) => {
    const matchFilter = filter === "ALL" || e.status === filter;
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.venue.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    ALL: events.length,
    PUBLISHED: events.filter((e) => e.status === "PUBLISHED").length,
    DRAFT: events.filter((e) => e.status === "DRAFT").length,
    ENDED: events.filter((e) => e.status === "ENDED").length,
  };

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">

      {/* Header row — no duplicate create button */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div>
          <h1 className="text-xl font-extrabold text-foreground tracking-tight">Events</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {events.length} event{events.length !== 1 ? "s" : ""} · {counts.PUBLISHED} live
          </p>
        </div>
        {/* Search */}
        <div className="relative sm:w-64">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search events…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-border bg-white pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 shrink-0">
        {(["ALL", "PUBLISHED", "DRAFT", "ENDED"] as Filter[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-all duration-150 ${
              filter === tab
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab === "ALL" ? "All" : tab === "PUBLISHED" ? "Live" : tab.charAt(0) + tab.slice(1).toLowerCase()}
            <span className="ml-1.5 text-[10px] opacity-60">({counts[tab]})</span>
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto space-y-2.5 scrollbar-none pr-0.5">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        {!loading && visible.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 py-16 text-center">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {search ? "No events match your search" : "No events yet"}
            </p>
            {!search && (
              <Link href="/events/new" className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110 transition-all">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Create First Event
              </Link>
            )}
          </div>
        )}

        {!loading && visible.map((event) => {
          const s = getS(event.status);
          const fillPct = event.expectedCount && event.expectedCount > 0
            ? Math.min(100, Math.round((event.attendeeCount / event.expectedCount) * 100))
            : 0;
          const date = new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

          return (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5"
            >
              {/* Status indicator */}
              <div className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0 ${
                event.status === "PUBLISHED" ? "bg-emerald-50" :
                event.status === "DRAFT" ? "bg-amber-50" : "bg-muted"
              }`}>
                <svg className={`h-5 w-5 ${event.status === "PUBLISHED" ? "text-emerald-600" : event.status === "DRAFT" ? "text-amber-600" : "text-muted-foreground"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>

              {/* Main info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate">{event.name}</h3>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0 ${s.badge}`}>
                    {s.dot && <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
                    {s.label}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground flex items-center gap-1">
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/></svg>
                  {event.venue} · {date}
                </p>
                {/* Fill rate bar */}
                {event.expectedCount && event.expectedCount > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${fillPct}%`, background: s.bar }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{fillPct}% filled</span>
                  </div>
                )}
              </div>

              {/* Attendee count */}
              <div className="text-right shrink-0">
                <p className="text-lg font-extrabold text-foreground">{event.attendeeCount.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Attendees</p>
              </div>

              <svg className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
