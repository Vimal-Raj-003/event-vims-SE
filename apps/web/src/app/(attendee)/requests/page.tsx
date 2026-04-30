"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { apiClient } from "@/lib/api-client";

interface ConnectionRequest {
  id: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
    company: string;
    profilePhotoUrl?: string;
  };
  createdAt: string;
  message?: string;
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState<string | null>(null);
  const user = useAuthStore((s) => s.user) as { eventId?: string } | null;
  const eventId = (user as { eventId?: string } | null)?.eventId;

  const load = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ data: ConnectionRequest[] }>(
        `/events/${eventId}/connections/requests`
      );
      setRequests(data.data ?? []);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  async function accept(requestId: string) {
    setActioning(requestId);
    try {
      await apiClient.patch(`/events/${eventId}/connections/${requestId}/accept`);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      /* ignore */
    } finally {
      setActioning(null);
    }
  }

  async function decline(requestId: string) {
    setActioning(requestId);
    try {
      await apiClient.patch(`/events/${eventId}/connections/${requestId}/decline`);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      /* ignore */
    } finally {
      setActioning(null);
    }
  }

  function initials(r: ConnectionRequest) {
    return `${r.sender.firstName?.[0] ?? ""}${r.sender.lastName?.[0] ?? ""}`.toUpperCase();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">Connection Requests</h1>
        {requests.length > 0 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">
            {requests.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : requests.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center text-center gap-2">
          <p className="text-3xl">🤝</p>
          <p className="text-sm font-semibold text-foreground">No pending requests</p>
          <p className="text-xs text-muted-foreground">Check back after browsing the attendee directory</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const busy = actioning === req.id;
            return (
              <div key={req.id} className="rounded-2xl border border-border bg-white dark:bg-card p-4 space-y-3">
                <div className="flex items-start gap-3">
                  {req.sender.profilePhotoUrl ? (
                    <img src={req.sender.profilePhotoUrl} alt={req.sender.firstName} className="h-11 w-11 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                      {initials(req)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">{req.sender.firstName} {req.sender.lastName}</p>
                    <p className="text-xs text-muted-foreground">{req.sender.designation} · {req.sender.company}</p>
                    {req.message && <p className="text-xs text-foreground mt-1 italic">"{req.message}"</p>}
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(req.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => accept(req.id)} disabled={busy}
                    className="flex-1 rounded-xl bg-primary py-2 text-xs font-bold text-white hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60">
                    {busy ? "…" : "Accept"}
                  </button>
                  <button onClick={() => decline(req.id)} disabled={busy}
                    className="flex-1 rounded-xl border border-border bg-white dark:bg-secondary py-2 text-xs font-semibold text-foreground hover:bg-muted transition-all disabled:opacity-60">
                    {busy ? "…" : "Decline"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
