"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";

export interface PublicPlatformSettings {
  platformName: string;
  supportEmail: string;
  selfSignupEnabled: boolean;
}

const FALLBACK: PublicPlatformSettings = {
  platformName: "VIMS Events",
  supportEmail: "admin@vimsenterprise.com",
  selfSignupEnabled: true,
};

/**
 * Client Component hook for any FE surface that needs the public platform
 * branding (signup page, error.tsx, etc.). Fetches GET /public/settings on
 * mount and returns { data, loading, error } with a hardcoded FALLBACK so
 * consumers always render meaningful values even when the API is down.
 */
export function usePlatformSettings(): {
  data: PublicPlatformSettings;
  loading: boolean;
  error: Error | null;
} {
  const [data, setData] = useState<PublicPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiClient
      .get<PublicPlatformSettings>("/public/settings")
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setData(FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data: data ?? FALLBACK, loading, error };
}
