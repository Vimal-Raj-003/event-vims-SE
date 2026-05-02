"use client";

import Link from "next/link";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAnalytics, useAttendeeProfile, useSuggestions } from "@/lib/hooks/use-attendee";

export default function DashboardPage() {
  const { user, activeEventId } = useAuthStore();
  const { data: analytics, isLoading: analyticsLoading } = useAnalytics();
  const { data: profile } = useAttendeeProfile();
  const { data: suggestionsData } = useSuggestions(activeEventId);

  if (analyticsLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const a = analytics ?? {
    connections: { total: 0, thisWeek: 0, pending: 0 },
    profileViews: { total: 0, thisWeek: 0, recentViewers: [] },
    cardShares: { total: 0, thisWeek: 0, byMethod: {} },
    qrScans: { total: 0, thisWeek: 0 },
    networkingScore: 0,
    engagementTrend: "flat" as const,
  };

  const topSuggestions = (suggestionsData?.data ?? []).slice(0, 3);

  // Profile completeness
  const allFields = profile
    ? [
        profile.firstName, profile.lastName, profile.email, profile.phone,
        profile.designation, profile.company, profile.industry, profile.city,
        profile.profilePhotoUrl, profile.occupation, profile.businessType,
      ]
    : [];
  const filledCount = allFields.filter((v) => v !== null && v !== undefined && v !== "").length;
  const completenessPercent = allFields.length > 0 ? Math.round((filledCount / allFields.length) * 100) : 0;

  const trendIcon = a.engagementTrend === "up" ? "↑" : a.engagementTrend === "down" ? "↓" : "→";
  const trendColor = a.engagementTrend === "up" ? "text-emerald-500" : a.engagementTrend === "down" ? "text-red-500" : "text-muted-foreground";

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Welcome{profile ? `, ${profile.firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your networking dashboard</p>
        </div>
        {/* Profile completeness ring */}
        <div className="relative flex h-14 w-14 items-center justify-center">
          <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-muted" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.5" fill="none"
              className="stroke-primary"
              strokeWidth="3"
              strokeDasharray={`${completenessPercent} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-[10px] font-bold text-foreground">{completenessPercent}%</span>
        </div>
      </div>

      {/* Networking Score */}
      <div className="mb-5 rounded-2xl border border-border bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Networking Score</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-black text-foreground">{a.networkingScore}</span>
              <span className="text-sm text-muted-foreground">/ 100</span>
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              <svg className="h-20 w-20 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" className="stroke-indigo-100" strokeWidth="2.5" />
                <circle
                  cx="18" cy="18" r="15.5" fill="none"
                  className="stroke-primary"
                  strokeWidth="2.5"
                  strokeDasharray={`${a.networkingScore} 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className={`text-sm font-bold ${trendColor}`}>{trendIcon}</span>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        <StatCard
          label="Connections"
          value={a.connections.total}
          delta={a.connections.thisWeek > 0 ? `+${a.connections.thisWeek} this week` : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          }
        />
        <StatCard
          label="Card Shares"
          value={a.cardShares.total}
          delta={a.cardShares.thisWeek > 0 ? `+${a.cardShares.thisWeek} this week` : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
          }
        />
        <StatCard
          label="Profile Views"
          value={a.profileViews.total}
          delta={a.profileViews.thisWeek > 0 ? `+${a.profileViews.thisWeek} this week` : undefined}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          label="QR Scans"
          value={a.qrScans.total}
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5z" />
            </svg>
          }
        />
      </div>

      {/* Suggestions Preview */}
      {topSuggestions.length > 0 && (
        <div className="mb-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">People You Should Meet</h2>
            <Link href="/suggestions" className="text-xs font-medium text-primary hover:underline">
              See All
            </Link>
          </div>
          <div className="space-y-2">
            {topSuggestions.map((s: { attendee: { id: string; firstName: string; lastName: string; designation: string; company: string; profilePhotoUrl: string | null }; score: number }) => (
              <Link
                key={s.attendee.id}
                href={`/profile/${s.attendee.id}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-white p-3 hover:border-primary/30 transition-all"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-xs font-bold text-white">
                  {s.attendee.profilePhotoUrl ? (
                    <img src={s.attendee.profilePhotoUrl} alt="" className="h-full w-full rounded-full object-cover" />
                  ) : (
                    `${s.attendee.firstName?.[0] ?? ""}${s.attendee.lastName?.[0] ?? ""}`
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {s.attendee.firstName} {s.attendee.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.attendee.designation} at {s.attendee.company}
                  </p>
                </div>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                  {Math.round(s.score * 100)}%
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Pending Connections */}
      {a.connections.pending > 0 && (
        <Link
          href="/requests"
          className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 transition-all hover:bg-amber-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <span className="text-sm font-bold text-amber-600">{a.connections.pending}</span>
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">Pending Requests</p>
            <p className="text-xs text-amber-600">You have {a.connections.pending} connection request(s) waiting</p>
          </div>
          <svg className="ml-auto h-4 w-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Link>
      )}

      {/* Recent Profile Viewers */}
      {a.profileViews.recentViewers.length > 0 && (
        <div className="mb-5">
          <h2 className="mb-3 text-sm font-bold text-foreground">Recent Viewers</h2>
          <div className="flex -space-x-2">
            {a.profileViews.recentViewers.map((viewer: { id: string; firstName: string; lastName: string; profilePhotoUrl: string | null }) => (
              <Link key={viewer.id} href={`/profile/${viewer.id}`} title={`${viewer.firstName} ${viewer.lastName}`}>
                {viewer.profilePhotoUrl ? (
                  <img
                    src={viewer.profilePhotoUrl}
                    alt={`${viewer.firstName} ${viewer.lastName}`}
                    className="h-9 w-9 rounded-full border-2 border-white object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-gradient-to-br from-indigo-300 to-purple-400 text-[10px] font-bold text-white">
                    {viewer.firstName?.[0]}{viewer.lastName?.[0]}
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: number;
  delta?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-3.5">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{icon}</span>
        {delta && (
          <span className="text-[9px] font-medium text-emerald-500">{delta}</span>
        )}
      </div>
      <p className="mt-2 text-2xl font-black text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
    </div>
  );
}
