"use client";
import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/lib/api-client";

interface Log { id: string; actorRole?: string; action: string; entityType: string; entityId?: string; metadata: Record<string,unknown>; ip?: string; createdAt: string; organiser?: { name: string; email: string }; }

export default function AuditLogPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [expanded, setExpanded] = useState<string|null>(null);

  const fetch = useCallback(async (p: number, a: string, e: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: "25" });
      if (a) params.set("action", a); if (e) params.set("entityType", e);
      const { data } = await apiClient.get<{ data: Log[]; meta: { totalPages: number } }>(`/admin/audit-log?${params}`);
      setLogs(data.data); setTotalPages(data.meta.totalPages);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => fetch(1, action, entityType), 400); return () => clearTimeout(t); }, [action, entityType, fetch]);
  useEffect(() => { fetch(page, action, entityType); }, [page, fetch, action, entityType]);

  return (
    <div className="space-y-6 animate-in">
      <div><h1 className="text-2xl font-extrabold text-foreground tracking-tight">Audit Log</h1><p className="mt-1 text-sm text-muted-foreground">Immutable record of all admin and system actions</p></div>
      <div className="flex gap-3">
        <input type="search" placeholder="Filter by action…" value={action} onChange={e => { setAction(e.target.value); setPage(1); }} className="flex-1 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
        <input type="search" placeholder="Entity type…" value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }} className="w-36 rounded-2xl border border-border bg-white px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
      </div>
      <div className="space-y-2">
        {loading ? <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>
        : logs.length === 0 ? <div className="py-12 text-center text-sm text-muted-foreground">No logs found</div>
        : logs.map(log => (
          <div key={log.id} className="rounded-2xl border border-border bg-white overflow-hidden">
            <button className="w-full px-5 py-3.5 text-left hover:bg-muted/20 transition-colors" onClick={() => setExpanded(expanded === log.id ? null : log.id)}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="rounded-full bg-primary/5 border border-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shrink-0">{log.entityType}</span>
                  <span className="truncate text-sm font-semibold text-foreground">{log.action}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                  {log.actorRole && <span className="font-medium">{log.actorRole}</span>}
                  <span>{new Date(log.createdAt).toLocaleString("en-GB")}</span>
                  <svg className={`h-3.5 w-3.5 transition-transform ${expanded === log.id ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
              {log.organiser && <p className="mt-0.5 text-xs text-muted-foreground">{log.organiser.name} · {log.organiser.email}</p>}
            </button>
            {expanded === log.id && (
              <div className="border-t border-border bg-muted/20 px-5 py-3 text-xs text-muted-foreground space-y-1">
                {log.entityId && <p><span className="font-semibold">Entity ID:</span> {log.entityId}</p>}
                {log.ip && <p><span className="font-semibold">IP:</span> {log.ip}</p>}
                {Object.keys(log.metadata).length > 0 && <pre className="mt-2 overflow-x-auto rounded-xl bg-muted p-3 text-[11px]">{JSON.stringify(log.metadata, null, 2)}</pre>}
              </div>
            )}
          </div>
        ))}
      </div>
      {totalPages > 1 && <div className="flex items-center justify-between text-sm text-muted-foreground"><span>Page {page} of {totalPages}</span><div className="flex gap-2"><button onClick={() => setPage(p=>Math.max(1,p-1))} disabled={page===1} className="rounded-xl border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Previous</button><button onClick={() => setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="rounded-xl border border-border px-3 py-1.5 hover:bg-muted disabled:opacity-40">Next</button></div></div>}
    </div>
  );
}
