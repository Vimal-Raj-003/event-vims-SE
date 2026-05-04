export default function ProfileLoading() {
  return (
    <div className="space-y-4 pb-24" aria-hidden="true">
      <div className="h-40 rounded-3xl bg-gradient-to-br from-muted via-muted/80 to-muted animate-pulse" />
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-4" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-24 bg-muted rounded mb-4" />
        <div className="h-4 w-2/3 bg-muted rounded mb-2" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </div>
      <div className="rounded-2xl border border-border bg-card p-5 animate-pulse">
        <div className="h-3 w-20 bg-muted rounded mb-4" />
        <div className="h-4 w-3/4 bg-muted rounded" />
      </div>
    </div>
  );
}
