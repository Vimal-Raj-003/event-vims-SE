"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useAuthStore } from "@/lib/stores/auth-store";
import { apiClient, clearStoredTokens } from "@/lib/api-client";
import ThemeToggle from "@/components/ThemeToggle";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

const ADMIN_PAGE_META: Record<string, { title: string; subtitle: string }> = {
  "overview":          { title: "Platform Overview",  subtitle: "Real-time analytics across all tenants" },
  "organisers":        { title: "Organisers",         subtitle: "Manage organiser accounts & status" },
  "events":            { title: "All Events",         subtitle: "Cross-tenant event management" },
  "deletion-requests": { title: "Deletion Requests",  subtitle: "DPDP right-to-erasure queue" },
  "support-tickets":   { title: "Support Tickets",    subtitle: "Organiser issue tracker" },
  "audit-log":         { title: "Audit Log",          subtitle: "Immutable platform action history" },
  "settings":          { title: "Platform Settings",  subtitle: "Configuration & data exports" },
};

const LINKS = [
  {
    href: "/admin/overview", label: "Platform Overview",
    icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>,
    color: "from-violet-500 to-indigo-600",
  },
  {
    href: "/admin/organisers", label: "Organisers",
    icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>,
    color: "from-blue-500 to-cyan-600",
  },
  {
    href: "/admin/events", label: "All Events",
    icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
    color: "from-emerald-500 to-teal-600",
  },
  {
    href: "/admin/deletion-requests", label: "Deletion Requests",
    icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>,
    color: "from-orange-500 to-amber-600",
  },
  {
    href: "/admin/support-tickets", label: "Support Tickets",
    icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a3 3 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" /></svg>,
    color: "from-rose-500 to-pink-600",
  },
  {
    href: "/admin/audit-log", label: "Audit Log",
    icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>,
    color: "from-slate-500 to-slate-700",
  },
  {
    href: "/admin/settings", label: "Settings",
    icon: <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
    color: "from-gray-500 to-gray-700",
  },
];

const ADMIN_NOTIFS = [
  { id: "a1", title: "New organiser signed up", body: "StartupFund Ventures joined the platform", isRead: false, time: "10m ago" },
  { id: "a2", title: "Deletion request", body: "Attendee data deletion request pending review", isRead: false, time: "1h ago" },
  { id: "a3", title: "Event suspended", body: "Event 'TNDS2022' flagged for review", isRead: true, time: "2d ago" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs] = useState(ADMIN_NOTIFS);
  const notifRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const logoutStore = useAuthStore((s) => s.logout);
  const { data: settings } = usePlatformSettings();
  const platformName = settings.platformName;

  const unread = notifs.filter((n) => !n.isRead).length;

  // Auth guard — redirect to login if not authenticated
  useEffect(() => {
    const auth = localStorage.getItem("vims:auth");
    const tokens = localStorage.getItem("vims:tokens");
    if (!auth && !tokens && !user) {
      router.replace("/auth/super-admin/login");
    }
  }, [user, router]);

  useEffect(() => {
    const stored = localStorage.getItem("admin-sidebar");
    if (stored === "collapsed") setCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("admin-sidebar", collapsed ? "collapsed" : "expanded");
  }, [collapsed]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    if (notifOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  async function handleLogout() {
    try { await apiClient.post("/auth/logout"); } catch { /* ignore */ }
    logoutStore();
    clearStoredTokens();
    router.push("/auth/super-admin/login");
  }

  const initials = user?.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() ?? "SA";

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30 dark:bg-background">
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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-md shadow-red-500/25">
            <span className="text-sm font-black text-white">V</span>
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-foreground leading-none truncate">{platformName} Admin</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Super Admin Panel</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
          {LINKS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center gap-3 rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all duration-150
                  ${active
                    ? `bg-gradient-to-r ${item.color} text-white shadow-sm`
                    : "text-muted-foreground hover:bg-muted hover:text-foreground dark:hover:bg-secondary"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <span className="transition-transform group-hover:scale-110 shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User + Collapse */}
        <div className="border-t border-border p-2 space-y-1">
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

          <div className={`flex items-center gap-3 rounded-xl p-2 hover:bg-muted dark:hover:bg-secondary transition-colors ${collapsed ? "justify-center" : ""}`}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-red-600 text-sm font-bold text-white">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{user?.name ?? "Super Admin"}</p>
                  <p className="truncate text-xs text-muted-foreground">{user?.email ?? "admin@vims.com"}</p>
                </div>
                <button onClick={handleLogout} title="Log out"
                  className="rounded-lg p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors">
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
        <header className="flex h-16 items-center justify-between border-b border-border bg-white dark:bg-card px-4 shadow-sm lg:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted lg:hidden">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          {(() => {
            const segs = pathname.split("/").filter(Boolean);
            const key = segs[segs.length - 1] ?? "overview";
            const meta = ADMIN_PAGE_META[key] ?? { title: key.charAt(0).toUpperCase() + key.slice(1), subtitle: "" };
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
            <div className="relative" ref={notifRef}>
              <button onClick={() => setNotifOpen((v) => !v)}
                className="relative rounded-xl p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                </svg>
                {unread > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white">{unread}</span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-border bg-white dark:bg-card shadow-2xl shadow-black/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <p className="text-sm font-bold text-foreground">Admin Notifications</p>
                    {unread > 0 && (
                      <button onClick={() => setNotifs((n) => n.map((x) => ({ ...x, isRead: true })))} className="text-xs font-semibold text-primary hover:underline">Mark all read</button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {notifs.map((n) => (
                      <button key={n.id} onClick={() => setNotifs((prev) => prev.map((x) => x.id === n.id ? { ...x, isRead: true } : x))}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors ${n.isRead ? "" : "bg-destructive/5"}`}>
                        <div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-destructive"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${n.isRead ? "text-foreground" : "text-destructive"}`}>{n.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <span className="hidden sm:flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-3 py-1 text-xs font-bold text-red-700 dark:text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />Super Admin
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
