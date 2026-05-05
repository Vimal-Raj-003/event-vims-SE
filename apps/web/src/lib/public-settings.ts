import { cache } from "react";

export interface PublicPlatformSettings {
  platformName: string;
  supportEmail: string;
  selfSignupEnabled: boolean;
}

export const PUBLIC_SETTINGS_FALLBACK: PublicPlatformSettings = {
  platformName: "VIMS Events",
  supportEmail: "admin@vimsenterprise.com",
  selfSignupEnabled: true,
};

/**
 * Server-side fetcher for public platform settings, memoized per request via
 * react.cache() so multiple Server Components / generateMetadata calls in the
 * same request share one network round-trip. Re-fetches every 60s on
 * subsequent requests via Next.js's revalidate. Falls back silently on any
 * failure so SSR never breaks because of a settings read.
 */
export const fetchPublicSettings = cache(
  async (): Promise<PublicPlatformSettings> => {
    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
      const res = await fetch(`${apiUrl}/public/settings`, {
        next: { revalidate: 60 },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as PublicPlatformSettings;
    } catch {
      return PUBLIC_SETTINGS_FALLBACK;
    }
  },
);
