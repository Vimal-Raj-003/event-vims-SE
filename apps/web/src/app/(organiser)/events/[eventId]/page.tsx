import Link from "next/link";

interface EventStats {
  totalAttendees: number;
  activeNow: number;
  connectionsMade: number;
  avgConnectionsPerPerson: number;
  qrScansToday: number;
  satisfactionScore: number;
  topIndustry: string;
  connectionsTrend: number;
}

const MOCK_STATS: EventStats = {
  totalAttendees: 342,
  activeNow: 89,
  connectionsMade: 1247,
  avgConnectionsPerPerson: 3.6,
  qrScansToday: 234,
  satisfactionScore: 4.8,
  topIndustry: "Software & SaaS",
  connectionsTrend: 18,
};

const RECENT_CONNECTIONS = [
  { from: "Amara Kazeem", to: "James Whitfield", time: "2 min ago" },
  { from: "Priya Sharma", to: "Elena Rodriguez", time: "5 min ago" },
  { from: "Tom Chen", to: "Fatima Al-Rashid", time: "8 min ago" },
  { from: "Oliver Barrett", to: "Yuki Tanaka", time: "12 min ago" },
  { from: "Sarah Kim", to: "Marcus Johnson", time: "15 min ago" },
] as const;

interface PageProps {
  params: { eventId: string };
}

export default function EventDetailPage({ params }: PageProps) {
  void params;

  return (
    <div>
      <Link
        href="/events"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Events
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              TechConnect Summit 2025
            </h1>
            <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
              Live
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            15 Mar 2025 &middot; ExCeL London &middot; 342 registered attendees
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
            Edit Event
          </button>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-600">
            Share Link
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Now"
          value={MOCK_STATS.activeNow.toString()}
          badge="Live"
          badgeColor="green"
        />
        <StatCard
          label="Total Connections"
          value={MOCK_STATS.connectionsMade.toLocaleString()}
          trend={`+${MOCK_STATS.connectionsTrend}% today`}
        />
        <StatCard
          label="QR Scans Today"
          value={MOCK_STATS.qrScansToday.toString()}
        />
        <StatCard
          label="Satisfaction"
          value={`${MOCK_STATS.satisfactionScore}/5`}
          trend="Based on 89 responses"
        />
      </div>

      {/* Second row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-white p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Avg. Connections
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {MOCK_STATS.avgConnectionsPerPerson}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            per attendee
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Top Industry
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {MOCK_STATS.topIndustry}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            most represented sector
          </p>
        </div>
        <div className="rounded-xl border border-border bg-white p-6">
          <p className="text-sm font-medium text-muted-foreground">
            Total Attendees
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {MOCK_STATS.totalAttendees}
          </p>
          <p className="mt-1 text-xs text-success">
            +24 registered today
          </p>
        </div>
      </div>

      {/* Recent connections */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-foreground">
          Recent Connections
        </h2>
        <div className="mt-4 rounded-xl border border-border bg-white">
          <ul className="divide-y divide-border">
            {RECENT_CONNECTIONS.map((conn, idx) => (
              <li key={idx} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary-100 text-xs font-semibold text-primary">
                      {conn.from.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-secondary-100 text-xs font-semibold text-secondary">
                      {conn.to.split(" ").map((n) => n[0]).join("")}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {conn.from}{" "}
                      <span className="font-normal text-muted-foreground">
                        connected with
                      </span>{" "}
                      {conn.to}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {conn.time}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  badge,
  badgeColor,
  trend,
}: {
  label: string;
  value: string;
  badge?: string;
  badgeColor?: "green" | "blue";
  trend?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-6">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {badge && (
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              badgeColor === "green"
                ? "bg-green-50 text-green-700"
                : "bg-blue-50 text-blue-700"
            }`}
          >
            {badge === "Live" && (
              <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-500" />
            )}
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
      {trend && (
        <p className="mt-1 text-xs text-success">{trend}</p>
      )}
    </div>
  );
}
