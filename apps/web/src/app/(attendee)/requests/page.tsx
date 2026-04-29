"use client";

interface ConnectionRequest {
  id: string;
  name: string;
  title: string;
  company: string;
  avatarInitials: string;
  avatarColor: string;
  mutualConnections: number;
  requestedAt: string;
  tags: string[];
}

const INCOMING_REQUESTS: ConnectionRequest[] = [
  {
    id: "r1",
    name: "James Whitfield",
    title: "CTO",
    company: "Nimbus Data",
    avatarInitials: "JW",
    avatarColor: "bg-blue-100 text-blue-700",
    mutualConnections: 3,
    requestedAt: "5 min ago",
    tags: ["FinTech", "Cloud"],
  },
  {
    id: "r2",
    name: "Elena Rodriguez",
    title: "Design Director",
    company: "PixelCraft",
    avatarInitials: "ER",
    avatarColor: "bg-purple-100 text-purple-700",
    mutualConnections: 7,
    requestedAt: "12 min ago",
    tags: ["Design", "UX"],
  },
  {
    id: "r3",
    name: "Tom Chen",
    title: "Founding Engineer",
    company: "Quickbase AI",
    avatarInitials: "TC",
    avatarColor: "bg-green-100 text-green-700",
    mutualConnections: 1,
    requestedAt: "28 min ago",
    tags: ["AI / ML", "Startups"],
  },
  {
    id: "r4",
    name: "Yuki Tanaka",
    title: "Product Manager",
    company: "HealthBridge",
    avatarInitials: "YT",
    avatarColor: "bg-amber-100 text-amber-700",
    mutualConnections: 5,
    requestedAt: "1 hour ago",
    tags: ["HealthTech", "Product"],
  },
];

export default function RequestsPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Connection Requests</h1>
        <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white">
          {INCOMING_REQUESTS.length}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        People who want to connect with you at TechConnect Summit
      </p>

      {INCOMING_REQUESTS.length === 0 ? (
        <div className="mt-12 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">
            No pending requests
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            New requests will appear here when someone wants to connect
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {INCOMING_REQUESTS.map((request) => (
            <div
              key={request.id}
              className="rounded-xl border border-border bg-white p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${request.avatarColor}`}
                >
                  {request.avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    {request.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {request.title} at {request.company}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {request.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{request.mutualConnections} mutual connections</span>
                    <span>&middot;</span>
                    <span>{request.requestedAt}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button className="rounded-lg bg-primary py-2 text-xs font-semibold text-white hover:bg-primary-600">
                  Accept
                </button>
                <button className="rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
                  Decline
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
