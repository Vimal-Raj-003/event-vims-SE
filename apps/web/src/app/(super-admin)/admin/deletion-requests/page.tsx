"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface Req { id: string; requesterEmail: string; reason?: string; status: string; requestedAt: string; event?: { id: string; name: string; organiser: { name: string } }; }

export default function DeletionRequestsPage() {
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string|null>(null);
  const [modal, setModal] = useState<{ id: string }|null>(null);
  const [reason, setReason] = useState("");

  const fetch = useCallback(async () => {
    setLoading(true);
    try { const { data } = await apiClient.get<{ data: Req[] }>("/admin/deletion-requests?page=1&pageSize=50"); setRequests(data.data); }
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  async function approve(id: string) {
    setActionId(id); try { await apiClient.patch(`/admin/deletion-requests/${id}`, { action: "approve" }); fetch(); } catch { /* ignore */ } finally { setActionId(null); }
  }

  async function reject() {
    if (!modal) return; setActionId(modal.id);
    try { await apiClient.patch(`/admin/deletion-requests/${modal.id}`, { action: "reject", reason }); setModal(null); setReason(""); fetch(); }
    catch { /* ignore */ } finally { setActionId(null); }
  }

  return (
    <div className="space-y-6 animate-in">
      <div><h1 className="text-2xl font-extrabold text-foreground tracking-tight">Deletion Requests</h1><p className="mt-1 text-sm text-muted-foreground">DPDP Right to Erasure queue</p></div>
      <div className="space-y-3">
        {loading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        : requests.length === 0 ? <div className="rounded-2xl border border-border bg-white py-12 text-center text-sm text-muted-foreground">No pending deletion requests</div>
        : requests.map(req => (
          <div key={req.id} className="rounded-2xl border border-border bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{req.requesterEmail}</p>
                {req.event && <p className="mt-0.5 text-sm text-muted-foreground">Event: {req.event.name} · {req.event.organiser.name}</p>}
                {req.reason && <p className="mt-1 text-sm text-muted-foreground">Reason: {req.reason}</p>}
                <p className="mt-1 text-xs text-muted-foreground">{new Date(req.requestedAt).toLocaleDateString("en-GB")}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => approve(req.id)} disabled={actionId === req.id} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">Approve</button>
                <button onClick={() => setModal({ id: req.id })} disabled={actionId === req.id} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50">Reject</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h2 className="font-bold text-foreground mb-1">Reject Deletion Request</h2>
            <p className="text-sm text-muted-foreground mb-4">Provide a reason for rejection.</p>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3} placeholder="Reason…" className="w-full rounded-2xl border border-border px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
            <div className="mt-4 flex gap-3">
              <button onClick={reject} disabled={!reason.trim() || !!actionId} className="flex-1 rounded-2xl bg-destructive py-2.5 text-sm font-bold text-white disabled:opacity-50">Reject</button>
              <button onClick={() => { setModal(null); setReason(""); }} className="rounded-2xl border border-border px-4 py-2.5 text-sm font-medium hover:bg-muted">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
