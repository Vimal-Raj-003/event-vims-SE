import Link from "next/link";

export default function ProfileNotFound() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center">
      <h1 className="text-xl font-semibold text-foreground mb-2">
        This attendee isn&apos;t in your event
      </h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
        They may have left the event, or the link is incorrect. Try the directory to find someone else.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        <Link
          href="/directory"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
        >
          Browse directory
        </Link>
        <Link
          href="/home"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-border text-foreground font-semibold text-sm hover:bg-muted"
        >
          Back to home
        </Link>
      </div>
    </div>
  );
}
