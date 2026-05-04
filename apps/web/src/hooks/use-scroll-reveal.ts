"use client";

import { useEffect, useRef, useState } from "react";

interface UseScrollRevealOptions {
  /** Fraction of element that must be visible before reveal triggers. */
  threshold?: number;
  /** Margin around the root for the observer. */
  rootMargin?: string;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function useScrollReveal<T extends HTMLElement = HTMLDivElement>({
  threshold = 0.15,
  rootMargin = "0px 0px -10% 0px",
}: UseScrollRevealOptions = {}) {
  const ref = useRef<T | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Reduced motion: skip the animation, reveal immediately.
    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      setRevealed(true);
      return;
    }

    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setRevealed(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, revealed };
}
