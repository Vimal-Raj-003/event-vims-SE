"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; message: string };

const listeners: Array<(t: Toast) => void> = [];
let nextId = 1;

export function showToast(message: string) {
  const t = { id: nextId++, message };
  listeners.forEach((l) => l(t));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const onToast = (t: Toast) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== t.id));
      }, 3000);
    };
    listeners.push(onToast);
    return () => {
      const idx = listeners.indexOf(onToast);
      if (idx >= 0) listeners.splice(idx, 1);
    };
  }, []);

  return toasts;
}
