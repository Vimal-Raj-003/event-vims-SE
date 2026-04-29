import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-white">V</span>
            </div>
            <span className="text-xl font-bold text-foreground">
              VIMS <span className="text-primary">Events</span>
            </span>
          </Link>
        </div>
        <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
          {children}
        </div>
      </div>
    </div>
  );
}
