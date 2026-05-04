"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { notFound, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { apiClient } from "@/lib/api-client";
import {
  ProfileActionBar,
  type ConnectionStatus,
} from "@/components/profile/ProfileActionBar";

interface PublicProfile {
  id: string;
  firstName: string;
  lastName: string;
  designation?: string | null;
  company?: string | null;
  businessType?: string | null;
  industry?: string | null;
  services?: string[];
  tags?: string[];
  city?: string | null;
  profilePhotoUrl?: string | null;
  companyLogoUrl?: string | null;
  interestedIn?: string | null;
  networkingGoals?: string | null;
  linkedinUrl?: string | null;
  websiteUrl?: string | null;
  twitterHandle?: string | null;
  connectionStatus: ConnectionStatus;
}

const VALID_SOURCES = [
  "directory",
  "home",
  "home_viewers",
  "suggestions",
  "direct",
] as const;

function normalizeSource(input: string | null): string {
  if (!input) return "direct";
  return (VALID_SOURCES as readonly string[]).includes(input) ? input : "direct";
}

export default function AttendeeProfilePage({
  params,
}: {
  params: { attendeeId: string };
}) {
  const searchParams = useSearchParams();
  const source = normalizeSource(searchParams.get("from"));
  const user = useAuthStore((s) => s.user) as
    | { id: string; eventId?: string }
    | null;
  const eventId = user?.eventId;
  const isSelf = user?.id === params.attendeeId;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);
  const [notFoundFlag, setNotFoundFlag] = useState(false);
  const viewTracked = useRef(false);

  if (notFoundFlag) notFound();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    apiClient
      .get<PublicProfile>(`/attendees/${params.attendeeId}/profile`)
      .then(({ data }) => {
        if (!cancelled) setProfile(data);
      })
      .catch((err) => {
        const status = (err as { status?: number; response?: { status?: number } })
          ?.status ?? (err as { response?: { status?: number } })?.response?.status;
        if (!cancelled) {
          if (status === 404 || status === 403) setNotFoundFlag(true);
          else setErrored(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.attendeeId]);

  useEffect(() => {
    if (!profile || isSelf || viewTracked.current) return;
    viewTracked.current = true;
    apiClient
      .post(`/attendees/${params.attendeeId}/view`, { source })
      .catch(() => {});
  }, [profile, isSelf, params.attendeeId, source]);

  useEffect(() => {
    if (!profile || profile.connectionStatus !== "PENDING_RECEIVED" || !eventId)
      return;
    apiClient
      .get<{
        data: Array<{ id: string; senderId: string; receiverId: string; status: string }>;
      }>(`/events/${eventId}/connections?status=PENDING&with=${params.attendeeId}`)
      .then(({ data }) => {
        const found = (data.data ?? []).find(
          (c) => c.senderId === params.attendeeId && c.status === "PENDING",
        );
        setPendingId(found?.id ?? null);
      })
      .catch(() => {});
  }, [profile, eventId, params.attendeeId]);

  if (loading) {
    return (
      <div className="space-y-4 pb-24">
        <div className="h-40 rounded-3xl bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
        <div className="h-32 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  if (errored || !profile) {
    return (
      <div className="space-y-4 pb-24">
        <div className="rounded-2xl border border-border bg-card p-6 text-center">
          <p className="text-foreground font-semibold mb-2">Could not load this profile</p>
          <p className="text-sm text-muted-foreground mb-4">
            Please try again in a moment.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const fullName = `${profile.firstName} ${profile.lastName}`.trim();
  const initials = `${profile.firstName?.[0] ?? ""}${profile.lastName?.[0] ?? ""}`.toUpperCase();
  const meta = [profile.industry, profile.city].filter(Boolean).join(" · ");
  const role = [profile.designation, profile.company].filter(Boolean).join(" · ");

  const hasContent =
    (profile.services?.length ?? 0) > 0 ||
    !!profile.interestedIn ||
    !!profile.networkingGoals ||
    !!profile.linkedinUrl ||
    !!profile.websiteUrl ||
    !!profile.twitterHandle;

  const handleStatusChange = (status: ConnectionStatus) => {
    setProfile((p) => (p ? { ...p, connectionStatus: status } : p));
  };

  return (
    <div className="space-y-4 pb-24">
      <div className="relative rounded-3xl p-6 sm:p-8 overflow-hidden bg-gradient-to-br from-indigo-500 via-violet-500 to-pink-500 text-white">
        <div className="flex flex-col items-center text-center">
          {profile.profilePhotoUrl ? (
            <img
              src={profile.profilePhotoUrl}
              alt=""
              className="w-[72px] h-[72px] rounded-full border-[3px] border-white object-cover"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full border-[3px] border-white bg-white/20 flex items-center justify-center text-2xl font-extrabold">
              {initials}
            </div>
          )}
          <h1 className="mt-3 text-2xl font-bold leading-tight">{fullName}</h1>
          {role && <p className="text-sm text-white/85 mt-1">{role}</p>}
          {meta && (
            <span className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs">
              {meta}
            </span>
          )}
        </div>
      </div>

      {!hasContent ? (
        <p className="text-sm text-muted-foreground text-center px-6 py-4">
          This attendee hasn&apos;t filled out their profile yet.
        </p>
      ) : (
        <>
          {(profile.services?.length ?? 0) > 0 && (
            <Section title="Services offered">
              <div className="flex flex-wrap gap-1.5">
                {profile.services!.map((s) => (
                  <span
                    key={s}
                    className="inline-block px-2.5 py-0.5 rounded-full bg-primary/5 border border-primary/10 text-xs font-medium text-primary"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {profile.interestedIn && (
            <Section title="Looking to meet">
              <p className="text-sm text-foreground leading-relaxed">{profile.interestedIn}</p>
            </Section>
          )}

          {profile.networkingGoals && (
            <Section title="Networking goals">
              <p className="text-sm text-foreground leading-relaxed">{profile.networkingGoals}</p>
            </Section>
          )}

          {(profile.linkedinUrl || profile.websiteUrl || profile.twitterHandle) && (
            <Section title="Links">
              <div className="flex flex-wrap gap-2">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground"
                  >
                    LinkedIn ↗
                  </a>
                )}
                {profile.websiteUrl && (
                  <a
                    href={profile.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground"
                  >
                    Website ↗
                  </a>
                )}
                {profile.twitterHandle && (
                  <a
                    href={`https://twitter.com/${profile.twitterHandle.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-sm text-foreground"
                  >
                    Twitter ↗
                  </a>
                )}
              </div>
            </Section>
          )}
        </>
      )}

      {eventId && (
        <ProfileActionBar
          attendee={{ id: profile.id, firstName: profile.firstName }}
          eventId={eventId}
          connectionStatus={profile.connectionStatus}
          isSelf={isSelf}
          pendingConnectionId={pendingId}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}
