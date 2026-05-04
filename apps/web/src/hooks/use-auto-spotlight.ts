"use client";

import { useEffect, useRef, useState } from "react";

interface UseAutoSpotlightOptions {
  /** How many items in the cycle. */
  count: number;
  /** Milliseconds between advances. */
  intervalMs: number;
  /** When false, the cycle is paused (e.g., section out of view, hover). */
  enabled: boolean;
  /** Reset to index 0. Increment this value (or change identity) to trigger a reset. */
  resetKey?: unknown;
}

interface UseAutoSpotlightResult {
  activeIndex: number;
  /** Force a manual pause (used by hover/focus handlers). */
  pause: () => void;
  /** Resume after a manual pause. */
  resume: () => void;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useAutoSpotlight({
  count,
  intervalMs,
  enabled,
  resetKey,
}: UseAutoSpotlightOptions): UseAutoSpotlightResult {
  const [activeIndex, setActiveIndex] = useState(0);
  const [manualPause, setManualPause] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Detect prefers-reduced-motion (client-only).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Reset to 0 whenever resetKey changes.
  useEffect(() => {
    setActiveIndex(0);
  }, [resetKey]);

  // Cycle.
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    const shouldRun = enabled && !manualPause && !reducedMotion && count > 1;
    if (!shouldRun) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setActiveIndex((i) => (i + 1) % count);
    }, intervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, manualPause, reducedMotion, count, intervalMs]);

  return {
    activeIndex,
    pause: () => setManualPause(true),
    resume: () => setManualPause(false),
  };
}
