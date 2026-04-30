"use client";

import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

interface FaqItem {
  id: string;
  topic: string;
  question: string;
  keywords: string[];
  answer: string;
}

const FAQ: FaqItem[] = [
  // ── Events ──────────────────────────────────────────────────────────
  {
    id: "e1", topic: "Events", question: "How do I create an event?",
    keywords: ["create event", "new event", "how to create", "add event", "make event"],
    answer: "Click **Create Event** in the sidebar or the '+ New Event' button in the header. Fill in the event name, description, venue, start/end dates, and expected attendance. Your event is saved as a **Draft** — you can keep editing before publishing.",
  },
  {
    id: "e2", topic: "Events", question: "How do I publish an event?",
    keywords: ["publish event", "go live", "make live", "activate event", "launch event"],
    answer: "Open your event, then click the **Publish** button in the event detail page. Publishing generates a permanent QR code and join link. Once published, attendees can register by scanning the QR.",
  },
  {
    id: "e3", topic: "Events", question: "Can I edit a published event?",
    keywords: ["edit published", "update event", "change event", "modify event", "update published"],
    answer: "Yes! You can edit event details (name, description, venue, dates, branding) anytime — even after publishing. Go to **Event → Settings** tab to make changes.",
  },
  {
    id: "e4", topic: "Events", question: "What is the difference between Draft and Published?",
    keywords: ["draft", "published", "status", "difference between", "event status"],
    answer: "**Draft** — event is private, no QR code is shared yet, you're still setting it up. **Published** — event is live, the QR code is active and attendees can join and network.",
  },
  {
    id: "e5", topic: "Events", question: "How do I delete an event?",
    keywords: ["delete event", "remove event", "cancel event", "close event"],
    answer: "Open the event and go to **Settings**. Scroll to the Danger Zone and click **Delete Event**. This soft-deletes the event (hides it from your dashboard) but data is retained per DPDP requirements.",
  },
  // ── QR Code ─────────────────────────────────────────────────────────
  {
    id: "q1", topic: "QR Code", question: "How does the QR code work?",
    keywords: ["qr code", "qr", "how qr", "scan code", "what is qr"],
    answer: "Each event gets a unique QR code. When an attendee scans it, they're taken directly to the event's registration page. After registering, they can network with other attendees at the event.",
  },
  {
    id: "q2", topic: "QR Code", question: "Where do I find my event's QR code?",
    keywords: ["find qr", "where qr", "see qr", "view qr", "qr location"],
    answer: "Go to your **Event detail page** — you'll see the QR code on the right side panel above the download button. It's visible immediately, even for draft events.",
  },
  {
    id: "q3", topic: "QR Code", question: "How do I download the QR code?",
    keywords: ["download qr", "save qr", "export qr", "print qr", "high resolution"],
    answer: "Click the **Download High-Res QR (800px)** button below the QR code image. This downloads a high-quality 800×800px PNG file, ideal for printing on banners, standees, or event materials.",
  },
  {
    id: "q4", topic: "QR Code", question: "What does the QR code link to?",
    keywords: ["qr links to", "qr url", "qr destination", "join link", "joining link"],
    answer: "The QR code links to the **attendee registration page** for your specific event. It includes your event ID so attendees are pre-loaded into the correct event when they scan.",
  },
  // ── Attendees ────────────────────────────────────────────────────────
  {
    id: "a1", topic: "Attendees", question: "How do attendees join my event?",
    keywords: ["attendees join", "how to join", "attendee register", "join event", "register attendee"],
    answer: "Attendees scan the event QR code → land on the registration page → fill in their profile (name, company, industry, etc.) → and they're in! They then appear in your **Attendees** tab.",
  },
  {
    id: "a2", topic: "Attendees", question: "How do I see who registered for my event?",
    keywords: ["see attendees", "view attendees", "who registered", "attendee list", "registered attendees"],
    answer: "Open your event and click the **Attendees** tab. You'll see a searchable, paginated table with each attendee's name, company, industry, city, and registration date.",
  },
  {
    id: "a3", topic: "Attendees", question: "Can I search for a specific attendee?",
    keywords: ["search attendee", "find attendee", "attendee search", "look up attendee"],
    answer: "Yes! Use the search bar at the top of the **Attendees** tab. You can search by name, company, or email. The results update as you type.",
  },
  {
    id: "a4", topic: "Attendees", question: "What does 'Paused' status mean for an attendee?",
    keywords: ["paused attendee", "paused status", "attendee paused", "inactive attendee"],
    answer: "A **Paused** attendee cannot send or receive new connection requests during the event. This can happen if an attendee requests a temporary break from networking. They can resume at any time.",
  },
  // ── Networking ───────────────────────────────────────────────────────
  {
    id: "n1", topic: "Networking", question: "How does the networking feature work?",
    keywords: ["networking", "connections", "how networking", "connect attendees", "meeting"],
    answer: "Attendees at your event can browse a directory of other attendees and send **connection requests**. When both accept, they can see each other's full profiles and download contact cards (vCards).",
  },
  {
    id: "n2", topic: "Networking", question: "Can I limit how many connections each attendee can make?",
    keywords: ["limit connections", "max connections", "connection limit", "restrict connections"],
    answer: "Yes! Go to your event's **Settings → Networking Rules** section. Set the **Max Connections Per Attendee** to any number (default is 50). This prevents spam and ensures quality connections.",
  },
  {
    id: "n3", topic: "Networking", question: "What is 'Show Address After Accept'?",
    keywords: ["show address", "address reveal", "address after accept", "reveal address"],
    answer: "When enabled, an attendee's full address is only visible to another attendee **after** both have accepted the connection request. This protects privacy until mutual interest is confirmed.",
  },
  {
    id: "n4", topic: "Networking", question: "What is vCard download?",
    keywords: ["vcard", "v card", "contact card", "download contact", "business card"],
    answer: "A **vCard** is a digital business card (.vcf file) containing the attendee's contact information. When enabled, attendees can download each other's vCard after connecting — like a digital business card exchange.",
  },
  // ── Announcements ────────────────────────────────────────────────────
  {
    id: "an1", topic: "Announcements", question: "How do I send an announcement?",
    keywords: ["send announcement", "broadcast message", "notify attendees", "message attendees", "announcement"],
    answer: "Go to your event and open the **Announcements** tab. Click **New Announcement**, enter a title and message body (max 500 chars), optionally add a link, then click Send. All registered attendees receive it instantly.",
  },
  {
    id: "an2", topic: "Announcements", question: "Can I include a link in an announcement?",
    keywords: ["link in announcement", "announcement link", "url in message", "add link"],
    answer: "Yes! When creating an announcement there's an optional **Link URL** field. Attendees will see a clickable button in the notification — great for sharing session links, venue maps, or agenda PDFs.",
  },
  {
    id: "an3", topic: "Announcements", question: "How many attendees receive my announcement?",
    keywords: ["announcement recipients", "how many receive", "recipient count", "who gets announcement"],
    answer: "All attendees registered at the time of sending receive the announcement. The **Recipient Count** is shown in the announcement history table so you can track reach.",
  },
  // ── Export ───────────────────────────────────────────────────────────
  {
    id: "ex1", topic: "Export", question: "How do I export attendee data?",
    keywords: ["export", "download data", "excel", "spreadsheet", "export attendees", "download report"],
    answer: "Open your event and click the **Export** tab. Click the download button to get a formatted Excel (.xlsx) file with all event data.",
  },
  {
    id: "ex2", topic: "Export", question: "What is included in the export?",
    keywords: ["what is in export", "export content", "export sheets", "what export includes"],
    answer: "The export file has **4 sheets**: (1) Attendees — full profiles, (2) Connections — all accepted pairings, (3) Engagement Summary — stats per attendee, (4) Announcement Log — all sent announcements.",
  },
  // ── Branding ─────────────────────────────────────────────────────────
  {
    id: "b1", topic: "Branding", question: "How do I customize event branding?",
    keywords: ["branding", "customize", "colors", "brand colors", "event theme", "design event"],
    answer: "In **Event → Settings**, scroll to the **Branding** section. Pick a primary and secondary brand color using the color picker — these are applied to your event's attendee-facing pages and materials.",
  },
  // ── Settings ─────────────────────────────────────────────────────────
  {
    id: "s1", topic: "Settings", question: "How do I update my profile?",
    keywords: ["update profile", "change name", "edit profile", "my profile", "account details"],
    answer: "Go to **Settings** in the sidebar (gear icon). On the **Profile & Account** tab, you can update your name, organisation, and mobile number. Click **Save Profile** when done.",
  },
  {
    id: "s2", topic: "Settings", question: "How do I change my password?",
    keywords: ["change password", "update password", "reset password", "new password"],
    answer: "Go to **Settings → Profile & Account** tab. Scroll to the **Change Password** section, enter your current password and new password (min 8 characters), then click **Update Password**.",
  },
  {
    id: "s3", topic: "Settings", question: "What are Event Defaults?",
    keywords: ["event defaults", "default settings", "default branding", "default rules"],
    answer: "In **Settings → Event Defaults**, you can set default brand colors, max connections, and networking rules that automatically apply to every new event you create — saving you setup time.",
  },
  // ── General ──────────────────────────────────────────────────────────
  {
    id: "g1", topic: "General", question: "What is VIMS Events?",
    keywords: ["what is vims", "about vims", "what does vims do", "platform overview"],
    answer: "**VIMS Events** is a professional event networking platform. It replaces paper business cards with smart digital networking — attendees scan a QR code, register, and can connect with others at your event using their mobile device.",
  },
];

const TOPICS = ["Events", "QR Code", "Attendees", "Networking", "Announcements", "Export", "Branding", "Settings"];

function searchFAQ(query: string): FaqItem[] {
  const lc = query.toLowerCase().trim();
  if (!lc) return [];
  return FAQ.filter(item =>
    item.keywords.some(k => lc.includes(k) || k.includes(lc)) ||
    item.question.toLowerCase().includes(lc)
  ).slice(0, 4);
}

type BotState = "closed" | "home" | "answering" | "topic" | "ticket-form" | "ticket-success";

export default function ChatbotWidget() {
  const [state, setState] = useState<BotState>("closed");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FaqItem[]>([]);
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(null);
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [ticketForm, setTicketForm] = useState({ subject: "", description: "", category: "TECHNICAL" });
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const token = useAuthStore((s) => s.accessToken);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ((state === "home" || state === "answering") && inputRef.current) {
      inputRef.current.focus();
    }
  }, [state]);

  function handleSearch(q: string) {
    setQuery(q);
    if (q.trim()) {
      setResults(searchFAQ(q));
      setState("answering");
    } else {
      setResults([]);
      setState("home");
    }
  }

  function showTopic(topic: string) {
    const items = FAQ.filter(f => f.topic === topic);
    setActiveTopic(topic);
    setResults(items);
    setState("topic");
  }

  async function submitTicket() {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      setError("Subject and description are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API}/support-tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(ticketForm),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? "Failed to submit ticket");
      }
      const data = await res.json();
      setTicketId(data.id);
      setState("ticket-success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setQuery("");
    setResults([]);
    setSelectedFaq(null);
    setActiveTopic(null);
    setTicketForm({ subject: "", description: "", category: "TECHNICAL" });
    setTicketId(null);
    setError(null);
    setState("home");
  }

  if (state === "closed") {
    return (
      <button
        onClick={() => setState("home")}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-xl shadow-primary/30 text-white hover:brightness-110 active:scale-95 transition-all"
        title="Help & Support"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] max-h-[560px] rounded-2xl border border-border bg-white shadow-2xl shadow-black/15 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-primary px-4 py-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-none">VIMS Help</p>
            <p className="text-[10px] text-white/70 mt-0.5">Ask anything · Raise a ticket</p>
          </div>
        </div>
        <button onClick={() => setState("closed")} className="rounded-lg p-1.5 text-white/70 hover:text-white hover:bg-white/10 transition-colors">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Home / answering / topic */}
        {(state === "home" || state === "answering" || state === "topic") && (
          <div className="p-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" /></svg>
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Type your question…"
                className="w-full rounded-xl border border-border bg-muted/40 pl-9 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Selected FAQ detail */}
            {selectedFaq && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 space-y-2">
                <p className="text-xs font-bold text-primary">{selectedFaq.question}</p>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {selectedFaq.answer.split(/\*\*(.*?)\*\*/g).map((part, i) =>
                    i % 2 === 0 ? part : <strong key={i}>{part}</strong>
                  )}
                </p>
                <button onClick={() => setSelectedFaq(null)} className="text-xs text-muted-foreground hover:text-primary transition-colors">← Back</button>
              </div>
            )}

            {/* Search results */}
            {(state === "answering" || state === "topic") && results.length > 0 && !selectedFaq && (
              <div className="space-y-2">
                {state === "topic" && activeTopic && (
                  <div className="flex items-center gap-2">
                    <button onClick={reset} className="text-xs text-muted-foreground hover:text-primary">← All topics</button>
                    <span className="text-xs font-semibold text-foreground">{activeTopic}</span>
                  </div>
                )}
                {results.map((item) => (
                  <button key={item.id} onClick={() => setSelectedFaq(item)}
                    className="w-full text-left rounded-xl border border-border px-3.5 py-3 hover:border-primary/30 hover:bg-primary/3 transition-all group">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{item.question}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{item.answer.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {state === "answering" && results.length === 0 && !selectedFaq && query.length > 2 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center space-y-2">
                <p className="text-sm text-amber-800">No matches found for <strong>"{query}"</strong></p>
                <button onClick={() => { setState("ticket-form"); setTicketForm(f => ({ ...f, subject: query })); }}
                  className="text-xs font-bold text-primary hover:underline">
                  Raise a support ticket →
                </button>
              </div>
            )}

            {/* Topic chips — shown on home or when no results */}
            {!selectedFaq && state === "home" && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Browse by topic</p>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((t) => (
                    <button key={t} onClick={() => showTopic(t)}
                      className="rounded-xl border border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all">
                      {t}
                    </button>
                  ))}
                  <button onClick={() => setState("ticket-form")}
                    className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white transition-all">
                    🎫 Raise Ticket
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ticket Form */}
        {state === "ticket-form" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-2">
              <button onClick={reset} className="text-xs text-muted-foreground hover:text-primary">← Back</button>
              <p className="text-sm font-bold text-foreground">Raise a Support Ticket</p>
            </div>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Subject <span className="text-red-500">*</span></label>
                <input
                  value={ticketForm.subject}
                  onChange={(e) => setTicketForm(f => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief summary of your issue"
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Category <span className="text-red-500">*</span></label>
                <select
                  value={ticketForm.category}
                  onChange={(e) => setTicketForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none bg-white"
                >
                  <option value="TECHNICAL">Technical Issue</option>
                  <option value="EVENT_ISSUE">Event Issue</option>
                  <option value="ATTENDEE_ISSUE">Attendee Issue</option>
                  <option value="ACCOUNT">Account</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Description <span className="text-red-500">*</span></label>
                <textarea
                  value={ticketForm.description}
                  onChange={(e) => setTicketForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Describe the issue in detail…"
                  rows={4}
                  maxLength={1000}
                  className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:border-primary focus:outline-none resize-none"
                />
                <p className="text-right text-[10px] text-muted-foreground mt-0.5">{ticketForm.description.length}/1000</p>
              </div>
            </div>
            <button
              onClick={submitTicket}
              disabled={submitting}
              className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white shadow-sm shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit Ticket"}
            </button>
          </div>
        )}

        {/* Ticket Success */}
        {state === "ticket-success" && (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 border-2 border-emerald-200">
              <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-foreground">Ticket Submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">Our support team will review your request and get back to you.</p>
              {ticketId && (
                <p className="text-xs text-muted-foreground mt-2">
                  Ticket ID: <span className="font-mono font-semibold text-foreground">{ticketId.slice(0, 8).toUpperCase()}</span>
                </p>
              )}
            </div>
            <button onClick={reset} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
              Back to Help
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      {(state === "home" || state === "answering" || state === "topic") && (
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-muted-foreground">VIMS Events Help Center</span>
          <button onClick={() => setState("ticket-form")} className="text-[10px] font-semibold text-primary hover:underline">
            Raise a ticket
          </button>
        </div>
      )}
    </div>
  );
}
