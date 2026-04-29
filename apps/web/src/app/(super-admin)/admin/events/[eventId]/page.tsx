"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

interface AdminEvent { id: string; name: string; slug: string; description: string; venue: string; startAt: string; endAt: string; status: string; brandPrimary: string; qrUrl?: string; attendeeCount: number; connectionCount: number; announcementCount: number; organiser: { id: string; name: string; organisation: string; email: string; mobile: string; status: string; }; }
const SC: Record<string, string> = { PUBLISHED: "bg-emerald-50 text-emerald-700", DRAFT: "bg-yellow-50 text-yellow-700", DELETED: "bg-red-50 text-red-700" };

export default function AdminEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<AdminEvent|null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiClient.get<AdminEvent>(`/admin/events/${eventId}`).then(({ data }) => setEvent(data)).catch(() => {}).finally(() => setLoading(false));
  }, [eventId]);

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!event) return <div className="py-16 text-center text-sm text-destructive">Event not found</div>;

  return (
    <div className="max-w-3xl space-y-6 animate-in">
      <div className="flex items-start justify-between">
        <div><h1 className="text-2xl font-extrabold text-foreground tracking-tight">{event.name}</h1><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p></div>
        <span className={`rounded-full px-3 py-1.5 text-sm font-bold ${SC[event.status] ?? "bg-muted text-muted-foreground"}`}>{event.status}</span>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[{l:"Attendees",v:event.attendeeCount},{l:"Connections",v:event.connectionCount},{l:"Announcements",v:event.announcementCount}].map(s=>(
          <div key={s.l} className="rounded-2xl border border-border bg-white p-5 text-center">
            <p className="text-3xl font-extrabold text-foreground">{s.v}</p>
            <p className="mt-1 text-sm text-muted-foreground">{s.l}</p>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-white p-6 space-y-3">
        <h2 className="font-bold text-foreground">Event Details</h2>
        {([ ["Description",event.description], ["Start",new Date(event.startAt).toLocaleString("en-GB")], ["End",new Date(event.endAt).toLocaleString("en-GB")], ["Slug",event.slug], ...(event.qrUrl ? [["QR URL",event.qrUrl]] : []) ] as string[][]).map(([l,v])=>(
          <div key={l} className="flex items-start gap-3 text-sm"><span className="w-24 shrink-0 text-muted-foreground">{l}</span><span className="text-foreground break-all">{v}</span></div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-white p-6 space-y-3">
        <h2 className="font-bold text-foreground">Organiser</h2>
        {[["Name",event.organiser.name],["Organisation",event.organiser.organisation],["Email",event.organiser.email],["Mobile",event.organiser.mobile],["Status",event.organiser.status]].map(([l,v])=>(
          <div key={l} className="flex items-start gap-3 text-sm"><span className="w-24 shrink-0 text-muted-foreground">{l}</span><span className="text-foreground">{v}</span></div>
        ))}
      </div>
    </div>
  );
}
