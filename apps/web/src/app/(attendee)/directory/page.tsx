"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/stores/auth-store";
import { apiClient } from "@/lib/api-client";

interface AttendeeProfile {
  id: string;
  firstName: string;
  lastName: string;
  designation: string;
  company: string;
  industry: string;
  city: string;
  profilePhotoUrl?: string;
  tags?: string[];
}

export default function DirectoryPage() {
  const [attendees, setAttendees] = useState<AttendeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const user = useAuthStore((s) => s.user) as { eventId?: string } | null;
  const eventId = (user as { eventId?: string } | null)?.eventId;

  const load = useCallback(async (p = 1, q = "") => {
    if (!eventId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: "20" });
      if (q) params.set("search", q);
      const { data } = await apiClient.get<{ data: AttendeeProfile[]; meta: { totalPages: number } }>(
        `/events/${eventId}/attendees?${params}`
      );
      setAttendees(data.data ?? []);
      setTotalPages(data.meta?.totalPages ?? 1);
      setPage(p);
    } catch {
      setAttendees([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(1, ""); }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => load(1, search), 400);
    return () => clearTimeout(t);
  }, [search, load]);

  function getInitials(a: AttendeeProfile) {
    return `${a.firstName?.[0] ?? ""}${a.lastName?.[0] ?? ""}`.toUpperCase();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Attendee Directory</h1>
        <span className="text-xs text-muted-foreground">{attendees.length} people</span>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, company…"
          className="w-full rounded-xl border border-border bg-muted/40 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none dark:bg-secondary"
        />
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : attendees.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-center gap-2">
          <p className="text-3xl">👥</p>
          <p className="text-sm font-semibold text-muted-foreground">No attendees found</p>
          {search && <button onClick={() => setSearch("")} className="text-xs text-primary hover:underline">Clear search</button>}
        </div>
      ) : (
        <div className="grid gap-3">
          {attendees.map((a) => (
            <Link
              key={a.id}
              href={`/profile/${a.id}?from=directory`}
              className="flex items-center gap-3 rounded-2xl border border-border bg-white dark:bg-card p-3 hover:shadow-md hover:-translate-y-0.5 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {a.profilePhotoUrl ? (
                <img src={a.profilePhotoUrl} alt={a.firstName} className="h-11 w-11 rounded-full object-cover shrink-0" />
              ) : (
                <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {getInitials(a)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{a.firstName} {a.lastName}</p>
                <p className="text-xs text-muted-foreground truncate">{a.designation} · {a.company}</p>
              </div>
              <span className="shrink-0 text-[10px] text-muted-foreground bg-muted rounded-lg px-2 py-1">{a.industry}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button onClick={() => load(page - 1, search)} disabled={page === 1}
            className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted transition-colors">
            Prev
          </button>
          <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
          <button onClick={() => load(page + 1, search)} disabled={page === totalPages}
            className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold disabled:opacity-40 hover:bg-muted transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
