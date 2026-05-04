"use client";

import { useState } from "react";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/stores/auth-store";

interface SuggestionCardProps {
  attendee: {
    id: string;
    firstName: string;
    lastName: string;
    designation: string;
    company: string;
    businessType: string;
    city: string;
    industry: string;
    services: string[];
    profilePhotoUrl: string | null;
    companyLogoUrl: string | null;
    connectionStatus: string | null;
  };
  score: number;
  reasons: string[];
}

export function SuggestionCard({ attendee, score, reasons }: SuggestionCardProps) {
  const { activeEventId } = useAuthStore();
  const [connecting, setConnecting] = useState(false);
  const [sent, setSent] = useState(false);
  const initials = `${attendee.firstName?.[0] ?? ""}${attendee.lastName?.[0] ?? ""}`.toUpperCase();
  const matchPercent = Math.round(score * 100);

  const handleConnect = async () => {
    if (!activeEventId || sent) return;
    setConnecting(true);
    try {
      await apiClient.post(`/events/${activeEventId}/connections`, {
        receiverId: attendee.id,
        message: `Hi ${attendee.firstName}, I'd like to connect!`,
      });
      setSent(true);
    } catch {
      // Error silently
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-white p-4 transition-all hover:shadow-md">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Link href={`/profile/${attendee.id}?from=suggestions`}>
          <div className="relative flex-shrink-0">
            {attendee.profilePhotoUrl ? (
              <img
                src={attendee.profilePhotoUrl}
                alt={`${attendee.firstName} ${attendee.lastName}`}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 text-sm font-bold text-white">
                {initials}
              </div>
            )}
            {/* Match badge */}
            <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white shadow-md">
              {matchPercent}
            </div>
          </div>
        </Link>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <Link href={`/profile/${attendee.id}?from=suggestions`}>
            <h3 className="text-sm font-semibold text-foreground hover:text-primary transition-colors">
              {attendee.firstName} {attendee.lastName}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground">
            {attendee.designation} at {attendee.company}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
              >
                {reason}
              </span>
            ))}
          </div>
        </div>

        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={connecting || sent}
          className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
            sent
              ? "bg-emerald-50 text-emerald-600"
              : "bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
          }`}
        >
          {sent ? "Sent" : connecting ? "..." : "Connect"}
        </button>
      </div>
    </div>
  );
}
