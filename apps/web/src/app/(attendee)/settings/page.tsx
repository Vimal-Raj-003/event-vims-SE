"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

export default function AttendeeSettingsPage() {
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();
  const [deletionRequested, setDeletionRequested] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState("");

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
      await apiClient.post("/attendees/me/request-deletion");
      setDeletionRequested(true);
      setShowDeleteConfirm(false);
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
          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-destructive">
              Are you sure? This cannot be undone once processed.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDeletionRequest}
                disabled={deleteLoading}
                className="rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 disabled:opacity-50"
              >
                {deleteLoading ? "Submitting…" : "Yes, request deletion"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
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
