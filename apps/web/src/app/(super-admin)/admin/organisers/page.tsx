"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface Organiser { id: string; name: string; organisation: string; email: string; mobile: string; status: "ACTIVE"|"SUSPENDED"; eventCount: number; totalAttendeeCount: number; createdAt: string; }

export default function AdminOrganisersPage() {
  const [organisers, setOrganisers] = useState<Organiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionId, setActionId] = useState<string|null>(null);

  const fetch = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const { data } = await apiClient.get<{ data: Organiser[]; meta: { totalPages: number } }>(`/admin/organisers?page=${p}&pageSize=20`);
      setOrganisers(data.data); setTotalPages(data.meta.totalPages);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(page); }, [page, fetch]);

  async function toggle(org: Organiser) {
    setActionId(org.id);
    try { await apiClient.patch(`/admin/organisers/${org.id}/${org.status === "ACTIVE" ? "suspend" : "reactivate"}`); fetch(page); }
    catch { /* ignore */ } finally { setActionId(null); }
  }

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Organisers</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage all registered event organisers</p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-white">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/40">
            <tr>{["Organiser","Email","Events","Attendees","Joined","Status",""].map(h => <th key={h} className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? <tr><td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">Loading…</td></tr>
            : organisers.map(org => (
              <tr key={org.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3"><div className="flex items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">{org.name[0]}</div><div><p className="text-sm font-semibold text-foreground">{org.name}</p><p className="text-xs text-muted-foreground">{org.organisation}</p></div></div></td>
                <td className="px-4 py-3 text-sm text-muted-foreground">{org.email}</td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{org.eventCount}</td>
                <td className="px-4 py-3 text-sm font-semibold text-foreground">{org.totalAttendeeCount}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(org.createdAt).toLocaleDateString("en-GB")}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${org.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{org.status}</span></td>
                <td className="px-4 py-3"><button onClick={() => toggle(org)} disabled={actionId === org.id} className={`rounded-lg px-3 py-1 text-xs font-semibold transition-all disabled:opacity-50 ${org.status === "ACTIVE" ? "border border-red-200 text-red-600 hover:bg-red-50" : "border border-emerald-200 text-emerald-600 hover:bg-emerald-50"}`}>{actionId === org.id ? "…" : org.status === "ACTIVE" ? "Suspend" : "Reactivate"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="rounded-xl border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Previous</button><button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="rounded-xl border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Next</button></div></div>}
    </div>
  );
}
