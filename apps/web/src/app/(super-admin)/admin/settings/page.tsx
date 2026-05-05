"use client";

import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api-client";

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

interface PlatformSettings {
  id: string;
  platformName: string;
  supportEmail: string;
  dataRetentionMonths: number;
  allowOrganiserSelfSignup: boolean;
  cardToCardQrConnections: boolean;
  crossEventNetworks: boolean;
  multiLanguageSupport: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

type Editable = Pick<
  PlatformSettings,
  "platformName" | "supportEmail" | "dataRetentionMonths" | "allowOrganiserSelfSignup"
>;

export default function AdminSettingsPage() {
  const [loaded, setLoaded] = useState<PlatformSettings | null>(null);
  const [form, setForm] = useState<Editable | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get<PlatformSettings>("/admin/settings")
      .then((res) => {
        if (cancelled) return;
        const data = res.data;
        setLoaded(data);
        setForm({
          platformName: data.platformName,
          supportEmail: data.supportEmail,
          dataRetentionMonths: data.dataRetentionMonths,
          allowOrganiserSelfSignup: data.allowOrganiserSelfSignup,
        });
      })
      .catch(() => {
        if (!cancelled) showToast("Failed to load settings.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = useMemo(() => {
    if (!loaded || !form) return false;
    return (
      loaded.platformName !== form.platformName ||
      loaded.supportEmail !== form.supportEmail ||
      loaded.dataRetentionMonths !== form.dataRetentionMonths ||
      loaded.allowOrganiserSelfSignup !== form.allowOrganiserSelfSignup
    );
  }, [loaded, form]);

  const handleSave = async () => {
    if (!loaded || !form || !isDirty) return;
    setIsSaving(true);

    const delta: Partial<Editable> = {};
    if (loaded.platformName !== form.platformName) delta.platformName = form.platformName;
    if (loaded.supportEmail !== form.supportEmail) delta.supportEmail = form.supportEmail;
    if (loaded.dataRetentionMonths !== form.dataRetentionMonths)
      delta.dataRetentionMonths = form.dataRetentionMonths;
    if (loaded.allowOrganiserSelfSignup !== form.allowOrganiserSelfSignup)
      delta.allowOrganiserSelfSignup = form.allowOrganiserSelfSignup;

    try {
      const res = await apiClient.patch<PlatformSettings>("/admin/settings", delta);
      const updated = res.data;
      setLoaded(updated);
      setForm({
        platformName: updated.platformName,
        supportEmail: updated.supportEmail,
        dataRetentionMonths: updated.dataRetentionMonths,
        allowOrganiserSelfSignup: updated.allowOrganiserSelfSignup,
      });
      showToast("Settings saved.");
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string | string[] } } };
      const apiMessage = err?.response?.data?.message;
      const message = Array.isArray(apiMessage)
        ? apiMessage[0]
        : typeof apiMessage === "string"
          ? apiMessage
          : e instanceof Error
            ? e.message
            : "Failed to save settings.";
      showToast(typeof message === "string" && message.length > 0 ? message : "Failed to save settings.");
    } finally {
      setIsSaving(false);
    }
  };

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

      {!form || !loaded ? (
        <div className="rounded-2xl border border-border bg-white p-6 text-sm text-muted-foreground">
          Loading settings…
        </div>
      ) : (
        <>
          {/* ── Platform Identity ────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-white p-6 space-y-5">
            <h2 className="font-bold text-foreground">Platform Identity</h2>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Platform Name</label>
              <input
                type="text"
                value={form.platformName}
                onChange={(e) => setForm({ ...form, platformName: e.target.value })}
                maxLength={100}
                className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Support Email</label>
              <input
                type="email"
                value={form.supportEmail}
                onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* ── Data Retention ───────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
            <h2 className="font-bold text-foreground">Data Retention</h2>
            <p className="text-sm text-muted-foreground">
              Attendee data is automatically purged after the retention period per DPDP storage limitation requirements.
            </p>
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5">Retention Period (months)</label>
              <input
                type="number"
                min={1}
                max={120}
                value={form.dataRetentionMonths}
                onChange={(e) =>
                  setForm({ ...form, dataRetentionMonths: parseInt(e.target.value, 10) || 1 })
                }
                className="w-32 rounded-2xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
              />
              <p className="text-xs text-muted-foreground mt-2 italic">
                Saved. Automatic purging will activate in a future release.
              </p>
            </div>
          </div>

          {/* ── Feature Flags ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-white p-6 space-y-1">
            <h2 className="font-bold text-foreground mb-2">Feature Flags</h2>

            <FlagRow
              label="Allow organiser self-signup"
              checked={form.allowOrganiserSelfSignup}
              onChange={(v) => setForm({ ...form, allowOrganiserSelfSignup: v })}
            />
            <FlagRow label="Card-to-card QR connections" checked={false} disabled comingSoon />
            <FlagRow label="Cross-event networks (opt-in)" checked={false} disabled comingSoon />
            <FlagRow label="Multi-language support" checked={false} disabled comingSoon />
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-bold text-white shadow-md shadow-primary/20 hover:brightness-110 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 disabled:hover:brightness-100"
          >
            {isSaving ? "Saving…" : "Save Settings"}
          </button>

          <p className="text-xs text-muted-foreground">
            Last updated by {loaded.updatedBy ?? "system"} on {new Date(loaded.updatedAt).toLocaleString()}.
            Public surfaces (emails, signup page) reflect changes within a minute.
          </p>
        </>
      )}

      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 rounded-2xl border border-border bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}

function FlagRow({
  label,
  checked,
  onChange,
  disabled,
  comingSoon,
}: {
  label: string;
  checked: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border/60 last:border-b-0">
      <div className="flex items-center gap-2">
        <span className={`text-sm ${disabled ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
        {comingSoon && (
          <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
            Coming soon
          </span>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
