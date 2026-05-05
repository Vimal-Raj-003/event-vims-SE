import Link from "next/link";
import { fetchPublicSettings } from "@/lib/public-settings";

export default async function NotFound() {
  const { supportEmail } = await fetchPublicSettings();

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
        <p className="text-lg text-muted-foreground mb-6">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block bg-primary text-primary-foreground px-6 py-2.5 rounded-md font-medium hover:opacity-90 transition"
        >
          Go home
        </Link>
        <p className="text-xs text-muted-foreground mt-8">
          If you believe this is an error, contact{" "}
          <a
            href={`mailto:${supportEmail}`}
            className="underline hover:text-foreground"
          >
            {supportEmail}
          </a>
          .
        </p>
      </div>
    </main>
  );
}
