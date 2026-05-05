"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useRouter } from "next/navigation";
import { apiClient, clearStoredTokens } from "@/lib/api-client";
import ChatbotWidget from "@/components/ChatbotWidget";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "dashboard":     { title: "Dashboard",      subtitle: "Real-time overview of your events" },
  "events":        { title: "My Events",      subtitle: "Create, publish and manage events" },
  "new":           { title: "Create Event",   subtitle: "Launch a new networking event" },
  "account":       { title: "Settings",       subtitle: "Profile, branding & preferences" },
  "attendees":     { title: "Attendees",      subtitle: "Registered attendees" },
  "announcements": { title: "Announcements",  subtitle: "Broadcast messages to attendees" },
  "export":        { title: "Export Data",    subtitle: "Download event data as Excel" },
  "settings":      { title: "Event Settings", subtitle: "Edit event details & branding" },
};

const NAV_ACTIVE: Record<string, string> = {
  "/dashboard": "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25",
  "/events":    "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/25",
  "/events/new":"bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25",
  "/account":   "bg-gradient-to-r from-slate-600 to-gray-700 text-white shadow-md shadow-slate-500/25",
};

const NAV = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/events",
    label: "Events",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
  },
  {
    href: "/events/new",
    label: "Create Event",
    accent: true,
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    href: "/account",
    label: "Settings",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function OrganiserLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const router = useRouter();
  const { data: settings } = usePlatformSettings();
  const platformName = settings.platformName;

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    const auth = localStorage.getItem("vims:auth");
    const tokens = localStorage.getItem("vims:tokens");
    if (!auth && !tokens && !user) {
      router.replace("/auth/organiser/login");
    }
  }, [user, router]);

  // Load persisted collapsed state
  useEffect(() => {
    const stored = localStorage.getItem("org-sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, []);

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("org-sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  async function handleLogout() {
    try { await apiClient.post("/auth/logout"); } catch { /* ignore */ }
    logoutStore();
    clearStoredTokens();
    router.push("/auth/organiser/login");
  }

  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "OR";

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 dark:bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col bg-white dark:bg-card border-r border-border
        transition-[width,transform] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]
        lg:relative lg:translate-x-0
        ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}
        ${collapsed ? "lg:w-[60px]" : "lg:w-64"}
      `}>
        {/* Logo */}
        <div className={`flex h-16 items-center border-b border-border ${collapsed ? "justify-center px-0" : "gap-3 px-5"}`}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/25">
            <span className="text-sm font-black text-white">V</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-foreground leading-none truncate">{platformName}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Organiser</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {!collapsed && <p className="px-2 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">Navigation</p>}
          {NAV.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/account" && pathname.startsWith(item.href));
            const activeClass = NAV_ACTIVE[item.href] ?? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  active
                    ? `${activeClass} border-l-2 border-white/30`
                    : "text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-secondary border-l-2 border-transparent"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <span className="transition-transform group-hover:scale-110 shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Collapse */}
        <div className="border-t border-border p-2 space-y-1">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="hidden lg:flex w-full items-center justify-center rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <svg className={`h-4 w-4 transition-transform duration-250 ${collapsed ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            {!collapsed && <span className="ml-2 text-xs font-medium">Collapse</span>}
          </button>

          {/* User card */}
          <div className={`flex items-center gap-3 rounded-xl p-2 hover:bg-muted dark:hover:bg-secondary transition-colors ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-sm font-bold text-white">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{user?.name ?? "Organiser"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  title="Log out"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-white dark:bg-card px-4 shadow-sm lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted lg:hidden">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          {(() => {
            const segments = pathname.split("/").filter(Boolean);
            const key = segments[segments.length - 1] ?? "dashboard";
            const meta = PAGE_META[key] ?? { title: key.charAt(0).toUpperCase() + key.slice(1), subtitle: "" };
            return (
              <div className="hidden lg:flex flex-col justify-center">
                <h1 className="text-[15px] font-extrabold text-foreground leading-none">{meta.title}</h1>
                {meta.subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{meta.subtitle}</p>}
              </div>
            );
          })()}

          <div className="flex items-center gap-1.5">
            <ThemeToggle />

            {/* Notifications */}
            <Link
              href="/notifications"
              className="rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Activity"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
            </Link>

            <Link href="/events/new" className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-primary/20 hover:brightness-110 transition-all">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              New Event
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>

      <ChatbotWidget />
      <Toaster />
    </div>
  );
}

function Toaster() {
  const toasts = useToast();
  return (
    <div className="fixed bottom-20 inset-x-0 flex flex-col items-center gap-2 z-50 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium shadow-lg"
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
