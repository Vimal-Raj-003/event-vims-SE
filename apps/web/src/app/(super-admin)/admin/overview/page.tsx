"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface Analytics {
  totalOrganisers: number;
  totalEvents: number;
  totalAttendees: number;
  totalConnections: number;
  activeOrganisers: number;
  publishedEvents: number;
  draftEvents: number;
}

interface Organiser {
  id: string;
  name: string;
  organisation: string;
  email: string;
  status: string;
  createdAt: string;
  _count?: { events: number };
}

interface AdminEvent {
  id: string;
  name: string;
  status: string;
  startAt: string;
  venue: string;
  organiser: { organisation: string };
  _count?: { attendees: number; connectionRequests: number };
}

function MiniBar({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(...values, 1);
  const W = 52, H = 26, gap = 2;
  const bw = (W - gap * (values.length - 1)) / values.length;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      {values.map((v, i) => {
        const bh = Math.max(2, (v / max) * H);
        return <rect key={i} x={i * (bw + gap)} y={H - bh} width={bw} height={bh} rx="1.5" fill={color} opacity={i === values.length - 1 ? 1 : 0.35} />;
      })}
    </svg>
  );
}

function DonutRing({ segments }: { segments: { v: number; c: string }[] }) {
  const total = segments.reduce((s, x) => s + x.v, 0) || 1;
  const r = 26, cx = 34, cy = 34, sw = 9, circ = 2 * Math.PI * r;
  let off = 0;
  return (
    <svg width={68} height={68} viewBox="0 0 68 68">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
      {segments.map((seg, i) => {
        const dash = (seg.v / total) * circ;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.c} strokeWidth={sw}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-off}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        );
        off += dash;
        return el;
      })}
      <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={11} fontWeight={800} fill="#1e293b">
        {total}
      </text>
    </svg>
  );
}

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:    "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-red-50 text-red-700",
  PUBLISHED: "bg-emerald-50 text-emerald-700",
  DRAFT:     "bg-amber-50 text-amber-700",
  ENDED:     "bg-muted text-muted-foreground",
};

export default function AdminOverviewPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [aRes, oRes, eRes] = await Promise.all([
          apiClient.get<Analytics>("/admin/analytics"),
          apiClient.get<{ data: Organiser[] }>("/admin/organisers?pageSize=5"),
          apiClient.get<{ data: AdminEvent[] }>("/admin/events?pageSize=6"),
        ]);
        setAnalytics(aRes.data);
        setOrganisers(oRes.data?.data ?? []);
        setEvents(eRes.data?.data ?? []);
      } catch {
        setAnalytics({ totalOrganisers: 0, totalEvents: 0, totalAttendees: 0, totalConnections: 0, activeOrganisers: 0, publishedEvents: 0, draftEvents: 0 });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const eventDonut = [
    { v: analytics?.publishedEvents ?? 0, c: "#10b981" },
    { v: analytics?.draftEvents ?? 0,     c: "#f59e0b" },
    { v: Math.max(0, (analytics?.totalEvents ?? 0) - (analytics?.publishedEvents ?? 0) - (analytics?.draftEvents ?? 0)), c: "#94a3b8" },
  ].filter((s) => s.v > 0);
  if (eventDonut.length === 0) eventDonut.push({ v: 1, c: "#e2e8f0" });

  const kpis = [
    { label: "Organisations",  value: analytics?.totalOrganisers ?? 0,  icon: "🏢", color: "text-primary",    bg: "bg-primary/8",   bars: [1,2,3, analytics?.activeOrganisers??0, analytics?.totalOrganisers??0], barC: "#4f46e5", sub: `${analytics?.activeOrganisers ?? 0} active` },
    { label: "Total Events",   value: analytics?.totalEvents ?? 0,       icon: "📅", color: "text-violet-600", bg: "bg-violet-50",  bars: [1, analytics?.draftEvents??0, analytics?.publishedEvents??0, analytics?.totalEvents??0], barC: "#7c3aed", sub: `${analytics?.publishedEvents ?? 0} live` },
    { label: "Total Attendees",value: analytics?.totalAttendees ?? 0,    icon: "👥", color: "text-emerald-600",bg: "bg-emerald-50", bars: [0,0,analytics?.totalAttendees??0], barC: "#10b981", sub: "registered across all events" },
    { label: "Connections",    value: analytics?.totalConnections ?? 0,  icon: "🔗", color: "text-amber-600",  bg: "bg-amber-50",   bars: [0,0,analytics?.totalConnections??0], barC: "#d97706", sub: "accepted connections" },
  ];

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto scrollbar-none pb-4">

      {/* Status badge */}
      <div className="flex justify-end shrink-0">
        <span className="flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          All systems operational
        </span>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 shrink-0">
        {kpis.map((k) => {
          const dotColorMap: Record<string, string> = {
            "#4f46e5": "#4f46e5", "#7c3aed": "#7c3aed", "#10b981": "#10b981", "#d97706": "#d97706",
          };
          const gFromMap: Record<string, string> = {
            "#4f46e5": "#4f46e5", "#7c3aed": "#7c3aed", "#10b981": "#10b981", "#d97706": "#d97706",
          };
          const dot = dotColorMap[k.barC] ?? k.barC;
          const gFrom = gFromMap[k.barC] ?? k.barC;
          return (
          <div key={k.label} className="group relative rounded-2xl border border-border bg-white dark:bg-card p-4 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-transparent">
            {/* Dot-grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-[0.04] group-hover:opacity-[0.09] transition-opacity duration-300 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id={`adots-${k.label}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.5" fill={dot} />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#adots-${k.label})`} />
            </svg>
            {/* Gradient wash on hover */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                 style={{ background: `linear-gradient(135deg, ${gFrom}22, ${gFrom}0a)` }} />
            {/* Content */}
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">{k.label}</p>
                <p className={`mt-1 text-2xl font-extrabold tracking-tight ${k.color}`}>{k.value.toLocaleString()}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{k.sub}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-lg ${k.bg}`}>{k.icon}</div>
                <MiniBar values={k.bars} color={k.barC} />
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Charts + lists row */}
      <div className="grid gap-3 lg:grid-cols-3 flex-1 min-h-0">

        {/* Events bar chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div>
              <p className="text-sm font-bold text-foreground">Events on Platform</p>
              <p className="text-xs text-muted-foreground">Attendees per event</p>
            </div>
            <Link href="/admin/events" className="text-xs font-semibold text-primary hover:underline">View all →</Link>
          </div>

          {events.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">No events yet</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between gap-2 min-h-[100px]">
              <div className="flex-1 flex items-end gap-2">
                {events.map((ev) => {
                  const maxA = Math.max(...events.map((e) => e._count?.attendees ?? 0), 1);
                  const pct = ((ev._count?.attendees ?? 0) / maxA) * 100;
                  const c = ev.status === "PUBLISHED" ? "#10b981" : ev.status === "DRAFT" ? "#f59e0b" : "#94a3b8";
                  return (
                    <div key={ev.id} className="group flex-1 flex flex-col items-center gap-1">
                      <p className="text-xs font-bold text-foreground opacity-0 group-hover:opacity-100 transition-opacity">{ev._count?.attendees ?? 0}</p>
                      <Link href={`/admin/events/${ev.id}`} className="w-full rounded-t-lg hover:opacity-80 transition-opacity" style={{ height: `${Math.max(pct, 4)}%`, background: c, minHeight: "6px", display: "block" }} title={ev.name} />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2 shrink-0">
                {events.map((ev) => (
                  <div key={ev.id} className="flex-1 text-center">
                    <p className="text-[10px] text-muted-foreground truncate">{ev.name.split(" ").slice(0, 2).join(" ")}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right panel: donut + status */}
        <div className="flex flex-col gap-3">
          {/* Event status donut */}
          <div className="rounded-2xl border border-border bg-white p-4 shrink-0">
            <p className="text-sm font-bold text-foreground mb-3">Event Status</p>
            <div className="flex items-center gap-4">
              <DonutRing segments={eventDonut} />
              <div className="space-y-2 flex-1">
                {[
                  { label: "Live",  v: analytics?.publishedEvents ?? 0, c: "bg-emerald-500" },
                  { label: "Draft", v: analytics?.draftEvents ?? 0,     c: "bg-amber-400" },
                  { label: "Other", v: Math.max(0, (analytics?.totalEvents ?? 0) - (analytics?.publishedEvents ?? 0) - (analytics?.draftEvents ?? 0)), c: "bg-slate-400" },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${s.c}`} />
                    <span className="text-xs text-muted-foreground flex-1">{s.label}</span>
                    <span className="text-xs font-bold text-foreground">{s.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent organisers */}
          <div className="flex-1 rounded-2xl border border-border bg-white p-4 flex flex-col min-h-0 overflow-hidden">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <p className="text-sm font-bold text-foreground">Recent Organisers</p>
              <Link href="/admin/organisers" className="text-xs font-semibold text-primary hover:underline">All →</Link>
            </div>
            <div className="flex-1 space-y-2 overflow-y-auto scrollbar-none">
              {organisers.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No organisers yet</p>}
              {organisers.map((o) => (
                <div key={o.id} className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-muted/40 transition-colors">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-[10px] font-bold text-primary">
                    {o.organisation.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{o.organisation}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{o.name}</p>
                  </div>
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[o.status] ?? "bg-muted text-muted-foreground"}`}>
                    {o.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
