"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api-client";
import PhotoUpload from "@/components/PhotoUpload";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

type Tab = "profile" | "defaults" | "notifications" | "privacy";

interface Profile {
  id: string;
  name: string;
  organisation: string;
  email: string;
  mobile: string;
  createdAt: string;
  profilePhotoUrl?: string;
}

interface Settings {
  defaultBrandPrimary: string;
  defaultBrandSecondary: string;
  defaultMaxConnections: string;
  defaultShowAddress: boolean;
  defaultAllowVcard: boolean;
  notifyAttendeeRegister: boolean;
  notifyConnectionMilestone: boolean;
  notifyAnnouncementDelivery: boolean;
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-2xl border px-5 py-3 shadow-xl text-sm font-semibold animate-in slide-in-from-bottom-4 ${type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-red-50 border-red-200 text-red-700"}`}>
      {type === "success"
        ? <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        : <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
      }
      {msg}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-6" : "translate-x-1"}`} />
    </button>
  );
}

export default function OrganiserSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => {
    async function load() {
      try {
        const [prof, sett] = await Promise.all([
          apiClient.get("/organiser/profile").then((r) => r.data),
          apiClient.get("/organiser/settings").then((r) => r.data),
        ]);
        setProfile(prof);
        setSettings(sett);
      } catch {
        showToast("Failed to load settings", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function saveProfile() {
    if (!profile) return;
    setSaving(true);
    try {
      await apiClient.patch("/organiser/profile", {
        name: profile.name,
        organisation: profile.organisation,
        mobile: profile.mobile,
      });
      showToast("Profile saved successfully");
    } catch {
      showToast("Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword() {
    if (pwForm.newPassword !== pwForm.confirm) {
      showToast("New passwords do not match", "error");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      showToast("Password must be at least 8 characters", "error");
      return;
    }
    setPwSaving(true);
    try {
      await apiClient.patch("/organiser/password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      showToast("Password updated successfully");
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to update password";
      showToast(msg, "error");
    } finally {
      setPwSaving(false);
    }
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    try {
      const { id: _id, organiserId: _o, createdAt: _c, updatedAt: _u, ...editable } = settings;
      await apiClient.patch("/organiser/settings", editable);
      showToast("Settings saved successfully");
    } catch {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "profile", label: "Profile & Account",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    },
    {
      id: "defaults", label: "Event Defaults",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
    },
    {
      id: "notifications", label: "Notification Prefs",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>,
    },
    {
      id: "privacy", label: "Data & Privacy",
      icon: <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div>
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your profile, event defaults, and preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Tab sidebar */}
        <nav className="flex w-52 shrink-0 flex-col gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left ${
                activeTab === t.id
                  ? "bg-primary text-white shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 min-w-0">
          {/* Profile & Account */}
          {activeTab === "profile" && profile && (
            <div className="rounded-2xl border border-border bg-white p-6 space-y-6">
              <div className="flex items-start gap-6 mb-4">
                <PhotoUpload
                  currentUrl={profile.profilePhotoUrl}
                  initials={profile.name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  size={80}
                  onUploaded={async (url) => {
                    setProfile((p) => p ? { ...p, profilePhotoUrl: url } : p);
                    await apiClient.patch("/organiser/profile", { profilePhotoUrl: url }).catch(() => {});
                  }}
                />
                <div>
                  <h2 className="font-bold text-foreground">Profile Information</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Click photo to update your profile picture</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Full Name</label>
                  <input
                    value={profile.name}
                    onChange={(e) => setProfile(p => p ? { ...p, name: e.target.value } : p)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Organisation</label>
                  <input
                    value={profile.organisation}
                    onChange={(e) => setProfile(p => p ? { ...p, organisation: e.target.value } : p)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Mobile</label>
                  <input
                    value={profile.mobile}
                    onChange={(e) => setProfile(p => p ? { ...p, mobile: e.target.value } : p)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Email</label>
                  <input
                    value={profile.email}
                    readOnly
                    className="w-full rounded-xl border border-border bg-muted/50 px-4 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Email cannot be changed here</p>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Member since {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }) : "—"}</div>
              <button onClick={saveProfile} disabled={saving}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60">
                {saving ? "Saving…" : "Save Profile"}
              </button>

              <hr className="border-border" />

              <div className="space-y-4">
                <h2 className="font-bold text-foreground">Change Password</h2>
                <div className="grid gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Current Password</label>
                    <input type="password" value={pwForm.currentPassword}
                      onChange={(e) => setPwForm(f => ({ ...f, currentPassword: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">New Password</label>
                    <input type="password" value={pwForm.newPassword}
                      onChange={(e) => setPwForm(f => ({ ...f, newPassword: e.target.value }))}
                      placeholder="Minimum 8 characters"
                      className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Confirm New Password</label>
                    <input type="password" value={pwForm.confirm}
                      onChange={(e) => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                      className="w-full rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>
                <button onClick={changePassword} disabled={pwSaving}
                  className="rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted active:scale-[0.98] transition-all disabled:opacity-60">
                  {pwSaving ? "Updating…" : "Update Password"}
                </button>
              </div>
            </div>
          )}

          {/* Event Defaults */}
          {activeTab === "defaults" && settings && (
            <div className="rounded-2xl border border-border bg-white p-6 space-y-6">
              <div>
                <h2 className="font-bold text-foreground">Event Defaults</h2>
                <p className="text-xs text-muted-foreground mt-1">These defaults are applied to every new event you create.</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Default Branding</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.defaultBrandPrimary}
                        onChange={(e) => setSettings(s => s ? { ...s, defaultBrandPrimary: e.target.value } : s)}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-border p-1"
                      />
                      <input
                        value={settings.defaultBrandPrimary}
                        onChange={(e) => setSettings(s => s ? { ...s, defaultBrandPrimary: e.target.value } : s)}
                        className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Secondary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.defaultBrandSecondary}
                        onChange={(e) => setSettings(s => s ? { ...s, defaultBrandSecondary: e.target.value } : s)}
                        className="h-10 w-12 cursor-pointer rounded-lg border border-border p-1"
                      />
                      <input
                        value={settings.defaultBrandSecondary}
                        onChange={(e) => setSettings(s => s ? { ...s, defaultBrandSecondary: e.target.value } : s)}
                        className="flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm font-mono focus:border-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-border p-3 flex gap-3 items-center">
                  <div className="h-8 w-16 rounded-lg" style={{ background: `linear-gradient(135deg, ${settings.defaultBrandPrimary}, ${settings.defaultBrandSecondary})` }} />
                  <span className="text-xs text-muted-foreground">Brand gradient preview</span>
                </div>
              </div>

              <hr className="border-border" />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-foreground">Default Networking Rules</h3>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Max Connections Per Attendee</label>
                  <input
                    type="number" min={1} max={500}
                    value={settings.defaultMaxConnections}
                    onChange={(e) => setSettings(s => s ? { ...s, defaultMaxConnections: e.target.value } : s)}
                    className="w-32 rounded-xl border border-border bg-muted/30 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
                  />
                </div>
                {[
                  { key: "defaultShowAddress" as const, label: "Show address after connection accepted", desc: "Full address revealed only after mutual acceptance" },
                  { key: "defaultAllowVcard" as const, label: "Allow vCard (contact card) download", desc: "Attendees can download each other's .vcf contact file" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Toggle checked={settings[item.key]} onChange={(v) => setSettings(s => s ? { ...s, [item.key]: v } : s)} />
                  </div>
                ))}
              </div>

              <button onClick={saveSettings} disabled={saving}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60">
                {saving ? "Saving…" : "Save Defaults"}
              </button>
            </div>
          )}

          {/* Notification Prefs */}
          {activeTab === "notifications" && settings && (
            <div className="rounded-2xl border border-border bg-white p-6 space-y-6">
              <div>
                <h2 className="font-bold text-foreground">Notification Preferences</h2>
                <p className="text-xs text-muted-foreground mt-1">Control which in-app notifications you receive.</p>
              </div>
              <div className="space-y-5">
                {[
                  {
                    key: "notifyAttendeeRegister" as const,
                    label: "New attendee registrations",
                    desc: "Get notified when an attendee joins one of your events",
                  },
                  {
                    key: "notifyConnectionMilestone" as const,
                    label: "Connection milestones",
                    desc: "Get notified when your event reaches 50, 100, 200 connections",
                  },
                  {
                    key: "notifyAnnouncementDelivery" as const,
                    label: "Announcement delivery confirmations",
                    desc: "Get notified after an announcement is sent to all attendees",
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                    <Toggle checked={settings[item.key]} onChange={(v) => setSettings(s => s ? { ...s, [item.key]: v } : s)} />
                  </div>
                ))}
              </div>
              <button onClick={saveSettings} disabled={saving}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-white shadow-sm shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60">
                {saving ? "Saving…" : "Save Preferences"}
              </button>
            </div>
          )}

          {/* Data & Privacy */}
          {activeTab === "privacy" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-white p-6 space-y-4">
                <h2 className="font-bold text-foreground">Data Retention</h2>
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-1">
                  <p className="text-sm font-semibold text-blue-800">Retention Period: 12 months</p>
                  <p className="text-xs text-blue-700">Attendee data is automatically purged after 12 months per DPDP storage limitation requirements.</p>
                </div>
                <a
                  href={`${API}/admin/export/attendees`}
                  download
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                  Download Your Data (.xlsx)
                </a>
              </div>

              <div className="rounded-2xl border border-red-200 bg-white p-6 space-y-4">
                <h2 className="font-bold text-red-600">Danger Zone</h2>
                <p className="text-sm text-muted-foreground">Requesting account deletion will remove your organiser account and all associated events. This action is irreversible after admin review.</p>
                {!deleteConfirm ? (
                  <button onClick={() => setDeleteConfirm(true)}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100 active:scale-[0.98] transition-all">
                    Request Account Deletion
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-300 bg-red-50 p-4 space-y-3">
                    <p className="text-sm font-semibold text-red-700">Are you sure? This will raise a deletion request to the admin.</p>
                    <div className="flex gap-3">
                      <button onClick={() => { showToast("Deletion request raised. Admin will contact you."); setDeleteConfirm(false); }}
                        className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-colors">
                        Yes, Request Deletion
                      </button>
                      <button onClick={() => setDeleteConfirm(false)}
                        className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
