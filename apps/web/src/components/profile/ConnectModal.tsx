"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import { showToast } from "@/hooks/use-toast";

interface ConnectModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  receiver: { id: string; firstName: string };
  eventId: string;
}

export function ConnectModal({ open, onClose, onSent, receiver, eventId }: ConnectModalProps) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setMessage("");
    setError(null);
    setSubmitting(false);
    const t = setTimeout(() => textareaRef.current?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await apiClient.post(`/events/${eventId}/connections`, {
        receiverId: receiver.id,
        message: message.trim() || undefined,
      });
      onSent();
      showToast("Request sent");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send request. Try again.";
      setError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-modal-title"
    >
      <div className="relative w-full max-w-md mt-16 sm:mt-0 rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-2xl">
        <h2 id="connect-modal-title" className="text-lg font-semibold text-foreground">
          Send a connection request to {receiver.firstName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          A short note helps them remember you.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={200}
            placeholder="Add a note (optional)"
            disabled={submitting}
            className="w-full min-h-[100px] max-h-[180px] rounded-lg border border-border bg-background p-3 text-sm focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-60"
          />
          <div className="flex justify-between items-center mt-1.5">
            <span className="text-xs text-muted-foreground">
              {message.length} / 200
            </span>
          </div>

          {error && (
            <p className="mt-3 text-sm text-rose-500" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-2 justify-end mt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
