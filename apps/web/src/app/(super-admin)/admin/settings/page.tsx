"use client";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const EXPORTS = [
  {
    label: "Export All Organisers",
    desc: "Name, organisation, email, mobile, status, event count",
    icon: "🏢",
    url: `${API}/admin/export/organisers`,
    color: "text-primary bg-primary/8 border-primary/20",
  },
  {
    label: "Export All Events",
    desc: "Event name, status, venue, dates, attendee count, QR join link",
    icon: "📅",
    url: `${API}/admin/export/events`,
    color: "text-violet-600 bg-violet-50 border-violet-200",
  },
  {
    label: "Export All Attendees",
    desc: "Full contact details, company, industry, consent status",
    icon: "👥",
    url: `${API}/admin/export/attendees`,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
];

export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Platform Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Global configuration and data exports for VIMS Events</p>
      </div>

      {/* ── Data Export ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
        <div>
          <h2 className="font-bold text-foreground">Data Export</h2>
          <p className="text-xs text-muted-foreground mt-1">Download platform data as formatted Excel spreadsheets. All exports include headers and are print-ready.</p>
        </div>
        <div className="space-y-3">
          {EXPORTS.map((ex) => (
            <a
              key={ex.label}
              href={ex.url}
              download
              className={`flex items-center gap-4 rounded-2xl border px-4 py-4 transition-all hover:-translate-y-0.5 hover:shadow-md ${ex.color}`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-xl border border-white/60">
                {ex.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground">{ex.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ex.desc}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1 rounded-xl bg-white/80 border border-current/20 px-3 py-1.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                <span className="text-xs font-bold">.xlsx</span>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── Platform Identity ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
        <h2 className="font-bold text-foreground">Platform Identity</h2>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Platform Name</label>
          <input defaultValue="VIMS Event Networking" className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Support Email</label>
          <input type="email" defaultValue="admin@vims-enterprise.com" className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>

      {/* ── Data Retention ───────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
        <h2 className="font-bold text-foreground">Data Retention</h2>
        <p className="text-sm text-muted-foreground">Attendee data is automatically purged after the retention period per DPDP storage limitation requirements.</p>
        <div>
          <label className="block text-sm font-semibold text-foreground mb-1.5">Retention Period (months)</label>
          <input type="number" defaultValue={12} min={1} max={60} className="w-32 rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" />
        </div>
      </div>

      {/* ── Feature Flags ────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
        <h2 className="font-bold text-foreground">Feature Flags</h2>
        {[
          ["Allow organiser self-signup", true],
          ["Card-to-card QR connections", false],
          ["Cross-event networks (opt-in)", false],
          ["Multi-language support", false],
        ].map(([label, on]) => (
          <div key={String(label)} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{String(label)}</span>
            <div className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
            </div>
          </div>
        ))}
      </div>

      <button className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/20 hover:brightness-110 transition-all active:scale-[0.98]">
        Save Settings
      </button>
    </div>
  );
}
