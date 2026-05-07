"use client";

import { useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { showToast } from "@/hooks/use-toast";

interface BulkImportAttendeesModalProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
  eventId: string;
  eventName: string;
}

interface ImportResult {
  added: number;
  skipped: { row: number; email: string; reason: string }[];
  errors: { row: number; reason: string; field?: string; value?: string }[];
}

interface ApiError {
  statusCode?: number;
  status?: number;
  code?: string;
  message?: string;
  details?: { missing?: string[]; extra?: string[] };
}

type Step = "intro" | "upload" | "result";

export function BulkImportAttendeesModal({
  open,
  onClose,
  onImported,
  eventId,
  eventName,
}: BulkImportAttendeesModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state every time the modal opens
  useEffect(() => {
    if (!open) return;
    setStep("intro");
    setFile(null);
    setSubmitting(false);
    setResult(null);
    setErrorBanner(null);
    setDownloadingTemplate(false);
  }, [open]);

  // Esc-to-close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  if (!open) return null;

  async function handleDownloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const response = await apiClient.get<Blob>(
        `/events/${eventId}/attendees/import-template`,
        { responseType: "blob" },
      );
      const blob = response.data instanceof Blob
        ? response.data
        : new Blob([response.data as BlobPart], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendees-import-template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      showToast("Could not download the template. Please try again.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  function handleFilePicked(picked: File | null) {
    setErrorBanner(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (!/\.xlsx$/i.test(picked.name)) {
      setErrorBanner("Only .xlsx files are accepted. Re-export from Excel/Sheets.");
      setFile(null);
      return;
    }
    if (picked.size > 5 * 1024 * 1024) {
      setErrorBanner("File is too large. Max 5 MB. Split your list and try again.");
      setFile(null);
      return;
    }
    setFile(picked);
  }

  async function handleUpload() {
    if (!file) return;
    setSubmitting(true);
    setErrorBanner(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await apiClient.post<ImportResult>(
        `/events/${eventId}/attendees/import`,
        form,
        { headers: { "Content-Type": "multipart/form-data" } },
      );
      setResult(data);
      setStep("result");
      onImported();
    } catch (err) {
      const e = err as ApiError & { response?: { data?: ApiError } };
      const apiErr = e.response?.data ?? e;
      const code = apiErr.code;
      const map: Record<string, string> = {
        NO_FILE: "No file selected. Choose an .xlsx file and try again.",
        INVALID_FILE_TYPE: "Only .xlsx files are accepted. Re-export from Excel/Sheets.",
        FILE_TOO_LARGE: "File is too large. Max 5 MB. Split your list and try again.",
        INVALID_TEMPLATE: apiErr.details?.missing?.length
          ? `Headers don't match the template. Missing: ${apiErr.details.missing.join(", ")}.${
              apiErr.details.extra?.length
                ? ` Unexpected: ${apiErr.details.extra.join(", ")}.`
                : ""
            } Re-download the template.`
          : "Sheet 'Attendees' not found. Re-download the template.",
        TOO_MANY_ROWS: "Max 1000 rows per upload. Split your file and re-upload.",
        IMPORT_FAILED: "Import failed, no attendees were added. Please try again.",
        INVALID_FILE: "Could not read the file. Re-export from Excel/Sheets and try again.",
      };
      setErrorBanner(map[code ?? ""] ?? "Connection lost. Your file was not uploaded. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-import-title"
    >
      <div className="relative w-full max-w-lg mt-16 sm:mt-0 rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-2xl">
        <h2 id="bulk-import-title" className="text-lg font-semibold text-foreground">
          Add attendees in bulk to {eventName}
        </h2>

        {step === "intro" && (
          <>
            <p className="text-sm text-muted-foreground mt-1 mb-5">
              Step 1 of 2 — Download the Excel template, fill it in, then come back here to upload.
              Sponsors and key speakers can be tagged using the Category dropdown.
            </p>
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleDownloadTemplate}
                disabled={downloadingTemplate}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm px-4 py-2.5 hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {downloadingTemplate ? "Preparing template…" : "📥 Download template.xlsx"}
              </button>
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                Skip → I already have a filled file
              </button>
            </div>
            <div className="flex justify-end pt-5">
              <button
                type="button"
                onClick={() => setStep("upload")}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90"
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === "upload" && (
          <>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Step 2 of 2 — Upload your filled .xlsx file. Max 1000 rows · 5 MB.
            </p>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFilePicked(e.dataTransfer.files[0] ?? null);
              }}
              className="cursor-pointer rounded-xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center hover:bg-muted/50 transition-colors"
            >
              <p className="text-sm font-medium text-foreground">
                {file ? file.name : "📎 Drag .xlsx here, or click to browse"}
              </p>
              {file && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={(e) => handleFilePicked(e.target.files?.[0] ?? null)}
              />
            </div>
            {errorBanner && (
              <p className="mt-3 text-sm text-rose-500" role="alert">
                {errorBanner}
              </p>
            )}
            <div className="flex justify-between pt-5">
              <button
                type="button"
                onClick={() => setStep("intro")}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleUpload}
                disabled={!file || submitting}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {submitting ? "Uploading…" : "Upload"}
              </button>
            </div>
          </>
        )}

        {step === "result" && result && (
          <>
            <p className="text-sm text-muted-foreground mt-1 mb-4">✅ Import complete.</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="rounded-xl bg-green-50 text-center py-3">
                <p className="text-2xl font-bold text-green-700">{result.added}</p>
                <p className="text-xs text-green-700">added</p>
              </div>
              <div className="rounded-xl bg-amber-50 text-center py-3">
                <p className="text-2xl font-bold text-amber-700">{result.skipped.length}</p>
                <p className="text-xs text-amber-700">skipped</p>
              </div>
              <div className="rounded-xl bg-rose-50 text-center py-3">
                <p className="text-2xl font-bold text-rose-700">{result.errors.length}</p>
                <p className="text-xs text-rose-700">errors</p>
              </div>
            </div>

            {result.skipped.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Skipped:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                  {result.skipped.map((s, i) => (
                    <li key={i}>
                      • row {s.row} — {s.email} (
                      {s.reason === "ALREADY_REGISTERED" ? "already registered" : "duplicate in file"}
                      )
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Errors:</p>
                <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      • row {e.row} — {e.reason.replace(/_/g, " ").toLowerCase()}
                      {e.field ? ` (${e.field})` : ""}
                      {e.value ? `: "${e.value}"` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
