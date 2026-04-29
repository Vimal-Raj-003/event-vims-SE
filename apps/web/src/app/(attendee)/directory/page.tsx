"use client";

import { useState } from "react";

const FILTER_CHIPS = [
  "All",
  "Software",
  "AI / ML",
  "SaaS",
  "FinTech",
  "HealthTech",
  "Marketing",
  "Design",
  "Product",
] as const;

interface Attendee {
  id: string;
  name: string;
  title: string;
  company: string;
  tags: string[];
  connected: boolean;
  avatarUrl?: string;
}

const MOCK_ATTENDEES: Attendee[] = [
  { id: "a1", name: "Amara Kazeem", title: "Product Lead", company: "TechFlow", tags: ["AI / ML", "SaaS"], connected: true },
  { id: "a2", name: "James Whitfield", title: "CTO", company: "Nimbus Data", tags: ["Software", "FinTech"], connected: false },
  { id: "a3", name: "Priya Sharma", title: "VP Engineering", company: "ScaleGrid", tags: ["SaaS", "AI / ML"], connected: true },
  { id: "a4", name: "Elena Rodriguez", title: "Design Director", company: "PixelCraft", tags: ["Design", "Product"], connected: false },
  { id: "a5", name: "Tom Chen", title: "Founding Engineer", company: "Quickbase AI", tags: ["AI / ML", "Software"], connected: false },
  { id: "a6", name: "Fatima Al-Rashid", title: "Head of Growth", company: "LaunchPad", tags: ["Marketing", "SaaS"], connected: true },
  { id: "a7", name: "Oliver Barrett", title: "Solutions Architect", company: "CloudPeak", tags: ["Software", "FinTech"], connected: false },
  { id: "a8", name: "Yuki Tanaka", title: "Product Manager", company: "HealthBridge", tags: ["HealthTech", "Product"], connected: false },
  { id: "a9", name: "Sarah Kim", title: "ML Engineer", company: "DeepVision", tags: ["AI / ML", "Software"], connected: true },
  { id: "a10", name: "Marcus Johnson", title: "CEO", company: "GreenFin", tags: ["FinTech", "SaaS"], connected: false },
];

export default function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  const filtered = MOCK_ATTENDEES.filter((att) => {
    const matchesSearch =
      searchQuery === "" ||
      att.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      att.title.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      activeFilter === "All" || att.tags.includes(activeFilter);

    return matchesSearch && matchesFilter;
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Attendee Directory</h1>
        <span className="text-sm text-muted-foreground">
          {MOCK_ATTENDEES.length} people
        </span>
      </div>

      {/* Search bar */}
      <div className="relative mt-4">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        <input
          type="search"
          placeholder="Search by name, company, or title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Filter chips */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => setActiveFilter(chip)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activeFilter === chip
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Attendee cards */}
      <div className="mt-4 space-y-3">
        {filtered.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No attendees match your search.
            </p>
          </div>
        )}
        {filtered.map((attendee) => (
          <div
            key={attendee.id}
            className="rounded-xl border border-border bg-white p-4 transition-all hover:border-primary/20 hover:shadow-sm"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary">
                {attendee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {attendee.name}
                  </h3>
                  {attendee.connected && (
                    <span className="ml-2 shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                      Connected
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate">
                  {attendee.title} at {attendee.company}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {attendee.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              {attendee.connected ? (
                <button className="flex-1 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
                  View Card
                </button>
              ) : (
                <button className="flex-1 rounded-lg bg-primary py-2 text-xs font-medium text-white hover:bg-primary-600">
                  Connect
                </button>
              )}
              <button className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
