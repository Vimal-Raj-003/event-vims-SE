"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiClient } from "@/lib/api-client";
import { showToast } from "@/hooks/use-toast";

interface InviteAttendeeModalProps {
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
  eventId: string;
  eventName: string;
}

type Status = "idle" | "submitting" | "success" | "error";

export function InviteAttendeeModal({
  open,
  onClose,
  onInvited,
  eventId,
  eventName,
}: InviteAttendeeModalProps) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [genericError, setGenericError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  // Reset state + focus only when modal opens
  useEffect(() => {
    if (!open) return;
    setEmail("");
    setFirstName("");
    setStatus("idle");
    setEmailError(null);
    setGenericError(null);
    const t = setTimeout(() => emailRef.current?.focus(), 0);
    return () => clearTimeout(t);
  }, [open]);

  // Esc-to-close listener — re-bind when status changes so closure has latest value
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && status !== "submitting") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, status]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setEmailError(null);
    setGenericError(null);
    try {
      await apiClient.post(`/events/${eventId}/invite-attendee`, {
        email: email.trim(),
        firstName: firstName.trim(),
      });
      onInvited();
      showToast(`Invitation sent to ${email.trim()}`);
      onClose();
    } catch (err) {
      const status = (err as { status?: number; response?: { status?: number } })?.status
        ?? (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        setEmailError("This email is already registered for this event.");
      } else {
        setGenericError("Could not send invitation. Please try again.");
      }
      setStatus("error");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && status !== "submitting") onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-modal-title"
    >
      <div className="relative w-full max-w-md mt-16 sm:mt-0 rounded-2xl bg-card border border-border p-6 sm:p-8 shadow-2xl">
        <h2 id="invite-modal-title" className="text-lg font-semibold text-foreground">
          Invite an attendee to {eventName}
        </h2>
        <p className="text-sm text-muted-foreground mt-1 mb-5">
          We&apos;ll email a one-tap login link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="invite-email" className="block text-sm font-medium text-foreground mb-1.5">
              Email address
            </label>
            <input
              ref={emailRef}
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              disabled={status === "submitting"}
              placeholder="vikram@example.com"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-60"
            />
            {emailError && (
              <p className="mt-1.5 text-xs text-rose-500" role="alert">
                {emailError}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="invite-firstname" className="block text-sm font-medium text-foreground mb-1.5">
              First name
            </label>
            <input
              id="invite-firstname"
              type="text"
              required
              maxLength={80}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={status === "submitting"}
              placeholder="Vikram"
              className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-60"
            />
          </div>

          {genericError && (
            <p className="text-sm text-rose-500" role="alert">
              {genericError}
            </p>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={status === "submitting"}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={status === "submitting"}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {status === "submitting" ? "Sending…" : "Send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
