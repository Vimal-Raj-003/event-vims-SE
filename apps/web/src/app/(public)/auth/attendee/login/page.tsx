"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";
import { apiClient } from "@/lib/api-client";

const AttendeeQrScanner = dynamic(
  () => import("@/components/auth/AttendeeQrScanner").then((m) => m.AttendeeQrScanner),
  { ssr: false },
);

type Tab = "id" | "browse" | "qr";

type EventBucket = "LIVE" | "UPCOMING" | "PAST";

interface OrganiserOption {
  id: string;
  name: string;
  organisation: string;
  eventCount: number;
  liveEventCount: number;
  upcomingEventCount: number;
  pastEventCount: number;
}

interface EventOption {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  venue: string;
  bucket: EventBucket;
}

interface ActiveEventOption {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  venue: string;
  organiserName: string;
  organisation: string;
  bucket: EventBucket;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

const BUCKET_META: Record<EventBucket, { label: string; chipClass: string }> = {
  LIVE: { label: "Live now", chipClass: "bg-emerald-100 text-emerald-800" },
  UPCOMING: { label: "Upcoming", chipClass: "bg-sky-100 text-sky-800" },
  PAST: { label: "Past", chipClass: "bg-zinc-100 text-zinc-600" },
};

/* ──────────────────────────────────────────────────────────────────────
 * Searchable combobox with optional grouped sections.
 * Groups render with a sticky-feel header and visually-muted past items.
 * Keyboard nav: ArrowDown / ArrowUp / Enter / Escape.
 * Mouse: click an item to select; click outside to close.
 * ────────────────────────────────────────────────────────────────────── */
interface ComboboxOption {
  id: string;
  primary: string;
  secondary?: string;
  meta?: string;
  // bucket controls grouping + muted styling for PAST items
  bucket?: EventBucket;
}

interface ComboboxProps {
  label: string;
  placeholder: string;
  options: ComboboxOption[];
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
  emptyText?: string;
  ariaLabel?: string;
  // when true, render Active (LIVE+UPCOMING) and Past sections separately
  groupByBucket?: boolean;
}

function Combobox({
  label,
  placeholder,
  options,
  value,
  onChange,
  disabled,
  loading,
  emptyText,
  ariaLabel,
  groupByBucket,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const instanceId = useRef(`cmb-${Math.random().toString(36).slice(2, 9)}`).current;
  const listboxId = `${instanceId}-listbox`;
  const optionId = (id: string) => `${instanceId}-opt-${id}`;

  const selected = useMemo(() => options.find((o) => o.id === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.primary.toLowerCase().includes(q) ||
        (o.secondary ?? "").toLowerCase().includes(q) ||
        (o.meta ?? "").toLowerCase().includes(q),
    );
  }, [options, query]);

  // When grouping, split into Active + Past while preserving the parent's
  // sort order within each section. Build a flat-with-headers list so
  // keyboard nav still operates over a single index space.
  const grouped = useMemo(() => {
    if (!groupByBucket) {
      return [{ key: "all" as const, label: "", items: filtered }];
    }
    const active = filtered.filter((o) => o.bucket !== "PAST");
    const past = filtered.filter((o) => o.bucket === "PAST");
    const sections: { key: "active" | "past"; label: string; items: ComboboxOption[] }[] = [];
    if (active.length) sections.push({ key: "active", label: "Active", items: active });
    if (past.length) sections.push({ key: "past", label: "Past", items: past });
    return sections;
  }, [filtered, groupByBucket]);

  const flatItems = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, options.length]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && flatItems[activeIndex]) {
        e.preventDefault();
        onChange(flatItems[activeIndex]!.id);
        setQuery("");
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const displayValue = open ? query : (selected ? selected.primary : "");

  let runningIdx = 0;

  return (
    <div className="space-y-1.5" ref={wrapperRef}>
      <label className="block text-sm font-semibold text-foreground">{label}</label>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-label={ariaLabel ?? label}
          aria-activedescendant={
            open && flatItems[activeIndex] ? optionId(flatItems[activeIndex].id) : undefined
          }
          disabled={disabled}
          placeholder={disabled ? "Select an organiser first" : placeholder}
          value={displayValue}
          onFocus={() => !disabled && setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className={`w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10 disabled:opacity-50 disabled:cursor-not-allowed ${
            selected && !open ? "font-medium" : ""
          }`}
        />
        <button
          type="button"
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:cursor-not-allowed"
          aria-label={open ? "Close list" : "Open list"}
          tabIndex={-1}
        >
          <svg
            className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && !disabled && (
          <ul
            ref={listRef}
            id={listboxId}
            role="listbox"
            className="absolute left-0 right-0 top-full mt-2 max-h-64 overflow-y-auto rounded-2xl border border-border bg-white shadow-xl shadow-black/5 z-20 py-1"
          >
            {loading && (
              <li className="px-4 py-3 text-sm text-muted-foreground">Loading…</li>
            )}
            {!loading && flatItems.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                {emptyText ?? "No matches"}
              </li>
            )}
            {!loading &&
              grouped.map((section) => (
                <li key={section.key}>
                  {groupByBucket && section.label && (
                    <div
                      className={`px-4 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider ${
                        section.key === "past" ? "text-zinc-500" : "text-emerald-700"
                      }`}
                    >
                      {section.label}
                    </div>
                  )}
                  <ul>
                    {section.items.map((opt) => {
                      const idx = runningIdx++;
                      const isActive = idx === activeIndex;
                      const isSelected = opt.id === value;
                      const isPast = opt.bucket === "PAST";
                      const meta = opt.meta ?? (opt.bucket ? BUCKET_META[opt.bucket].label : undefined);
                      const metaClass = opt.bucket
                        ? BUCKET_META[opt.bucket].chipClass
                        : "text-muted-foreground";
                      return (
                        <li
                          key={opt.id}
                          id={optionId(opt.id)}
                          data-idx={idx}
                          role="option"
                          aria-selected={isSelected}
                          onMouseEnter={() => setActiveIndex(idx)}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            onChange(opt.id);
                            setQuery("");
                            setOpen(false);
                          }}
                          className={`flex cursor-pointer flex-col gap-0.5 px-4 py-2.5 text-sm transition-colors ${
                            isActive
                              ? "bg-emerald-50 text-emerald-900"
                              : isPast
                                ? "text-zinc-500 hover:bg-zinc-50"
                                : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className={`truncate ${isSelected ? "font-semibold" : "font-medium"}`}>
                              {opt.primary}
                            </span>
                            {meta && (
                              <span
                                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  opt.bucket ? metaClass : "uppercase tracking-wider " + metaClass
                                }`}
                              >
                                {meta}
                              </span>
                            )}
                          </div>
                          {opt.secondary && (
                            <span
                              className={`truncate text-xs ${
                                isPast ? "text-zinc-400" : "text-muted-foreground"
                              }`}
                            >
                              {opt.secondary}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Tab switcher — Event ID (default) · Browse · QR
 * ────────────────────────────────────────────────────────────────────── */
interface TabSwitcherProps {
  active: Tab;
  onChange: (t: Tab) => void;
}

function TabSwitcher({ active, onChange }: TabSwitcherProps) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    {
      id: "id",
      label: "Event ID",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      ),
    },
    {
      id: "browse",
      label: "Browse",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      ),
    },
    {
      id: "qr",
      label: "QR",
      icon: (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div role="tablist" aria-label="Choose how to identify your event" className="grid grid-cols-3 gap-1 rounded-2xl bg-muted/40 p-1">
      {tabs.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={`relative flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              isActive
                ? "bg-white text-foreground shadow-sm shadow-black/5"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function AttendeeLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<Tab>("id");
  const [email, setEmail] = useState("");

  // Event ID tab state — supports both combobox-pick and free-text paste.
  const [eventIdInput, setEventIdInput] = useState("");
  const [activeEvents, setActiveEvents] = useState<ActiveEventOption[]>([]);
  const [activeEventsLoading, setActiveEventsLoading] = useState(false);
  const [pickedActiveEventId, setPickedActiveEventId] = useState<string | null>(null);

  const [organiserId, setOrganiserId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  const [organisers, setOrganisers] = useState<OrganiserOption[]>([]);
  const [organisersLoading, setOrganisersLoading] = useState(false);
  const [organiserEvents, setOrganiserEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // QR tab
  const [qrActive, setQrActive] = useState(false);
  const [qrFilledFlash, setQrFilledFlash] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill Event ID from URL param (so QR scans land here pre-filled)
  useEffect(() => {
    const fromUrl = searchParams.get("eventId");
    if (fromUrl) {
      setEventIdInput(fromUrl);
      setActiveTab("id");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy-load active events list when ID tab opens. Re-runs when activeTab
  // or activeEvents.length flips, but the early-return guard plus
  // AbortController make repeat fires cheap. NEVER include the *Loading state
  // in the dep array of an effect that sets that same state — it produces a
  // cleanup-before-response race that strands the spinner.
  useEffect(() => {
    if (activeTab !== "id" || activeEvents.length > 0) return;
    const ctrl = new AbortController();
    setActiveEventsLoading(true);
    apiClient
      .get<ActiveEventOption[]>("/public/events/active", { signal: ctrl.signal })
      .then((res) => {
        if (!ctrl.signal.aborted) setActiveEvents(res.data ?? []);
      })
      .catch((err) => {
        if (axios.isCancel(err) || ctrl.signal.aborted) return;
        setActiveEvents([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setActiveEventsLoading(false);
      });
    return () => ctrl.abort();
  }, [activeTab, activeEvents.length]);

  // Lazy-load organisers when Browse tab opens. Same AbortController pattern.
  useEffect(() => {
    if (activeTab !== "browse" || organisers.length > 0) return;
    const ctrl = new AbortController();
    setOrganisersLoading(true);
    apiClient
      .get<OrganiserOption[]>("/public/organisers", { signal: ctrl.signal })
      .then((res) => {
        if (!ctrl.signal.aborted) setOrganisers(res.data ?? []);
      })
      .catch((err) => {
        if (axios.isCancel(err) || ctrl.signal.aborted) return;
        setOrganisers([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setOrganisersLoading(false);
      });
    return () => ctrl.abort();
  }, [activeTab, organisers.length]);

  // Load events whenever the selected organiser changes.
  useEffect(() => {
    if (!organiserId) {
      setOrganiserEvents([]);
      setEventId(null);
      return;
    }
    const ctrl = new AbortController();
    setEventsLoading(true);
    setEventId(null);
    apiClient
      .get<EventOption[]>(`/public/organisers/${organiserId}/events`, { signal: ctrl.signal })
      .then((res) => {
        if (!ctrl.signal.aborted) setOrganiserEvents(res.data ?? []);
      })
      .catch((err) => {
        if (axios.isCancel(err) || ctrl.signal.aborted) return;
        setOrganiserEvents([]);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setEventsLoading(false);
      });
    return () => ctrl.abort();
  }, [organiserId]);

  // The picked-active-event combobox is just a different way to populate
  // eventIdInput; keep them in sync so a user who picks then edits the text
  // sees consistent behaviour.
  useEffect(() => {
    if (!pickedActiveEventId) return;
    const ev = activeEvents.find((e) => e.id === pickedActiveEventId);
    if (ev) setEventIdInput(ev.id);
  }, [pickedActiveEventId, activeEvents]);

  const resolvedEventId = activeTab === "browse" ? eventId : eventIdInput.trim();

  const canSubmit =
    email.trim().length > 3 &&
    email.includes("@") &&
    !!resolvedEventId &&
    !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !resolvedEventId) return;
    setError("");
    setLoading(true);
    try {
      const { data } = await apiClient.post<{ message?: string; otpToken?: string; otp?: string }>(
        "/auth/attendee/request-otp",
        { email: email.trim(), eventId: resolvedEventId },
      );
      const otp = data?.otpToken ?? data?.otp ?? null;
      router.push(
        `/auth/attendee/verify?email=${encodeURIComponent(email.trim())}&eventId=${encodeURIComponent(resolvedEventId)}${otp ? `&devOtp=${otp}` : ""}`,
      );
    } catch (err: unknown) {
      const axiosErr = err as { code?: string; response?: { data?: { message?: string } } };
      if (axiosErr.code === "ERR_NETWORK" || axiosErr.code === "ECONNREFUSED") {
        setError("Cannot connect to the server. Please ensure the API is running.");
      } else {
        const msg = axiosErr.response?.data?.message;
        setError(msg ?? "Could not send OTP. Check your event details and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  const organiserOptions: ComboboxOption[] = useMemo(
    () =>
      organisers.map((o) => {
        // Build a meta chip that's honest about live vs upcoming. Past-only
        // organisers fall through to a past count.
        let meta: string;
        if (o.liveEventCount > 0 && o.upcomingEventCount > 0) {
          meta = `${o.liveEventCount} live · ${o.upcomingEventCount} upcoming`;
        } else if (o.liveEventCount > 0) {
          meta = o.liveEventCount === 1 ? "1 live" : `${o.liveEventCount} live`;
        } else if (o.upcomingEventCount > 0) {
          meta = o.upcomingEventCount === 1 ? "1 upcoming" : `${o.upcomingEventCount} upcoming`;
        } else {
          meta = o.pastEventCount === 1 ? "1 past" : `${o.pastEventCount} past`;
        }
        // Bucket drives both grouping (Active vs Past) and the chip color.
        // LIVE wins over UPCOMING — an organiser with even one live event
        // gets a green chip and lands at the top of the Active section.
        const bucket: EventBucket =
          o.liveEventCount > 0 ? "LIVE" : o.upcomingEventCount > 0 ? "UPCOMING" : "PAST";
        return {
          id: o.id,
          primary: o.name,
          secondary: o.organisation,
          meta,
          bucket,
        };
      }),
    [organisers],
  );

  const eventOptions: ComboboxOption[] = useMemo(
    () =>
      organiserEvents.map((e) => ({
        id: e.id,
        primary: e.name,
        secondary: `${e.venue} · ${formatEventDate(e.startAt)}`,
        bucket: e.bucket,
      })),
    [organiserEvents],
  );

  const activeEventOptions: ComboboxOption[] = useMemo(
    () =>
      activeEvents.map((e) => ({
        id: e.id,
        primary: e.name,
        secondary: `${e.organiserName || e.organisation} · ${e.venue} · ${formatEventDate(e.startAt)}`,
        bucket: e.bucket,
      })),
    [activeEvents],
  );

  // Memoised: a fresh reference on every parent render would re-run the
  // QrScanner's effect (it lists onEventId in its deps), tearing down and
  // reinitialising the camera every time the user types in the email input.
  const handleQrEventId = useCallback(
    (id: string) => {
      setEventIdInput(id);
      setPickedActiveEventId(activeEvents.find((e) => e.id === id) ? id : null);
      setQrActive(false);
      setActiveTab("id");
      setQrFilledFlash(true);
      setTimeout(() => setQrFilledFlash(false), 2500);
    },
    [activeEvents],
  );

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5">
          {/* Ticket icon — replaces the malformed SVG that rendered as a "0" */}
          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75c0 .69.56 1.25 1.25 1.25h2.25v6h-2.25c-.69 0-1.25.56-1.25 1.25v.75h-9v-.75c0-.69-.56-1.25-1.25-1.25H4V8h2.25c.69 0 1.25-.56 1.25-1.25V6h9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75v4.5" />
          </svg>
          <span className="text-xs font-semibold text-emerald-700">Attendee Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Join your event</h1>
        <p className="mt-2 text-muted-foreground">Enter your email and pick how to find your event</p>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2.5 rounded-2xl bg-destructive/5 border border-destructive/20 px-4 py-3">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email — always visible */}
        <div className="space-y-1.5">
          <label className="block text-sm font-semibold text-foreground">Email address</label>
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10"
          />
        </div>

        {/* Tab switcher */}
        <div className="space-y-2.5">
          <p className="text-sm font-semibold text-foreground">How do you want to find your event?</p>
          <TabSwitcher
            active={activeTab}
            onChange={(t) => {
              setActiveTab(t);
              if (t !== "qr") setQrActive(false);
            }}
          />
        </div>

        {/* Event ID tab — combobox of currently-active events + free-text paste */}
        {activeTab === "id" && (
          <div className="space-y-3">
            <Combobox
              label="Pick a live or upcoming event"
              ariaLabel="Pick a live or upcoming event"
              placeholder={activeEventsLoading ? "Loading events…" : "Search live events…"}
              options={activeEventOptions}
              value={pickedActiveEventId}
              onChange={(id) => setPickedActiveEventId(id)}
              loading={activeEventsLoading}
              emptyText="No live or upcoming events right now. Paste your Event ID below."
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-foreground">
                …or paste an Event ID
              </label>
              <input
                type="text"
                placeholder="Paste the event ID from your invitation"
                value={eventIdInput}
                onChange={(e) => {
                  setEventIdInput(e.target.value);
                  if (pickedActiveEventId && e.target.value !== pickedActiveEventId) {
                    setPickedActiveEventId(null);
                  }
                }}
                className={`w-full rounded-2xl border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10 ${
                  qrFilledFlash ? "border-emerald-400 ring-2 ring-emerald-200" : "border-border focus:border-primary"
                }`}
              />
              <p className="text-xs text-muted-foreground">
                {qrFilledFlash
                  ? "Filled from QR scan."
                  : "The event ID is in the invitation email or the QR code from your organiser."}
              </p>
            </div>
          </div>
        )}

        {/* Browse tab */}
        {activeTab === "browse" && (
          <div className="space-y-4">
            <Combobox
              label="Organiser"
              ariaLabel="Organiser"
              placeholder="Search organisers…"
              options={organiserOptions}
              value={organiserId}
              onChange={(id) => setOrganiserId(id)}
              loading={organisersLoading}
              emptyText="No public organisers right now. Try Event ID instead."
              groupByBucket
            />
            <Combobox
              label="Event"
              ariaLabel="Event"
              placeholder="Pick an event…"
              options={eventOptions}
              value={eventId}
              onChange={(id) => setEventId(id)}
              disabled={!organiserId}
              loading={eventsLoading}
              emptyText="This organiser has no live, upcoming, or recent events."
              groupByBucket
            />
          </div>
        )}

        {/* QR tab — live in-browser scanner */}
        {activeTab === "qr" && (
          <div className="space-y-3">
            {!qrActive ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
                  <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-emerald-900">Scan with your camera</p>
                <p className="mt-1.5 text-xs text-emerald-800/80 leading-relaxed">
                  Open the camera here and point it at your event QR code. Works on phone (rear camera)
                  and desktop webcam — your browser will ask for permission first.
                </p>
                <button
                  type="button"
                  onClick={() => setQrActive(true)}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 transition-colors"
                >
                  Open camera
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("id")}
                  className="mt-2 block w-full text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  Or enter the event ID manually
                </button>
              </div>
            ) : (
              <AttendeeQrScanner
                onEventId={handleQrEventId}
                onCancel={() => setQrActive(false)}
              />
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={!canSubmit}
          className="group relative w-full overflow-hidden rounded-2xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-700 hover:shadow-emerald-500/40 hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Sending code…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              Send Login Code
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </span>
          )}
        </button>

        <p className="text-xs text-muted-foreground/70 text-center">
          Tip: If you don&apos;t receive the OTP, check your spam/junk folder.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Are you an organiser?{" "}
        <Link href="/auth/organiser/login" className="font-semibold text-primary hover:text-primary-600 transition-colors">
          Organiser login
        </Link>
      </p>
    </div>
  );
}

function AttendeeLoginFallback() {
  return (
    <div className="animate-in">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Join your event</h1>
        <p className="mt-2 text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}

export default function AttendeeLoginPage() {
  return (
    <Suspense fallback={<AttendeeLoginFallback />}>
      <AttendeeLoginContent />
    </Suspense>
  );
}
