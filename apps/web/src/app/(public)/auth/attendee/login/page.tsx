"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";

type Tab = "id" | "browse" | "qr";

interface OrganiserOption {
  id: string;
  name: string;
  organisation: string;
  eventCount: number;
}

interface EventOption {
  id: string;
  name: string;
  startAt: string;
  endAt: string;
  venue: string;
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/* ──────────────────────────────────────────────────────────────────────
 * Searchable combobox. Used for both the organiser and event pickers.
 * Keyboard nav: ArrowDown / ArrowUp / Enter / Escape.
 * Mouse: click an item to select; click outside to close.
 * ────────────────────────────────────────────────────────────────────── */
interface ComboboxOption {
  id: string;
  primary: string;
  secondary?: string;
  meta?: string;
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
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  // Stable per-instance prefix so option ids don't collide between two
  // comboboxes on the same page (organiser + event pickers).
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

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Reset highlighted index when filter changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query, options.length]);

  // Scroll active item into view
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
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && filtered[activeIndex]) {
        e.preventDefault();
        onChange(filtered[activeIndex]!.id);
        setQuery("");
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  const displayValue = open ? query : (selected ? selected.primary : "");

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
            open && filtered[activeIndex] ? optionId(filtered[activeIndex].id) : undefined
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
            {!loading && filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-muted-foreground">
                {emptyText ?? "No matches"}
              </li>
            )}
            {!loading &&
              filtered.map((opt, idx) => {
                const isActive = idx === activeIndex;
                const isSelected = opt.id === value;
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
                      isActive ? "bg-emerald-50 text-emerald-900" : "text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`truncate ${isSelected ? "font-semibold" : "font-medium"}`}>
                        {opt.primary}
                      </span>
                      {opt.meta && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {opt.meta}
                        </span>
                      )}
                    </div>
                    {opt.secondary && (
                      <span className="truncate text-xs text-muted-foreground">{opt.secondary}</span>
                    )}
                  </li>
                );
              })}
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
  const [eventIdInput, setEventIdInput] = useState("");

  const [organiserId, setOrganiserId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  const [organisers, setOrganisers] = useState<OrganiserOption[]>([]);
  const [organisersLoading, setOrganisersLoading] = useState(false);
  const [organiserEvents, setOrganiserEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto-fill Event ID from URL param (so QR scans land here pre-filled)
  useEffect(() => {
    const fromUrl = searchParams.get("eventId");
    if (fromUrl && fromUrl !== eventIdInput) {
      setEventIdInput(fromUrl);
      setActiveTab("id");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lazy-load organisers when the Browse tab is first opened.
  useEffect(() => {
    if (activeTab !== "browse" || organisers.length > 0 || organisersLoading) return;
    let cancelled = false;
    setOrganisersLoading(true);
    apiClient
      .get<OrganiserOption[]>("/public/organisers")
      .then((res) => {
        if (!cancelled) setOrganisers(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setOrganisers([]);
      })
      .finally(() => {
        if (!cancelled) setOrganisersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeTab, organisers.length, organisersLoading]);

  // Load events whenever the selected organiser changes.
  // `cancelled` flag ensures a slow response from organiser A doesn't
  // overwrite the events list after the user has switched to organiser B.
  useEffect(() => {
    if (!organiserId) {
      setOrganiserEvents([]);
      setEventId(null);
      return;
    }
    let cancelled = false;
    setEventsLoading(true);
    setEventId(null);
    apiClient
      .get<EventOption[]>(`/public/organisers/${organiserId}/events`)
      .then((res) => {
        if (!cancelled) setOrganiserEvents(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setOrganiserEvents([]);
      })
      .finally(() => {
        if (!cancelled) setEventsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organiserId]);

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
      organisers.map((o) => ({
        id: o.id,
        primary: o.name,
        secondary: o.organisation,
        meta: o.eventCount === 1 ? "1 event" : `${o.eventCount} events`,
      })),
    [organisers],
  );

  const eventOptions: ComboboxOption[] = useMemo(
    () =>
      organiserEvents.map((e) => ({
        id: e.id,
        primary: e.name,
        secondary: `${e.venue} · ${formatEventDate(e.startAt)}`,
      })),
    [organiserEvents],
  );

  return (
    <div className="animate-in">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5">
          <svg className="h-3.5 w-3.5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9a2 2 0 10-4 0v5a2 2 0 104 0V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9h.01M15 9h.01" />
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
          <TabSwitcher active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Event ID tab */}
        {activeTab === "id" && (
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-foreground">Event ID</label>
            <input
              type="text"
              required={activeTab === "id"}
              placeholder="Paste the event ID from your invitation"
              value={eventIdInput}
              onChange={(e) => setEventIdInput(e.target.value)}
              className="w-full rounded-2xl border border-border bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 transition-all focus:border-primary focus:bg-white focus:outline-none focus:ring-3 focus:ring-primary/10"
            />
            <p className="text-xs text-muted-foreground">
              The event ID is in the invitation email or the QR code from your organiser.
            </p>
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
              emptyText="This organiser has no live or upcoming events."
            />
          </div>
        )}

        {/* QR tab */}
        {activeTab === "qr" && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-emerald-900">Scan with your phone&apos;s camera</p>
            <p className="mt-1.5 text-xs text-emerald-800/80 leading-relaxed">
              Open your camera app and point it at the event QR code on your invitation, lanyard,
              or event signage. The link will open this page with the event already filled in.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab("id")}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              Or enter the event ID manually
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
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
