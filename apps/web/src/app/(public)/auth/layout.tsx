import Link from "next/link";
import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — Form panel */}
      <div className="flex flex-col justify-center px-4 py-12 sm:px-8 lg:px-12 xl:px-20">
        <div className="mx-auto w-full max-w-sm">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 mb-10 group w-fit">
            <div className="relative h-10 w-10 overflow-hidden rounded-xl shadow-md shadow-primary/30 transition-transform duration-200 group-hover:scale-105">
              <Image src="/logo.png" alt="VIMS Events" fill className="object-cover" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              VIMS <span className="text-primary">Events</span>
            </span>
          </Link>
          {children}
        </div>
      </div>

      {/* Right — Visual panel */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 p-12 overflow-hidden relative">
        {/* Orbs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute top-16 right-8 h-72 w-72 rounded-full bg-indigo-600/25 blur-3xl" />
          <div className="animate-blob absolute bottom-16 left-8 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" style={{ animationDelay: "3s" }} />
        </div>

        {/* Logo big */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="relative h-12 w-12 overflow-hidden rounded-2xl shadow-xl shadow-black/30">
            <Image src="/logo.png" alt="VIMS Events" fill className="object-cover" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-white">VIMS Events</p>
            <p className="text-xs text-white/40">Smart Event Networking</p>
          </div>
        </div>

        {/* Testimonial */}
        <blockquote className="relative z-10">
          <div className="flex gap-0.5 mb-4">
            {[1,2,3,4,5].map((s) => (
              <svg key={s} className="h-4 w-4 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            ))}
          </div>
          <p className="text-xl font-medium text-white/90 leading-relaxed">
            &ldquo;VIMS Events transformed our conference. Attendees made 3x more connections — and every one was meaningful.&rdquo;
          </p>
          <footer className="mt-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold text-white shadow-md">
              PS
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Priya Sharma</p>
              <p className="text-xs text-white/50">VP Events, TechConnect India</p>
            </div>
          </footer>
        </blockquote>

        {/* Feature chips */}
        <div className="relative z-10 space-y-2.5">
          {[
            { icon: "⚡", text: "Set up in under 5 minutes" },
            { icon: "🔒", text: "Privacy-first, DPDP compliant" },
            { icon: "📊", text: "Real-time live analytics" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-3 rounded-2xl bg-white/6 border border-white/10 px-4 py-3 backdrop-blur-sm transition-all duration-200 hover:bg-white/10">
              <span className="text-xl">{f.icon}</span>
              <span className="text-sm font-medium text-white/80">{f.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom social proof */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex -space-x-2">
            {["RK","MS","AN","DS"].map((i) => (
              <div key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[10px] font-bold text-white ring-2 ring-slate-900">
                {i}
              </div>
            ))}
          </div>
          <p className="text-xs text-white/50">
            <span className="text-white font-bold">180,000+</span> connections made
          </p>
        </div>
      </div>
    </div>
  );
}
