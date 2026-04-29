"use client";

const PROFILE = {
  name: "Amara Kazeem",
  title: "Product Lead",
  company: "TechFlow",
  email: "amara@techflow.io",
  phone: "+44 7700 900123",
  linkedin: "linkedin.com/in/amarakazeem",
  website: "techflow.io",
  bio: "Building the future of AI-powered product analytics. Passionate about data-driven decision making and inclusive design.",
  tags: ["AI / ML", "SaaS", "Growth", "Product Strategy"],
};

export default function CardPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-foreground">My Business Card</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Share your card by letting others scan the QR code below
      </p>

      {/* Card preview */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-border shadow-lg">
        {/* Brand header */}
        <div className="h-2 bg-primary" />

        <div className="bg-white p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
              {PROFILE.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-foreground">
                {PROFILE.name}
              </h2>
              <p className="text-sm text-muted-foreground">
                {PROFILE.title}
              </p>
              <p className="text-sm font-medium text-primary">
                {PROFILE.company}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
            {PROFILE.bio}
          </p>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {PROFILE.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-medium text-primary"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Contact details */}
          <div className="mt-6 space-y-2 border-t border-border pt-4">
            <ContactRow icon="mail" label={PROFILE.email} />
            <ContactRow icon="phone" label={PROFILE.phone} />
            <ContactRow icon="linkedin" label={PROFILE.linkedin} />
            <ContactRow icon="globe" label={PROFILE.website} />
          </div>
        </div>
      </div>

      {/* QR Code area */}
      <div className="mt-6 rounded-2xl border border-border bg-white p-6 text-center">
        <p className="text-sm font-medium text-foreground">
          Scan to Connect
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Show this QR code to another attendee to share your details
        </p>
        <div className="mx-auto mt-4 flex h-48 w-48 items-center justify-center rounded-xl border-2 border-dashed border-primary/30 bg-primary-50">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
            </svg>
            <p className="mt-2 text-xs text-primary/60">QR Code</p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button className="rounded-xl border border-border py-3 text-sm font-medium text-foreground hover:bg-muted">
          Download vCard
        </button>
        <button className="rounded-xl bg-primary py-3 text-sm font-medium text-white hover:bg-primary-600">
          Edit Card
        </button>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-white p-3 text-center">
          <p className="text-xl font-bold text-foreground">24</p>
          <p className="text-xs text-muted-foreground">Connections</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 text-center">
          <p className="text-xl font-bold text-foreground">47</p>
          <p className="text-xs text-muted-foreground">QR Scans</p>
        </div>
        <div className="rounded-xl border border-border bg-white p-3 text-center">
          <p className="text-xl font-bold text-foreground">18</p>
          <p className="text-xs text-muted-foreground">Profile Views</p>
        </div>
      </div>
    </div>
  );
}

function ContactRow({
  icon,
  label,
}: {
  icon: "mail" | "phone" | "linkedin" | "globe";
  label: string;
}) {
  const icons: Record<string, React.ReactNode> = {
    mail: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    phone: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
      </svg>
    ),
    linkedin: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a2.25 2.25 0 012.25-2.25h0a2.25 2.25 0 012.25 2.25V21M12 21H5.625M12 21v-9M5.625 21V8.25M5.625 21H3.375M5.625 8.25V5.625M3.375 8.25h2.25M12 12V5.625m0 0h2.25M12 5.625H9.375" />
      </svg>
    ),
    globe: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  };

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-muted-foreground">{icons[icon]}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
