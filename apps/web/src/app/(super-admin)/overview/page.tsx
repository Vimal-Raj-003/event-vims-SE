const PLATFORM_STATS = [
  {
    label: "Total Organisations",
    value: "1,247",
    change: "+89 this month",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    label: "Total Events",
    value: "3,892",
    change: "+312 this month",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    label: "Total Attendees",
    value: "187,432",
    change: "+12,847 this month",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Total Connections",
    value: "842,109",
    change: "+47,391 this month",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
] as const;

const RECENT_SIGNUPS = [
  { org: "TechFlow Ltd", name: "Amara Kazeem", plan: "Professional", date: "Today" },
  { org: "Nimbus Data Inc", name: "James Whitfield", plan: "Enterprise", date: "Today" },
  { org: "PixelCraft Studio", name: "Elena Rodriguez", plan: "Starter", date: "Yesterday" },
  { org: "ScaleGrid", name: "Priya Sharma", plan: "Professional", date: "Yesterday" },
  { org: "Quickbase AI", name: "Tom Chen", plan: "Starter", date: "2 days ago" },
] as const;

const TOP_EVENTS = [
  { name: "TechConnect Summit 2025", org: "TechFlow Ltd", attendees: 342, connections: 1247 },
  { name: "AI & ML Conference", org: "DeepVision", attendees: 510, connections: 2103 },
  { name: "Startup Grind London", org: "Google Campus", attendees: 128, connections: 456 },
  { name: "Women in Tech Forum", org: "DiversityInTech", attendees: 289, connections: 891 },
  { name: "DeveloperWeek London", org: "DevWeek Corp", attendees: 420, connections: 1832 },
] as const;

export default function SuperAdminOverviewPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Platform Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time analytics across the entire VIMS Events platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
            <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-green-500" />
            All systems operational
          </span>
        </div>
      </div>

      {/* Primary stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLATFORM_STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-white p-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50 text-primary">
                {stat.icon}
              </span>
            </div>
            <p className="mt-3 text-3xl font-bold text-foreground">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-success">{stat.change}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent signups */}
        <div className="rounded-xl border border-border bg-white">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Recent Organiser Sign-ups
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {RECENT_SIGNUPS.map((signup) => (
              <li
                key={signup.org}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-xs font-semibold text-muted-foreground">
                    {signup.org
                      .split(" ")
                      .map((w) => w[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {signup.org}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {signup.name}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      signup.plan === "Enterprise"
                        ? "bg-purple-50 text-purple-700"
                        : signup.plan === "Professional"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {signup.plan}
                  </span>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {signup.date}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Top events */}
        <div className="rounded-xl border border-border bg-white">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-base font-semibold text-foreground">
              Top Events by Connections
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {TOP_EVENTS.map((event, idx) => (
              <li
                key={event.name}
                className="flex items-center justify-between px-6 py-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {event.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {event.org}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-foreground">
                    {event.connections.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.attendees} attendees
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Revenue breakdown */}
      <div className="mt-6 rounded-xl border border-border bg-white p-6">
        <h2 className="text-base font-semibold text-foreground">
          Monthly Revenue
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-sm text-muted-foreground">Starter</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              £0
            </p>
            <p className="mt-1 text-xs text-muted-foreground">432 orgs</p>
          </div>
          <div className="rounded-lg bg-primary-50 p-4">
            <p className="text-sm text-primary">Professional</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              £24,060
            </p>
            <p className="mt-1 text-xs text-primary">491 events this month</p>
          </div>
          <div className="rounded-lg bg-purple-50 p-4">
            <p className="text-sm text-purple-700">Enterprise</p>
            <p className="mt-1 text-2xl font-bold text-foreground">
              £67,500
            </p>
            <p className="mt-1 text-xs text-purple-700">324 orgs</p>
          </div>
        </div>
        <div className="mt-4 rounded-lg border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">
              Total MRR
            </p>
            <p className="text-2xl font-bold text-foreground">£91,560</p>
          </div>
        </div>
      </div>
    </div>
  );
}
