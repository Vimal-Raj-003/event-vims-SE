"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

interface Event {
  id: string;
  name: string;
  status: string;
  startAt: string;
  venue: string;
  attendeeCount: number;
}

interface DashStats {
  totalEvents: number;
  totalAttendees: number;
  liveCount: number;
  upcomingCount: number;
  endedCount: number;
  events: Event[];
}

/* ── tiny inline SVG charts ─────────────────────────────────────── */

function MiniBarChart({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const w = 48, h = 24, gap = 2;
  const bw = (w - gap * (values.length - 1)) / values.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      {values.map((v, i) => {
        const bh = Math.max(2, (v / max) * h);
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={h - bh}
            width={bw}
            height={bh}
            rx="1"
            fill={color}
            opacity={i === values.length - 1 ? 1 : 0.4}
          />
        );
      })}
    </svg>
  );
}

function DonutChart({ segments }: { segments: { value: number; color: string; label: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 28, cx = 36, cy = 36, stroke = 10;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={72} height={72} viewBox="0 0 72 72">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" className="text-[10px] font-black fill-slate-800" fontSize={12} fontWeight={800}>
        {total}
      </text>
    </svg>
  );
}

function AttendeeBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-[10px] font-semibold text-muted-foreground w-7 text-right">{pct}%</span>
    </div>
  );
}

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string; color: string }> = {
  PUBLISHED: { label: "Live",     dot: "bg-emerald-500 animate-pulse", badge: "bg-emerald-50 text-emerald-700 border-emerald-100", color: "#10b981" },
  DRAFT:     { label: "Draft",    dot: "bg-amber-400",                  badge: "bg-amber-50 text-amber-700 border-amber-100",       color: "#f59e0b" },
  ENDED:     { label: "Ended",    dot: "bg-slate-400",                  badge: "bg-muted text-muted-foreground border-border",      color: "#94a3b8" },
  CANCELLED: { label: "Cancelled",dot: "bg-red-400",                    badge: "bg-red-50 text-red-700 border-red-100",             color: "#ef4444" },
};
const getStatus = (s: string) => (STATUS_CFG[s] ?? STATUS_CFG["DRAFT"])!;

export default function DashboardPage() {
  useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  async function load() {
    try {
      const { data } = await apiClient.get<Event[]>("/events");
      const events = data ?? [];
      setStats({
        totalEvents: events.length,
        totalAttendees: events.reduce((s, e) => s + (e.attendeeCount ?? 0), 0),
        liveCount: events.filter((e) => e.status === "PUBLISHED").length,
        upcomingCount: events.filter((e) => e.status === "DRAFT").length,
        endedCount: events.filter((e) => e.status === "ENDED").length,
        events: events.slice(0, 6),
      });
      setLastUpdated(new Date());
      setSecondsAgo(0);
    } catch {
      setStats({ totalEvents: 0, totalAttendees: 0, liveCount: 0, upcomingCount: 0, endedCount: 0, events: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const poll = setInterval(load, 30_000);
    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick seconds-ago counter
  useEffect(() => {
    if (!lastUpdated) return;
    const tick = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 5000);
    return () => clearInterval(tick);
  }, [lastUpdated]);

  const maxAttendees = Math.max(...(stats?.events.map((e) => e.attendeeCount) ?? [1]), 1);

  const barValues = stats?.events.length
    ? stats.events.map((e) => e.attendeeCount)
    : [0, 0, 0];

  const donutSegments = [
    { label: "Live",     value: stats?.liveCount ?? 0,     color: "#10b981" },
    { label: "Draft",    value: stats?.upcomingCount ?? 0, color: "#f59e0b" },
    { label: "Ended",    value: stats?.endedCount ?? 0,    color: "#94a3b8" },
  ].filter((s) => s.value > 0);

  if (donutSegments.length === 0) {
    donutSegments.push({ label: "No events", value: 1, color: "#e2e8f0" });
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">

      {/* ── Updated badge ─────────────────────────────────────────── */}
      {lastUpdated && (
        <div className="flex justify-end -mb-2">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Updated {secondsAgo < 10 ? "just now" : `${secondsAgo}s ago`}
          </span>
        </div>
      )}

      {/* ── Row 1: KPI cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "Total Events", value: stats?.totalEvents ?? 0,
            icon: "📅", color: "text-primary", bg: "bg-primary/8",
            bars: [1,2,stats?.endedCount??0, stats?.liveCount??0, stats?.totalEvents??0],
            barColor: "#4f46e5",
            sub: `${stats?.liveCount ?? 0} live · ${stats?.upcomingCount ?? 0} draft`,
            gFrom: "#4f46e5", gTo: "#7c3aed", dot: "#4f46e5",
          },
          {
            label: "Total Attendees", value: stats?.totalAttendees ?? 0,
            icon: "👥", color: "text-violet-600", bg: "bg-violet-50",
            bars: barValues.slice(-5),
            barColor: "#7c3aed",
            sub: `Across ${stats?.totalEvents ?? 0} events`,
            gFrom: "#7c3aed", gTo: "#a855f7", dot: "#7c3aed",
          },
          {
            label: "Live Events", value: stats?.liveCount ?? 0,
            icon: "🟢", color: "text-emerald-600", bg: "bg-emerald-50",
            bars: [0, stats?.liveCount??0, stats?.liveCount??0],
            barColor: "#10b981",
            sub: "Currently active",
            gFrom: "#10b981", gTo: "#059669", dot: "#10b981",
          },
          {
            label: "Avg. Attendance", value: stats?.totalEvents
              ? Math.round((stats.totalAttendees / stats.totalEvents)) : 0,
            icon: "📊", color: "text-amber-600", bg: "bg-amber-50",
            bars: barValues.slice(-5),
            barColor: "#d97706",
            sub: "Per event average",
            gFrom: "#d97706", gTo: "#f59e0b", dot: "#d97706",
          },
        ].map((kpi) => (
          <div key={kpi.label} className="group relative rounded-2xl border border-border bg-white dark:bg-card p-4 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-transparent">
            {/* Dot-grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04] group-hover:opacity-[0.09] transition-opacity duration-300 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`dots-${kpi.label}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill={kpi.dot} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#dots-${kpi.label})`} />
            </svg>
            {/* Gradient wash on hover */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{ background: `linear-gradient(135deg, ${kpi.gFrom}22, ${kpi.gTo}0a)` }} />
            {/* Content */}
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
                <p className={`mt-1 text-2xl font-extrabold tracking-tight ${kpi.color}`}>
                  {kpi.value.toLocaleString()}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{kpi.sub}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${kpi.bg}`}>
                  {kpi.icon}
                </div>
                <MiniBarChart values={kpi.bars} color={kpi.barColor} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Charts + Event list ─────────────────────────────── */}
      <div className="grid gap-3 lg:grid-cols-3" style={{ minHeight: "340px" }}>

        {/* Attendees bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <p className="text-sm font-bold text-foreground">Attendees per Event</p>
              <p className="text-xs text-muted-foreground">Live data from your events</p>
            </div>
            <Link href="/events" className="text-xs font-semibold text-primary hover:underline">
              View all →
            </Link>
          </div>

          {stats?.events.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-center">
              <div>
                <p className="text-3xl mb-2">📋</p>
                <p className="text-sm font-semibold text-muted-foreground">No events yet</p>
                <Link href="/events/new" className="mt-2 inline-block text-xs font-bold text-primary hover:underline">
                  Create your first event →
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between gap-2 overflow-hidden">
              {/* SVG bar chart */}
              <div className="flex-1 flex items-end gap-2 min-h-[80px]">
                {stats?.events.map((evt) => {
                  const pct = maxAttendees > 0 ? (evt.attendeeCount / maxAttendees) * 100 : 0;
                  const cfg = getStatus(evt.status) ?? STATUS_CFG["DRAFT"];
                  return (
                    <div key={evt.id} className="group flex-1 flex flex-col items-center gap-1">
                      <p className="text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                        {evt.attendeeCount}
                      </p>
                      <div className="w-full rounded-t-lg transition-all duration-700 hover:opacity-90 cursor-pointer"
                        style={{ height: `${Math.max(pct, 4)}%`, background: cfg.color, minHeight: "6px" }}
                        title={`${evt.name}: ${evt.attendeeCount} attendees`}
                      />
                    </div>
                  );
                })}
              </div>
              {/* Labels */}
              <div className="flex gap-2 shrink-0">
                {stats?.events.map((evt) => (
                  <div key={evt.id} className="flex-1 text-center">
                    <p className="text-[10px] text-muted-foreground truncate">{evt.name.split(" ").slice(0, 2).join(" ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column: Donut + Event list */}
        <div className="flex flex-col gap-3">
          {/* Event status donut */}
          <div className="rounded-2xl border border-border bg-white p-4 shrink-0">
            <p className="text-sm font-bold text-foreground mb-3">Event Status</p>
            <div className="flex items-center gap-4">
              <DonutChart segments={donutSegments} />
              <div className="space-y-2 flex-1">
                {[
                  { label: "Live",  value: stats?.liveCount ?? 0,     color: "bg-emerald-500" },
                  { label: "Draft", value: stats?.upcomingCount ?? 0, color: "bg-amber-400" },
                  { label: "Ended", value: stats?.endedCount ?? 0,    color: "bg-slate-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${s.color}`} />
                    <span className="text-xs text-muted-foreground flex-1">{s.label}</span>
                    <span className="text-xs font-bold text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent events list */}
          <div className="rounded-2xl border border-border bg-white p-4 flex flex-col">
            <p className="text-sm font-bold text-foreground mb-3">Recent Events</p>
            <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-none">
              {stats?.events.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No events yet</p>
              )}
              {stats?.events.map((evt) => {
                const cfg = getStatus(evt.status) ?? STATUS_CFG["DRAFT"];
                return (
                  <Link
                    key={evt.id}
                    href={`/events/${evt.id}`}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot ?? "bg-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">{evt.name}</p>
                      <AttendeeBar value={evt.attendeeCount} max={maxAttendees} color={cfg.color} />
                    </div>
                    <span className="text-xs font-bold text-muted-foreground shrink-0">{evt.attendeeCount}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
