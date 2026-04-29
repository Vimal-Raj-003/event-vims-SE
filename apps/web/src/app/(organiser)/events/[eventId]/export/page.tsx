"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

export default function ExportPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  async function handleExport() {
    setError("");
    setDownloading(true);
    try {
      const response = await apiClient.get(`/events/${eventId}/export`, {
        responseType: "blob",
      });
      const contentDisposition = response.headers["content-disposition"] as string | undefined;
      const filenameMatch = contentDisposition?.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch?.[1] ?? `event-${eventId}-export.xlsx`;

      const url = URL.createObjectURL(new Blob([response.data as BlobPart]));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? "Failed to generate export. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  const SHEETS = [
    { name: "Attendees", description: "Full attendee list with all profile fields, registration time, and status" },
    { name: "Connections", description: "Every connection request with sender, receiver, status, and timestamps" },
    { name: "Engagement Summary", description: "Per-attendee engagement: requests sent/received, connections accepted" },
    { name: "Announcement Log", description: "All announcements sent with recipient counts" },
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-foreground">Export Data</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Download a full Excel report of your event data
      </p>

      <div className="mt-6 rounded-xl border border-border bg-white p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50">
            <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-foreground">Excel Report (.xlsx)</p>
            <p className="text-sm text-muted-foreground">Contains {SHEETS.length} worksheets</p>
          </div>
        </div>

        <ul className="mt-5 space-y-3">
          {SHEETS.map((sheet, idx) => (
            <li key={sheet.name} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary">
                {idx + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{sheet.name}</p>
                <p className="text-xs text-muted-foreground">{sheet.description}</p>
              </div>
            </li>
          ))}
        </ul>

        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <button
          onClick={handleExport}
          disabled={downloading}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {downloading ? (
            <>
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Download Excel Export
            </>
          )}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        The report includes all data collected for this event. Keep it secure and handle in accordance with your privacy policy.
      </p>
    </div>
  );
}
