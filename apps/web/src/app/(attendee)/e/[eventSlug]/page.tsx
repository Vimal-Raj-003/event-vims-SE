"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";

interface EventInfo {
  id: string;
  name: string;
  description: string;
  venue: string;
  startAt: string;
  endAt: string;
  brandPrimary: string;
  brandLogoUrl?: string;
  bannerUrl?: string;
}

export default function EventEntryPage() {
  const params = useParams<{ eventSlug: string }>();
  const rawSlug = params.eventSlug ?? "";

  // Extract shortHash from the last segment (slug-XXXXXXXX)
  const parts = rawSlug.split("-");
  const shortHash = parts[parts.length - 1];

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!shortHash) {
      setError("Invalid QR code link.");
      setLoading(false);
      return;
    }

    apiClient
      .get<{ event: EventInfo }>(`/qr/${shortHash}`)
      .then(({ data }) => {
        setEvent(data.event);
      })
      .catch((err) => {
        const msg = err?.response?.data?.message;
        setError(msg ?? "This QR code is invalid or the event has ended.");
      })
      .finally(() => setLoading(false));
  }, [shortHash]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
          <svg className="h-8 w-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-bold text-foreground">QR Code Invalid</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || "Event not found."}</p>
      </div>
    );
  }

  const registerUrl = `/auth/attendee/register?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}`;

  return (
    <div className="pb-8">
      {/* Banner */}
      {event.bannerUrl ? (
        <div
          className="h-40 w-full bg-cover bg-center"
          style={{ backgroundImage: `url(${event.bannerUrl})` }}
        />
      ) : (
        <div
          className="h-40 w-full"
          style={{ backgroundColor: event.brandPrimary }}
        />
      )}

      {/* Event card */}
      <div className="-mt-8 mx-4 rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-start gap-4">
          {event.brandLogoUrl ? (
            <img src={event.brandLogoUrl} alt="logo" className="h-14 w-14 rounded-xl object-contain" />
          ) : (
            <div
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold text-white"
              style={{ backgroundColor: event.brandPrimary }}
            >
              {event.name[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-foreground">{event.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">{event.venue}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
          {event.description}
        </p>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span>
            {new Date(event.startAt).toLocaleDateString("en-GB", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-6 px-4 space-y-3">
        <Link
          href={registerUrl}
          className="block w-full rounded-xl py-4 text-center text-base font-semibold text-white shadow-lg"
          style={{ backgroundColor: event.brandPrimary }}
        >
          Register to Network
        </Link>
        <Link
          href={`/auth/attendee/verify?eventId=${event.id}&eventName=${encodeURIComponent(event.name)}&email=`}
          className="block w-full rounded-xl border border-border py-4 text-center text-base font-medium text-foreground hover:bg-muted"
        >
          Already registered? Log in
        </Link>
      </div>

      <p className="mt-6 px-4 text-center text-xs text-muted-foreground">
        Powered by VIMS Enterprise • Privacy-first event networking
      </p>
    </div>
  );
}
