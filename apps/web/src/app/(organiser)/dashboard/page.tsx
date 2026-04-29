import Link from "next/link";

interface Event {
  id: string;
  name: string;
  date: string;
  location: string;
  attendeeCount: number;
  connectionCount: number;
  status: "live" | "upcoming" | "ended";
}

const MOCK_EVENTS: Event[] = [
  {
    id: "evt_001",
    name: "TechConnect Summit 2025",
    date: "15 Mar 2025",
    location: "ExCeL London",
    attendeeCount: 342,
    connectionCount: 1247,
    status: "live",
  },
  {
    id: "evt_002",
    name: "Startup Grind London",
    date: "22 Apr 2025",
    location: "Google Campus, London",
    attendeeCount: 128,
    connectionCount: 456,
    status: "upcoming",
  },
  {
    id: "evt_003",
    name: "AI & ML Conference",
    date: "10 Feb 2025",
    location: "Barbican Centre",
    attendeeCount: 510,
    connectionCount: 2103,
    status: "ended",
  },
];

const STATS = [
  { label: "Total Events", value: "12", change: "+3 this month" },
  { label: "Total Attendees", value: "2,847", change: "+412 this month" },
  { label: "Connections Made", value: "8,391", change: "+1,247 this month" },
  { label: "Avg. Satisfaction", value: "4.8/5", change: "Up from 4.6" },
] as const;

export default function DashboardPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, Jane. Here is your event overview.
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          New Event
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-white p-6"
          >
            <p className="text-sm font-medium text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-success">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Events */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Your Events
          </h2>
          <Link
            href="/events"
            className="text-sm font-medium text-primary hover:text-primary-600"
          >
            View all
          </Link>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_EVENTS.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="group rounded-xl border border-border bg-white p-6 transition-all hover:border-primary/30 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    event.status === "live"
                      ? "bg-green-50 text-green-700"
                      : event.status === "upcoming"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {event.status === "live" && (
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
                  )}
                  {event.status.charAt(0).toUpperCase() +
                    event.status.slice(1)}
                </span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-foreground group-hover:text-primary">
                {event.name}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {event.date} &middot; {event.location}
              </p>
              <div className="mt-4 flex items-center gap-4 border-t border-border pt-4">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {event.attendeeCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Attendees</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {event.connectionCount}
                  </p>
                  <p className="text-xs text-muted-foreground">Connections</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
