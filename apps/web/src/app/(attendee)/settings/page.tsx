"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useAttendeeProfile } from "@/lib/hooks/use-attendee";
import { showToast } from "@/hooks/use-toast";

export default function AttendeeSettingsPage() {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { data: profile } = useAttendeeProfile();

  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [pauseSubmitting, setPauseSubmitting] = useState(false);

  const [deletionRequested, setDeletionRequested] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof profile?.isPaused === "boolean") {
      setIsPaused(profile.isPaused);
    }
  }, [profile?.isPaused]);

  async function togglePause() {
    if (pauseSubmitting) return;
    const next = !isPaused;
    setIsPaused(next); // optimistic
    setPauseSubmitting(true);
    try {
      await apiClient.patch("/attendees/me", { isPaused: next });
      showToast(next ? "Profile paused" : "Profile unpaused");
    } catch {
      setIsPaused(!next); // revert
      showToast("Could not update");
    } finally {
      setPauseSubmitting(false);
    }
  }

  async function handleDataExport() {
    setExportLoading(true);
    setError("");
    try {
      const { data } = await apiClient.get<Record<string, unknown>>("/attendees/me/data-export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "my-vims-data.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export data. Please try again.");
    } finally {
      setExportLoading(false);
    }
  }

  async function handleDeletionRequest() {
    setDeleteLoading(true);
    setError("");
    try {
      const trimmed = deletionReason.trim();
      await apiClient.post(
        "/attendees/me/request-deletion",
        trimmed ? { reason: trimmed } : {},
      );
      setDeletionRequested(true);
      setShowDeleteConfirm(false);
      setDeletionReason("");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to submit deletion request.");
    } finally {
      setDeleteLoading(false);
    }
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">Settings</h1>

      {/* Pause profile */}
      <section className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-foreground">Pause profile</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              People can&apos;t request to connect while paused.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPaused}
            onClick={togglePause}
            disabled={pauseSubmitting}
            className={`relative h-6 w-11 rounded-full transition-colors shrink-0 ${
              isPaused ? "bg-primary" : "bg-muted"
            } disabled:opacity-60`}
          >
            <span
              className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform ${
                isPaused ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </section>

      {/* Data export */}
      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="font-semibold text-foreground">Download My Data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Export all information we hold about you as a JSON file (DPDP Right to Access).
        </p>
        <button
          onClick={handleDataExport}
          disabled={exportLoading}
          className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          {exportLoading ? "Preparing…" : "Download Data"}
        </button>
      </section>

      {/* Delete account */}
      <section className="rounded-xl border border-destructive/30 bg-white p-5">
        <h2 className="font-semibold text-destructive">Request Data Deletion</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit a request to erase all your personal data from VIMS Events. This will be reviewed within 30 days (DPDP Right to Erasure).
        </p>

        {deletionRequested ? (
          <div className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            Your deletion request has been submitted. We will process it within 30 days.
          </div>
        ) : showDeleteConfirm ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm font-medium text-destructive">
              Are you sure? This cannot be undone once processed.
            </p>

            <label className="block">
              <span className="block text-sm font-medium text-foreground mb-1.5">
                Tell us why <span className="text-muted-foreground font-normal">(optional)</span>
              </span>
              <textarea
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                maxLength={500}
                placeholder="Helps us improve. Leave blank if you'd rather not say."
                className="w-full min-h-[80px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:border-primary/40 transition-colors"
              />
              <p className="mt-1 text-xs text-muted-foreground/60 text-right">
                {deletionReason.length} / 500
              </p>
            </label>

            <div className="flex gap-2">
              <button
                onClick={handleDeletionRequest}
                disabled={deleteLoading}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteLoading ? "Submitting…" : "Yes, request deletion"}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeletionReason("");
                }}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="mt-4 rounded-lg border border-destructive/40 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            Request Data Deletion
          </button>
        )}
      </section>

      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {/* Logout */}
      <section className="rounded-xl border border-border bg-white p-5">
        <h2 className="font-semibold text-foreground">Session</h2>
        <p className="mt-1 text-sm text-muted-foreground">Sign out of your event session.</p>
        <button
          onClick={handleLogout}
          className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Log Out
        </button>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Powered by VIMS Enterprise · Your data is yours
      </p>
    </div>
  );
}
