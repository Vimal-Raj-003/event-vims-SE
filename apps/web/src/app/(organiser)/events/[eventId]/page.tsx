"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface EventData {
  id: string;
  name: string;
  status: string;
  startAt: string;
  endAt: string;
  venue: string;
  venueMapUrl?: string;
  slug: string;
  shortHash: string;
  qrUrl?: string;
  expectedCount?: number;
  brandPrimary: string;
  brandSecondary: string;
  description: string;
}

interface EventStats {
  attendeeCount: number;
  connectionsSent: number;
  connectionsAccepted: number;
  acceptanceRate: number;
  activeUsers5m: number;
}

interface Attendee {
  id: string;
  firstName: string;
  lastName: string;
  company: string;
  designation: string;
  industry: string;
}

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function RingChart({ pct, color }: { pct: number; color: string }) {
  const r = 22, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={56} height={56} viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="#f1f5f9" strokeWidth={7} />
      <circle
        cx={28} cy={28} r={r} fill="none"
        stroke={color} strokeWidth={7}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dasharray 1s ease" }}
      />
      <text x={28} y={29} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={700} fill="#1e293b">
        {pct}%
      </text>
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="flex items-center gap-1.5 rounded-xl border border-border bg-muted/30 px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors"
    >
      {copied ? (
        <><svg className="h-3.5 w-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Copied!</>
      ) : (
        <><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy</>
      )}
    </button>
  );
}

const STATUS_CFG: Record<string, { label: string; dot?: string; badge: string }> = {
  PUBLISHED: { label: "Live",  dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-700 border-emerald-100" },
  DRAFT:     { label: "Draft", dot: "bg-amber-400",                  badge: "bg-amber-50 text-amber-700 border-amber-100" },
  ENDED:     { label: "Ended",                                        badge: "bg-muted text-muted-foreground border-border" },
};

export default function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  useRouter();

  const [event, setEvent] = useState<EventData | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");

  const load = useCallback(async () => {
    try {
      const [evtRes, statsRes, attRes] = await Promise.all([
        apiClient.get<EventData>(`/events/${eventId}`),
        apiClient.get<EventStats>(`/events/${eventId}/stats`),
        apiClient.get<{ data: Attendee[] }>(`/events/${eventId}/attendees?pageSize=5`),
      ]);
      setEvent(evtRes.data);
      setStats(statsRes.data);
      setAttendees(attRes.data?.data ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  async function handlePublish() {
    setPublishing(true);
    setPublishError("");
    try {
      await apiClient.post(`/events/${eventId}/publish`);
      await load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setPublishError(msg ?? "Failed to publish event. Please try again.");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <p className="text-lg font-bold text-foreground">Event not found</p>
        <Link href="/events" className="text-sm text-primary hover:underline">← Back to Events</Link>
      </div>
    );
  }

  const cfg = (STATUS_CFG[event.status] ?? STATUS_CFG["DRAFT"])!;
  const date = new Date(event.startAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const frontendOrigin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const joinUrl = `${frontendOrigin}/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`;
  const qrImageSrc = `${API}/qr/${event.shortHash}/image`;
  const acceptPct = stats ? Math.round(stats.acceptanceRate) : 0;
  const fillPct = event.expectedCount && event.expectedCount > 0
    ? Math.min(100, Math.round(((stats?.attendeeCount ?? 0) / event.expectedCount) * 100))
    : 0;

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto scrollbar-none pb-4">

      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-extrabold text-foreground tracking-tight">{event.name}</h1>
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
              {cfg.dot && <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />}
              {cfg.label}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">{date} · {event.venue}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {event.status === "DRAFT" && (
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 transition-all disabled:opacity-60"
            >
              {publishing ? "Publishing…" : "Publish Event"}
            </button>
          )}
          <Link href={`/events/${eventId}/settings`} className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
            Edit
          </Link>
          <Link href={`/events/${eventId}/attendees`} className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-sm hover:brightness-110 transition-all">
            Attendees
          </Link>
        </div>
      </div>

      {publishError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shrink-0">
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
          {publishError}
        </div>
      )}

      {/* ── KPI row ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 shrink-0">
        {[
          { label: "Attendees",    value: stats?.attendeeCount ?? 0,    icon: "👥", color: "text-primary",    bg: "bg-primary/8",    sub: event.expectedCount ? `of ${event.expectedCount} expected` : "registered" },
          { label: "Connections",  value: stats?.connectionsAccepted ?? 0, icon: "🤝", color: "text-emerald-600", bg: "bg-emerald-50",  sub: `${stats?.connectionsSent ?? 0} sent total` },
          { label: "Active Now",   value: stats?.activeUsers5m ?? 0,    icon: "🟢", color: "text-violet-600", bg: "bg-violet-50",   sub: "in last 5 min" },
          { label: "Accept Rate",  value: `${acceptPct}%`,              icon: "📊", color: "text-amber-600",  bg: "bg-amber-50",    sub: "of connection reqs" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-border bg-white p-4 hover:shadow-md hover:shadow-black/5 hover:-translate-y-0.5 transition-all">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <p className={`mt-1 text-2xl font-extrabold tracking-tight ${k.color}`}>{k.value.toLocaleString()}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{k.sub}</p>
              </div>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${k.bg}`}>{k.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts + QR row ──────────────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-3 shrink-0">

        {/* Connection acceptance chart */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <p className="text-sm font-bold text-foreground mb-4">Connection Rates</p>
          <div className="flex items-center gap-6">
            <RingChart pct={acceptPct} color="#10b981" />
            <div className="space-y-3 flex-1">
              {[
                { label: "Accepted", value: stats?.connectionsAccepted ?? 0, color: "bg-emerald-500" },
                { label: "Pending",  value: Math.max(0, (stats?.connectionsSent ?? 0) - (stats?.connectionsAccepted ?? 0)), color: "bg-amber-400" },
              ].map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${r.color}`} />
                  <span className="text-xs text-muted-foreground flex-1">{r.label}</span>
                  <span className="text-xs font-bold text-foreground">{r.value}</span>
                </div>
              ))}
              {event.expectedCount && (
                <div className="pt-1">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                    <span>Fill rate</span><span>{fillPct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${fillPct}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent attendees */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground">Recent Attendees</p>
            <Link href={`/events/${eventId}/attendees`} className="text-xs font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-2">
            {attendees.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No attendees yet</p>
            )}
            {attendees.map((a) => (
              <div key={a.id} className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet-500 text-[10px] font-bold text-white">
                  {a.firstName[0]}{a.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">{a.firstName} {a.lastName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{a.designation} · {a.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Code panel */}
        <div className="rounded-2xl border border-border bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-bold text-foreground">Event QR Code</p>
            {event.status === "DRAFT" && (
              <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">Draft</span>
            )}
          </div>
          <div className="flex flex-col items-center gap-3">

            {/* QR image — large, clearly visible */}
            <div className="w-full flex items-center justify-center rounded-2xl bg-white border-2 border-primary/15 shadow-inner p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrImageSrc}
                alt="Scan to join event"
                style={{ width: "180px", height: "180px", display: "block", imageRendering: "pixelated" }}
                className="rounded-lg shadow-md"
              />
            </div>

            <p className="text-[11px] text-center text-muted-foreground">
              Scan to register for this event
            </p>

            {/* Download button */}
            <a
              href={`${API}/qr/${event.shortHash}/download`}
              download
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-110 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download High-Res QR (800px)
            </a>

            {/* Join link */}
            <div className="w-full">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Attendee join link</p>
              <div className="flex items-center gap-1.5">
                <p className="flex-1 truncate rounded-lg bg-muted/50 border border-border px-2 py-1.5 text-[10px] font-mono text-muted-foreground">{joinUrl}</p>
                <CopyButton text={joinUrl} />
              </div>
            </div>

            {event.status === "DRAFT" && (
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-60"
              >
                {publishing ? "Publishing…" : "Publish to activate QR"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick links ───────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-4 shrink-0">
        {[
          { href: `/events/${eventId}/attendees`,    icon: "👥", label: "Attendees",   desc: "View & manage" },
          { href: `/events/${eventId}/announcements`,icon: "📢", label: "Announce",    desc: "Send updates" },
          { href: `/events/${eventId}/export`,       icon: "📥", label: "Export",      desc: "Download Excel" },
          { href: `/events/${eventId}/settings`,     icon: "⚙️", label: "Settings",    desc: "Edit event" },
        ].map((a) => (
          <Link key={a.label} href={a.href}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-white p-3 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-lg group-hover:scale-110 transition-transform">{a.icon}</div>
            <div>
              <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
