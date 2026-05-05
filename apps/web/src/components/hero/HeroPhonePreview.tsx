"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Realistic iPhone-style 3D preview.
 *
 * - Titanium frame with side buttons (action / volume / power)
 * - Dynamic Island
 * - Status bar (time, signal, battery)
 * - Mouse-follow parallax tilt on desktop, gentle float on mobile
 * - Glass reflection sweep
 * - Respects prefers-reduced-motion
 */
export function HeroPhonePreview() {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState("");

  // Live status-bar clock
  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = d.getHours() % 12 || 12;
      const m = d.getMinutes().toString().padStart(2, "0");
      setTime(`${h}:${m}`);
    };
    update();
    const id = setInterval(update, 30_000);
    return () => clearInterval(id);
  }, []);

  // Mouse-follow parallax (desktop only)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isCoarse = window.matchMedia("(pointer: coarse)").matches;
    if (reduced || isCoarse) return;

    const node = wrapperRef.current;
    if (!node) return;

    let frame = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX - cx) / rect.width;
        const dy = (e.clientY - cy) / rect.height;
        // Clamp tilt to a tasteful range (-8..8 deg horizontally, -5..5 vertically)
        setTilt({
          x: Math.max(-5, Math.min(5, -dy * 8)),
          y: Math.max(-8, Math.min(8, dx * 12)),
        });
      });
    };
    const onLeave = () => setTilt({ x: 0, y: 0 });

    window.addEventListener("mousemove", onMove);
    node.addEventListener("mouseleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      node.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      className="relative w-[230px] sm:w-[260px] lg:w-[290px] mx-auto lg:mx-0 select-none"
      style={{ perspective: "1600px" }}
    >
      {/* Soft floor shadow */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 -bottom-6 h-8 w-[80%] -translate-x-1/2 rounded-[50%] bg-black/50 blur-2xl opacity-60"
      />

      {/* Phone with 3D transforms */}
      <div
        className="relative animate-phone-float will-change-transform transition-transform duration-300 ease-out"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${tilt.x + 4}deg) rotateY(${tilt.y - 14}deg)`,
        }}
      >
        {/* Outer titanium frame */}
        <div
          className="relative rounded-[44px] p-[3px]"
          style={{
            background:
              "linear-gradient(135deg, #6b7280 0%, #d1d5db 18%, #f3f4f6 40%, #9ca3af 55%, #4b5563 75%, #e5e7eb 92%, #6b7280 100%)",
            boxShadow:
              "0 50px 80px -20px rgba(15,23,42,0.55), 0 25px 40px -15px rgba(15,23,42,0.45), 0 0 0 1px rgba(255,255,255,0.08), inset 0 1px 0 rgba(255,255,255,0.4)",
          }}
        >
          {/* Inner bezel (matte) */}
          <div
            className="relative rounded-[42px] p-[6px]"
            style={{
              background:
                "linear-gradient(160deg, #1f2937 0%, #0f172a 50%, #111827 100%)",
            }}
          >
            {/* Glass screen */}
            <div
              className="relative overflow-hidden rounded-[36px]"
              style={{
                background:
                  "linear-gradient(165deg, #1e1b4b 0%, #312e81 45%, #4c1d95 100%)",
                minHeight: 460,
                boxShadow:
                  "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 0 30px rgba(0,0,0,0.4)",
              }}
            >
              {/* Wallpaper subtle radial */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(60% 40% at 50% 0%, rgba(99,102,241,0.45) 0%, transparent 60%), radial-gradient(40% 30% at 80% 90%, rgba(236,72,153,0.25) 0%, transparent 60%)",
                }}
              />

              {/* Glass reflection sweep */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <div
                  className="absolute -inset-y-10 -left-1/3 w-[60%] rotate-12 animate-glass-sweep"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)",
                  }}
                />
              </div>

              {/* Status bar */}
              <div className="relative flex items-center justify-between px-7 pt-3 text-[10px] font-semibold text-white tabular-nums">
                <span>{time || "9:41"}</span>
                <div className="flex items-center gap-1">
                  {/* Signal */}
                  <svg className="h-2.5 w-3.5" viewBox="0 0 16 10" fill="currentColor">
                    <rect x="0" y="7" width="2" height="3" rx="0.5" />
                    <rect x="3" y="5" width="2" height="5" rx="0.5" />
                    <rect x="6" y="3" width="2" height="7" rx="0.5" />
                    <rect x="9" y="1" width="2" height="9" rx="0.5" opacity="0.4" />
                  </svg>
                  {/* WiFi */}
                  <svg className="h-2.5 w-3" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.4">
                    <path d="M1 3.8 C 3 1.5, 11 1.5, 13 3.8" strokeLinecap="round" />
                    <path d="M3 5.6 C 4.5 4.2, 9.5 4.2, 11 5.6" strokeLinecap="round" />
                    <circle cx="7" cy="8" r="0.9" fill="currentColor" />
                  </svg>
                  {/* Battery */}
                  <div className="ml-0.5 flex items-center">
                    <div className="relative h-2 w-4 rounded-[3px] border border-white/70">
                      <div className="absolute inset-[1px] w-[78%] rounded-[1px] bg-emerald-400" />
                    </div>
                    <div className="h-1 w-[1.5px] rounded-r bg-white/70" />
                  </div>
                </div>
              </div>

              {/* Dynamic Island */}
              <div className="absolute left-1/2 top-2.5 -translate-x-1/2">
                <div className="relative h-[26px] w-[100px] rounded-full bg-black shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
                  {/* Camera lens */}
                  <div className="absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-slate-900 ring-1 ring-slate-700">
                    <div className="absolute inset-[2px] rounded-full bg-gradient-to-br from-slate-700 to-slate-950">
                      <div className="absolute left-[1px] top-[1px] h-[3px] w-[3px] rounded-full bg-blue-400/40 blur-[0.5px]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* App content area */}
              <div className="relative px-4 pt-12 pb-6 space-y-3">
                {/* Notification 1 */}
                <div
                  className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md shadow-lg shadow-black/20 animate-notif-1"
                  style={{ transform: "translateZ(20px)" }}
                >
                  <div className="mb-1.5 flex items-start gap-2.5">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                      style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
                    >
                      VP
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-tight text-white">Vikram Patel</p>
                      <p className="text-[10px] leading-tight text-white/60">wants to connect · 2m ago</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="h-5 w-5 rounded-full bg-emerald-500 text-white text-[9px] font-bold shadow-sm shadow-emerald-500/40">
                        ✓
                      </button>
                    </div>
                  </div>
                  <p className="mb-2 text-[11px] italic leading-snug text-white/75">
                    &ldquo;Loved your talk on cloud architecture&rdquo;
                  </p>
                  <span className="inline-block rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-300">
                    +1 mutual · TechSummit Bengaluru
                  </span>
                </div>

                {/* Notification 2 — smart match */}
                <div
                  className="rounded-2xl border border-white/15 bg-white/10 p-3 backdrop-blur-md shadow-lg shadow-black/20 animate-notif-2"
                  style={{ transform: "translateZ(35px)" }}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-base">✨</span>
                    <p className="text-xs font-semibold leading-tight text-white">
                      Smart match · 92% relevance
                    </p>
                  </div>
                  <p className="mb-1.5 text-[11px] leading-snug text-white/70">
                    Meet 4 people aligned to your services
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-2">
                      {["#10b981", "#6366f1", "#ec4899", "#f59e0b"].map((c, i) => (
                        <div
                          key={c}
                          className="h-5 w-5 rounded-full border border-indigo-900 ring-1 ring-white/20"
                          style={{ background: c, zIndex: 4 - i }}
                        />
                      ))}
                    </div>
                    <p className="text-[10px] font-medium text-indigo-300">View matches →</p>
                  </div>
                </div>

                {/* Notification 3 — connection accepted (deeper z, fades in last) */}
                <div
                  className="rounded-2xl border border-emerald-400/30 bg-emerald-500/15 p-3 backdrop-blur-md shadow-lg shadow-emerald-500/15 animate-notif-3"
                  style={{ transform: "translateZ(50px)" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/40">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold leading-tight text-white">Connection accepted</p>
                      <p className="text-[10px] leading-tight text-white/70">Priya saved your card · just now</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Home indicator */}
              <div className="absolute bottom-2 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-white/70" />
            </div>
          </div>
        </div>

        {/* Side buttons (3D extruded) */}
        {/* Action button (left, top) */}
        <div
          className="absolute left-[-3px] top-[88px] h-6 w-[3px] rounded-l-sm"
          style={{
            background: "linear-gradient(90deg, #4b5563 0%, #6b7280 60%, #9ca3af 100%)",
            boxShadow: "inset 1px 0 0 rgba(255,255,255,0.25)",
            transform: "translateZ(-2px)",
          }}
        />
        {/* Volume up */}
        <div
          className="absolute left-[-3px] top-[125px] h-10 w-[3px] rounded-l-sm"
          style={{
            background: "linear-gradient(90deg, #4b5563 0%, #6b7280 60%, #9ca3af 100%)",
            boxShadow: "inset 1px 0 0 rgba(255,255,255,0.25)",
            transform: "translateZ(-2px)",
          }}
        />
        {/* Volume down */}
        <div
          className="absolute left-[-3px] top-[170px] h-10 w-[3px] rounded-l-sm"
          style={{
            background: "linear-gradient(90deg, #4b5563 0%, #6b7280 60%, #9ca3af 100%)",
            boxShadow: "inset 1px 0 0 rgba(255,255,255,0.25)",
            transform: "translateZ(-2px)",
          }}
        />
        {/* Power button (right) */}
        <div
          className="absolute right-[-3px] top-[140px] h-16 w-[3px] rounded-r-sm"
          style={{
            background: "linear-gradient(270deg, #4b5563 0%, #6b7280 60%, #9ca3af 100%)",
            boxShadow: "inset -1px 0 0 rgba(255,255,255,0.25)",
            transform: "translateZ(-2px)",
          }}
        />
      </div>

      {/* Floating glow orbs that respect 3D space */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-6 top-1/3 h-16 w-16 rounded-full bg-emerald-400/40 blur-2xl animate-float"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 bottom-1/4 h-20 w-20 rounded-full bg-indigo-400/40 blur-2xl animate-float"
        style={{ animationDelay: "1.5s" }}
      />
    </div>
  );
}
