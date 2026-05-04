"use client";

import { useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

interface OrganiserEvent {
  id: string;
  status?: string;
}

type ActivityType =
  | "attendee_registered"
  | "announcement_sent"
  | "attendees_milestone"
  | "connection_milestone";

interface ActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  body: string;
  timestamp: string;
  relatedEntityId?: string;
}

interface ActivityResponse {
  data: ActivityItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const TYPE_STYLES: Record<ActivityType, { ring: string; tint: string }> = {
  attendee_registered: { ring: "border-emerald-500/20 text-emerald-500", tint: "bg-emerald-500/10" },
  announcement_sent: { ring: "border-indigo-500/20 text-indigo-500", tint: "bg-indigo-500/10" },
  attendees_milestone: { ring: "border-amber-500/20 text-amber-500", tint: "bg-amber-500/10" },
  connection_milestone: { ring: "border-amber-500/20 text-amber-500", tint: "bg-amber-500/10" },
};

const TYPE_ICONS: Record<ActivityType, ReactNode> = {
  attendee_registered: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
    </svg>
  ),
  announcement_sent: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
    </svg>
  ),
  attendees_milestone: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
    </svg>
  ),
  connection_milestone: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
    </svg>
  ),
};

export default function OrganiserActivityPage() {
  const user = useAuthStore((s) => s.user) as { eventId?: string } | null;
  const activeEventId = useAuthStore((s) => s.activeEventId);
  const [eventId, setEventId] = useState<string | null>(user?.eventId ?? activeEventId ?? null);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const load = async (targetPage: number, append: boolean, idOverride?: string) => {
    const id = idOverride ?? eventId;
    if (!id) return;
    setLoading(true);
    setErrored(false);
    try {
      const { data } = await apiClient.get<ActivityResponse>(
        `/organiser/events/${id}/activity?page=${targetPage}&pageSize=25`,
      );
      setItems((prev) => (append ? [...prev, ...data.data] : data.data));
      setTotalPages(data.meta.totalPages);
      setPage(data.meta.page);
    } catch {
      setErrored(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      let id = eventId;
      if (!id) {
        try {
          const { data } = await apiClient.get<OrganiserEvent[]>("/events");
          const events = data ?? [];
          const preferred = events.find((e) => e.status === "PUBLISHED") ?? events[0];
          id = preferred?.id ?? null;
          if (cancelled) return;
          if (id) setEventId(id);
        } catch {
          if (!cancelled) {
            setErrored(true);
            setLoading(false);
          }
          return;
        }
      }
      if (!id) {
        if (!cancelled) setLoading(false);
        return;
      }
      if (!cancelled) await load(1, false, id);
    }
    bootstrap();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasMore = page < totalPages;

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-foreground">Activity</h1>
        <p className="mt-1 text-sm text-muted-foreground">What&apos;s happening in your event</p>
      </div>

      {loading && items.length === 0 ? (
        <div className="mt-6 space-y-2" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : errored ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-foreground font-semibold mb-2">Could not load activity</p>
          <button
            onClick={() => load(1, false)}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No activity yet. Once attendees register or you send announcements, you&apos;ll see them here.
          </p>
        </div>
      ) : (
        <>
          <ul role="list" className="mt-6 space-y-2">
            {items.map((item) => {
              const styles = TYPE_STYLES[item.type];
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:bg-muted/40 transition-colors"
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${styles.ring} ${styles.tint} shrink-0`}
                    aria-hidden="true"
                  >
                    {TYPE_ICONS[item.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.body}</p>
                  </div>
                  <time
                    dateTime={item.timestamp}
                    className="text-xs text-muted-foreground/60 shrink-0 mt-0.5"
                  >
                    {timeAgo(item.timestamp)}
                  </time>
                </li>
              );
            })}
          </ul>

          {hasMore && (
            <div className="mt-6 text-center">
              <button
                onClick={() => load(page + 1, true)}
                disabled={loading}
                className="px-5 py-2 rounded-lg border border-border text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                {loading ? "Loading…" : "Load more →"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
