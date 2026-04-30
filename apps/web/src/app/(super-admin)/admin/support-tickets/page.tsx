"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
  organiser: { id: string; name: string; email: string; organisation: string };
}

interface Meta { page: number; pageSize: number; totalItems: number; totalPages: number }

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-600 border-slate-200",
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
  MEDIUM: "bg-yellow-50 text-yellow-700 border-yellow-200",
  HIGH: "bg-orange-50 text-orange-700 border-orange-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

const CATEGORY_LABELS: Record<string, string> = {
  EVENT_ISSUE: "Event",
  ATTENDEE_ISSUE: "Attendee",
  TECHNICAL: "Technical",
  ACCOUNT: "Account",
  OTHER: "Other",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[status] ?? "bg-muted text-muted-foreground"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_COLORS[priority] ?? "bg-muted text-muted-foreground"}`}>
      {priority}
    </span>
  );
}

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [saving, setSaving] = useState(false);
  const [editStatus, setEditStatus] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editNote, setEditNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (filterStatus) params.set("status", filterStatus);
      if (filterCategory) params.set("category", filterCategory);
      if (search) params.set("search", search);
      const res = await apiClient.get(`/admin/support-tickets?${params}`);
      setTickets(res.data.data);
      setMeta(res.data.meta);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus, filterCategory, search]);

  useEffect(() => { load(); }, [load]);

  function openTicket(ticket: Ticket) {
    setSelected(ticket);
    setEditStatus(ticket.status);
    setEditPriority(ticket.priority);
    setEditNote(ticket.adminNote ?? "");
  }

  async function saveTicket() {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await apiClient.patch(`/admin/support-tickets/${selected.id}`, {
        status: editStatus,
        priority: editPriority,
        adminNote: editNote || undefined,
      });
      setSelected(res.data);
      setTickets((prev) => prev.map((t) => (t.id === res.data.id ? res.data : t)));
      showToast("Ticket updated successfully");
    } catch {
      showToast("Failed to update ticket");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700 shadow-xl">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Support Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage organizer support requests</p>
        </div>
        {meta && (
          <div className="rounded-xl border border-border bg-white px-4 py-2 text-sm">
            <span className="font-bold text-foreground">{meta.totalItems}</span>
            <span className="text-muted-foreground ml-1">total tickets</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by subject or organiser…"
          className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none w-64"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1); }}
          className="rounded-xl border border-border bg-white px-4 py-2 text-sm focus:border-primary focus:outline-none"
        >
          <option value="">All Categories</option>
          <option value="EVENT_ISSUE">Event Issue</option>
          <option value="ATTENDEE_ISSUE">Attendee Issue</option>
          <option value="TECHNICAL">Technical</option>
          <option value="ACCOUNT">Account</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border bg-white overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
            <svg className="h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
            </svg>
            <p className="text-sm">No tickets found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Ticket</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Organizer</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Priority</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground truncate max-w-[200px]">{ticket.subject}</p>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">#{ticket.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-foreground">{ticket.organiser.name}</p>
                      <p className="text-xs text-muted-foreground">{ticket.organiser.organisation}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                        {CATEGORY_LABELS[ticket.category] ?? ticket.category}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={ticket.status} /></td>
                    <td className="px-4 py-3"><PriorityBadge priority={ticket.priority} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => openTicket(ticket)}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted hover:border-primary/30 transition-all">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.totalPages} · {meta.totalItems} total
            </p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                Previous
              </button>
              <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page === meta.totalPages}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setSelected(null)}>
          <div className="w-full max-w-lg rounded-2xl border border-border bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <p className="font-bold text-foreground">{selected.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">#{selected.id.slice(0, 8).toUpperCase()} · {selected.organiser.name} ({selected.organiser.organisation})</p>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap bg-muted/30 rounded-xl px-3 py-2.5">{selected.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none bg-white">
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">Priority</label>
                  <select value={editPriority} onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none bg-white">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1.5">Admin Note (visible to organizer)</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={3}
                  placeholder="Add a response or note for the organizer…"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={saveTicket} disabled={saving}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-sm shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60">
                  {saving ? "Saving…" : "Save Changes"}
                </button>
                <button onClick={() => setSelected(null)}
                  className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
