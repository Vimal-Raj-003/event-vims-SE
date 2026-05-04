"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { showToast } from "@/hooks/use-toast";
import { ConnectModal } from "./ConnectModal";

export type ConnectionStatus =
  | "ACCEPTED"
  | "PENDING_SENT"
  | "PENDING_RECEIVED"
  | null;

interface ProfileActionBarProps {
  attendee: { id: string; firstName: string };
  eventId: string;
  connectionStatus: ConnectionStatus;
  isSelf: boolean;
  pendingConnectionId?: string | null;
  onStatusChange: (status: ConnectionStatus) => void;
}

export function ProfileActionBar({
  attendee,
  eventId,
  connectionStatus,
  isSelf,
  pendingConnectionId,
  onStatusChange,
}: ProfileActionBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [accepting, setAccepting] = useState(false);

  const downloadVCard = () => {
    window.open(`/api/v1/attendees/${attendee.id}/vcard`, "_blank");
    showToast("vCard downloaded");
  };

  const handleAccept = async () => {
    if (!pendingConnectionId) return;
    setAccepting(true);
    try {
      await apiClient.patch(
        `/events/${eventId}/connections/${pendingConnectionId}/accept`,
      );
      onStatusChange("ACCEPTED");
      showToast("Connection accepted");
    } catch {
      showToast("Could not accept request");
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    if (!pendingConnectionId) return;
    setAccepting(true);
    try {
      await apiClient.patch(
        `/events/${eventId}/connections/${pendingConnectionId}/decline`,
      );
      onStatusChange(null);
      showToast("Request declined");
    } catch {
      showToast("Could not decline request");
    } finally {
      setAccepting(false);
    }
  };

  if (isSelf) {
    return (
      <div
        role="region"
        aria-label="Connection actions"
        className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-3 sm:p-4 z-30"
      >
        <div className="max-w-2xl mx-auto text-center text-sm text-muted-foreground">
          This is your profile —{" "}
          <Link href="/card" className="text-primary font-semibold hover:underline">
            view your business card →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        role="region"
        aria-label="Connection actions"
        className="fixed bottom-0 inset-x-0 bg-card border-t border-border p-3 sm:p-4 z-30"
      >
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          {connectionStatus === null && (
            <>
              <button
                onClick={() => setModalOpen(true)}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
              >
                Connect →
              </button>
              <button
                onClick={downloadVCard}
                className="h-11 px-4 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                aria-label="Save vCard"
              >
                ⤓ vCard
              </button>
            </>
          )}

          {connectionStatus === "PENDING_SENT" && (
            <>
              <button
                disabled
                className="flex-1 h-11 rounded-xl bg-muted text-muted-foreground font-semibold text-sm cursor-not-allowed"
              >
                Pending
              </button>
              <button
                onClick={downloadVCard}
                className="h-11 px-4 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                aria-label="Save vCard"
              >
                ⤓ vCard
              </button>
            </>
          )}

          {connectionStatus === "PENDING_RECEIVED" && (
            <>
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="flex-1 h-11 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm disabled:opacity-60 transition-colors"
              >
                Accept
              </button>
              <button
                onClick={handleDecline}
                disabled={accepting}
                className="h-11 px-4 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted disabled:opacity-60 transition-colors"
              >
                Decline
              </button>
            </>
          )}

          {connectionStatus === "ACCEPTED" && (
            <>
              <div className="flex-1 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-semibold text-sm flex items-center justify-center">
                ✓ Connected
              </div>
              <button
                onClick={downloadVCard}
                className="h-11 px-4 rounded-xl bg-muted text-foreground font-semibold text-sm hover:bg-muted/80 transition-colors"
                aria-label="Save vCard"
              >
                ⤓ vCard
              </button>
            </>
          )}
        </div>
      </div>

      <ConnectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSent={() => onStatusChange("PENDING_SENT")}
        receiver={attendee}
        eventId={eventId}
      />
    </>
  );
}
