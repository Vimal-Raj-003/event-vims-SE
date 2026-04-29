export default function AdminSettingsPage() {
  return (
    <div className="max-w-2xl space-y-6 animate-in">
      <div><h1 className="text-2xl font-extrabold text-foreground tracking-tight">Platform Settings</h1><p className="mt-1 text-sm text-muted-foreground">Global configuration for VIMS Events</p></div>
      <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
        <h2 className="font-bold text-foreground">Platform Identity</h2>
        <div><label className="block text-sm font-semibold text-foreground mb-1.5">Platform Name</label><input defaultValue="VIMS Event Networking" className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" /></div>
        <div><label className="block text-sm font-semibold text-foreground mb-1.5">Support Email</label><input type="email" defaultValue="admin@vims-enterprise.com" className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
        <h2 className="font-bold text-foreground">Data Retention</h2>
        <p className="text-sm text-muted-foreground">Attendee data is automatically purged 12 months after event end date per DPDP storage limitation requirements.</p>
        <div><label className="block text-sm font-semibold text-foreground mb-1.5">Retention Period (months)</label><input type="number" defaultValue={12} min={1} max={60} className="w-32 rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none" /></div>
      </div>
      <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
        <h2 className="font-bold text-foreground">Feature Flags</h2>
        {[["Allow organiser self-signup", true],["Card-to-card QR connections", false],["Cross-event networks (opt-in)", false],["Multi-language support", false]].map(([label, on]) => (
          <div key={String(label)} className="flex items-center justify-between">
            <span className="text-sm text-foreground">{String(label)}</span>
            <div className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
              <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-6" : "translate-x-1"}`} />
            </div>
          </div>
        ))}
      </div>
      <button className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-600 transition-all active:scale-[0.98]">Save Settings</button>
    </div>
  );
}
