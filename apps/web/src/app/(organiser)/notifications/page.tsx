"use client";

import { useState } from "react";

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  eventType: string;
  createdAt: string;
}

// Organiser notifications are system-level. In MVP, this shows a static inbox.
const MOCK: Notification[] = [
  { id: "n1", title: "New attendee registered", body: "James Whitfield registered for TechConnect Summit 2025", isRead: false, eventType: "ATTENDEE_REGISTERED", createdAt: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: "n2", title: "Event published", body: "TechConnect Summit 2025 is now live and accepting registrations.", isRead: true, eventType: "EVENT_PUBLISHED", createdAt: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "n3", title: "100 attendees milestone", body: "TechConnect Summit 2025 has reached 100 registered attendees!", isRead: true, eventType: "MILESTONE", createdAt: new Date(Date.now() - 24 * 3600000).toISOString() },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function OrganiserNotificationsPage() {
  const [notifications, setNotifications] = useState(MOCK);

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const unread = notifications.filter((n) => !n.isRead).length;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {unread > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">{unread} unread</p>
          )}
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-sm font-medium text-primary hover:underline">
            Mark all as read
          </button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {notifications.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <svg className="h-7 w-7 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full rounded-xl border p-4 text-left transition-colors ${n.isRead ? "border-border bg-white" : "border-primary/20 bg-primary-50/50"}`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-primary"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-medium ${n.isRead ? "text-foreground" : "text-primary"}`}>
                      {n.title}
                    </p>
                    <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
