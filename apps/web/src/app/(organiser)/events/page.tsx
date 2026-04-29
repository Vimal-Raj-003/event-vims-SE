import Link from "next/link";

interface EventListItem {
  id: string;
  name: string;
  date: string;
  location: string;
  attendeeCount: number;
  status: "live" | "upcoming" | "ended";
}

const EVENTS: EventListItem[] = [
  { id: "evt_001", name: "TechConnect Summit 2025", date: "15 Mar 2025", location: "ExCeL London", attendeeCount: 342, status: "live" },
  { id: "evt_002", name: "Startup Grind London", date: "22 Apr 2025", location: "Google Campus", attendeeCount: 128, status: "upcoming" },
  { id: "evt_003", name: "AI & ML Conference", date: "10 Feb 2025", location: "Barbican Centre", attendeeCount: 510, status: "ended" },
  { id: "evt_004", name: "DeveloperWeek London", date: "5 May 2025", location: "Old Billingsgate", attendeeCount: 0, status: "upcoming" },
  { id: "evt_005", name: "Product Hunt Meetup", date: "18 Jan 2025", location: "Second Home", attendeeCount: 85, status: "ended" },
  { id: "evt_006", name: "Women in Tech Forum", date: "12 Jun 2025", location: "Tobacco Dock", attendeeCount: 0, status: "upcoming" },
];

export default function EventsListPage() {
  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage all your networking events in one place
          </p>
        </div>
        <Link
          href="/events/new"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Create Event
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="mt-6 flex gap-1 rounded-lg bg-muted p-1">
        {["all", "live", "upcoming", "ended"].map((tab) => (
          <button
            key={tab}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              tab === "all"
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Event cards */}
      <div className="mt-6 space-y-3">
        {EVENTS.map((event) => (
          <Link
            key={event.id}
            href={`/events/${event.id}`}
            className="group flex items-center justify-between rounded-xl border border-border bg-white p-5 transition-all hover:border-primary/30 hover:shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                  event.status === "live"
                    ? "bg-green-50 text-green-600"
                    : event.status === "upcoming"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                  {event.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {event.date} &middot; {event.location}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">
                  {event.attendeeCount > 0 ? event.attendeeCount : "--"}
                </p>
                <p className="text-xs text-muted-foreground">attendees</p>
              </div>
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
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
