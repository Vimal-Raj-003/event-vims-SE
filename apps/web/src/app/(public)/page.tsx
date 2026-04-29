import Link from "next/link";

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    title: "Create Your Event",
    description:
      "Set up your event in minutes with custom branding, registration fields, and networking rules. Upload your attendee list or let participants self-register.",
  },
  {
    step: "02",
    title: "Attendees Connect",
    description:
      "Participants receive a unique QR code and digital business card. They scan each other to exchange contact details instantly, no app download required.",
  },
  {
    step: "03",
    title: "Build Lasting Relationships",
    description:
      "All connections are saved in a live directory. Attendees export contacts as vCards, follow up post-event, and track their networking progress.",
  },
] as const;

const FEATURES = [
  {
    title: "QR Code Exchange",
    description:
      "Instant contact sharing through scannable QR codes. No physical cards, no manual entry.",
    icon: "scan",
  },
  {
    title: "Live Directory",
    description:
      "Real-time attendee directory with search, filters, and smart matching based on interests.",
    icon: "users",
  },
  {
    title: "Digital Business Cards",
    description:
      "Beautiful, branded digital cards with photo, title, company, social links, and custom fields.",
    icon: "card",
  },
  {
    title: "Custom Branding",
    description:
      "Match your event identity with custom colours, logos, and fonts across the entire platform.",
    icon: "palette",
  },
  {
    title: "Connection Requests",
    description:
      "Privacy-first networking with opt-in connections. Attendees choose who they share details with.",
    icon: "shield",
  },
  {
    title: "Export & Follow-up",
    description:
      "Export all new connections as vCard files or CSV. Sync with your CRM and send follow-up emails.",
    icon: "download",
  },
] as const;

const ATTENDEE_BENEFITS = [
  "No app download required — works in any mobile browser",
  "Your data stays yours — connect only with people you choose",
  "Instant access to your personal networking dashboard",
  "Export connections to your phone contacts or CRM",
  "Smart suggestions based on your industry and interests",
] as const;

const ORGANISER_BENEFITS = [
  "Set up in under 5 minutes with our guided wizard",
  "Upload attendee lists via CSV or integrate with registration platforms",
  "Real-time analytics on networking activity and engagement",
  "Custom branding to match your event identity perfectly",
  "GDPR-compliant with full data control and export capabilities",
] as const;

const PRICING_TIERS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    description: "Perfect for small meetups and workshops",
    features: [
      "Up to 50 attendees",
      "1 active event",
      "QR code networking",
      "Basic analytics",
      "Email support",
    ],
    cta: "Start Free",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "£49",
    period: "/event",
    description: "For conferences and mid-size events",
    features: [
      "Up to 500 attendees",
      "5 active events",
      "Custom branding",
      "Advanced analytics",
      "Priority support",
      "CSV import & export",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale conferences and exhibitions",
    features: [
      "Unlimited attendees",
      "Unlimited events",
      "API access",
      "Dedicated account manager",
      "SSO integration",
      "Custom feature development",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
] as const;

export default function LandingPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary-50 to-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(79,70,229,0.15),rgba(255,255,255,0))]" />
        <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-24 sm:px-6 sm:pb-28 sm:pt-32 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
              Trusted by 2,000+ events worldwide
            </div>
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Networking that{" "}
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                actually works
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
              Replace paper business cards and awkward introductions with smart
              digital networking. VIMS Events helps every attendee make
              meaningful connections at your conference, meetup, or corporate
              event.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/auth/organiser/signup"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-8 text-base font-semibold text-white shadow-lg shadow-primary/25 transition-all hover:bg-primary-600 hover:shadow-xl hover:shadow-primary/30"
              >
                Create Your Event
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-white px-8 text-base font-semibold text-foreground transition-colors hover:bg-muted"
              >
                See How It Works
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three simple steps to transform networking at your event
            </p>
          </div>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {HOW_IT_WORKS_STEPS.map((step) => (
              <div key={step.step} className="relative rounded-2xl border border-border bg-white p-8 shadow-sm transition-shadow hover:shadow-md">
                <span className="text-5xl font-black text-primary-100">
                  {step.step}
                </span>
                <h3 className="mt-4 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Everything You Need for Better Networking
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Purpose-built tools that make professional connections effortless
            </p>
          </div>
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-white p-6 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-50 text-primary">
                  <FeatureIcon name={feature.icon} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For Attendees */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                For Attendees
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Network without the awkwardness
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Walk into any event with confidence. Share your details with a
                quick scan, browse who is around you, and leave with a full
                contact list ready to follow up.
              </p>
              <ul className="mt-8 space-y-4">
                {ATTENDEE_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative rounded-2xl bg-gradient-to-br from-primary-100 to-secondary-100 p-8">
              <div className="rounded-xl bg-white p-6 shadow-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-white">
                    AK
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      Amara Kazeem
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Product Lead, TechFlow
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary">
                    AI/ML
                  </span>
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary">
                    SaaS
                  </span>
                  <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary">
                    Growth
                  </span>
                </div>
                <div className="mt-4 rounded-lg border border-dashed border-primary-300 p-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Scan to connect
                  </p>
                  <div className="mx-auto mt-2 h-24 w-24 bg-muted" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Organisers */}
      <section className="bg-muted/30 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <p className="text-3xl font-bold text-primary">847</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Connections Made
                  </p>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <p className="text-3xl font-bold text-primary">94%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Engagement Rate
                  </p>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <p className="text-3xl font-bold text-primary">312</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Active Attendees
                  </p>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <p className="text-3xl font-bold text-primary">4.8</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Satisfaction
                  </p>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <span className="text-sm font-semibold uppercase tracking-wider text-primary">
                For Organisers
              </span>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Full control, zero complexity
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Manage every aspect of your event networking from a single
                dashboard. Customise the experience, track engagement in real
                time, and deliver measurable value to your sponsors.
              </p>
              <ul className="mt-8 space-y-4">
                {ORGANISER_BENEFITS.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-3">
                    <svg
                      className="mt-0.5 h-5 w-5 shrink-0 text-success"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Simple, Transparent Pricing
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free and scale as your events grow
            </p>
          </div>
          <div className="mt-16 grid gap-8 lg:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl border p-8 ${
                  tier.highlighted
                    ? "border-primary bg-primary text-white shadow-xl shadow-primary/20"
                    : "border-border bg-white"
                }`}
              >
                {tier.highlighted && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-secondary px-4 py-1 text-xs font-semibold text-white">
                    Most Popular
                  </span>
                )}
                <h3
                  className={`text-lg font-semibold ${
                    tier.highlighted ? "text-white" : "text-foreground"
                  }`}
                >
                  {tier.name}
                </h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-extrabold ${
                      tier.highlighted ? "text-white" : "text-foreground"
                    }`}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span
                      className={`text-sm ${
                        tier.highlighted
                          ? "text-primary-200"
                          : "text-muted-foreground"
                      }`}
                    >
                      {tier.period}
                    </span>
                  )}
                </div>
                <p
                  className={`mt-2 text-sm ${
                    tier.highlighted ? "text-primary-200" : "text-muted-foreground"
                  }`}
                >
                  {tier.description}
                </p>
                <ul className="mt-8 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <svg
                        className={`h-4 w-4 shrink-0 ${
                          tier.highlighted ? "text-secondary" : "text-success"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span
                        className={`text-sm ${
                          tier.highlighted ? "text-white" : "text-foreground"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={
                    tier.name === "Enterprise"
                      ? "#"
                      : "/auth/organiser/signup"
                  }
                  className={`mt-8 block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                    tier.highlighted
                      ? "bg-white text-primary hover:bg-primary-50"
                      : "border border-border text-foreground hover:bg-muted"
                  }`}
                >
                  {tier.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            Ready to transform your event networking?
          </h2>
          <p className="mt-4 text-lg text-primary-200">
            Join thousands of organisers who have already made the switch. Set up
            your first event in under five minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/organiser/signup"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-white px-8 text-base font-semibold text-primary transition-colors hover:bg-primary-50"
            >
              Get Started for Free
            </Link>
            <Link
              href="#"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/30 px-8 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Schedule a Demo
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function FeatureIcon({ name }: { name: string }) {
  const icons: Record<string, React.ReactNode> = {
    scan: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
      </svg>
    ),
    users: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
    card: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
    palette: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
      </svg>
    ),
    shield: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    download: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
  };
  return <>{icons[name] ?? null}</>;
}
