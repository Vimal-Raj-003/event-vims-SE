"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useBusinessCard, useProfileStatus } from "@/lib/hooks/use-attendee";
import { GlassCard } from "@/components/GlassCard";
import { ShareDrawer } from "@/components/ShareDrawer";

export default function CardPage() {
  const { user, activeEventId } = useAuthStore();
  const { data: card, isLoading: cardLoading } = useBusinessCard();
  const { data: status } = useProfileStatus();
  const [shareOpen, setShareOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (cardLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const profileUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/profile/${user?.id ?? ""}`;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">My Card</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your virtual networking card
          </p>
        </div>
        <Link
          href="/wizard"
          className="rounded-xl border border-border px-3.5 py-2 text-xs font-medium text-foreground hover:bg-muted transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Glass Card */}
      {card && (
        <GlassCard
          ref={cardRef}
          firstName={card.firstName}
          lastName={card.lastName}
          designation={card.designation}
          company={card.company}
          industry={card.industry}
          services={card.services ?? []}
          city={card.city}
          phone={card.phone}
          email={card.email}
          profilePhotoUrl={card.profilePhotoUrl}
          companyLogoUrl={card.companyLogoUrl}
          profileViewCount={status?.profileViewCount ?? 0}
          cardShareCount={status?.cardShareCount ?? 0}
          qrScanCount={status?.qrScanCount ?? 0}
          attendeeId={user?.id ?? ""}
        />
      )}

      {/* Share Button */}
      <button
        onClick={() => setShareOpen(true)}
        className="mt-5 w-full rounded-xl bg-gradient-to-r from-primary to-indigo-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 hover:opacity-90 transition-all"
      >
        Share My Card
      </button>

      {/* Quick Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-white p-3 text-center">
          <p className="text-lg font-bold text-foreground">{status?.profileViewCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Views</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 text-center">
          <p className="text-lg font-bold text-foreground">{status?.cardShareCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Shares</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 text-center">
          <p className="text-lg font-bold text-foreground">{status?.qrScanCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Scans</p>
        </div>
      </div>

      {/* Profile Completeness */}
      {status && !status.profileCompleted && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <span className="text-sm font-medium text-amber-800">Profile incomplete</span>
          </div>
          <p className="mt-1 text-xs text-amber-700">
            Complete your profile to unlock all networking features.
          </p>
          <Link
            href="/wizard"
            className="mt-2 inline-block rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Complete Now
          </Link>
        </div>
      )}

      {/* Share Drawer */}
      <ShareDrawer
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        cardRef={cardRef}
        attendeeName={card ? `${card.firstName} ${card.lastName}` : "Attendee"}
        attendeeId={user?.id ?? ""}
        profileUrl={profileUrl}
      />
    </div>
  );
}
