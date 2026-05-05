"use client";

import { useEffect } from "react";
import { usePlatformSettings } from "@/hooks/use-platform-settings";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { data: settings } = usePlatformSettings();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Something went wrong
        </h1>
        <p className="text-muted-foreground mb-6">
          Try again, or refresh the page. If this keeps happening, contact{" "}
          <a
            href={`mailto:${settings.supportEmail}`}
            className="underline hover:text-foreground"
          >
            {settings.supportEmail}
          </a>
          .
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:opacity-90 transition"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
