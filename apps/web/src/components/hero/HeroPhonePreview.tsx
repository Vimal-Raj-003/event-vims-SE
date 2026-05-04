export function HeroPhonePreview() {
  return (
    <div
      className="relative w-[200px] sm:w-[220px] lg:w-[260px] mx-auto lg:mx-0 lg:rotate-2"
      aria-hidden="true"
    >
      <div className="relative rounded-[32px] border-[10px] border-slate-800 bg-slate-900 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.04)]">
        <div
          className="rounded-[20px] p-4 sm:p-5"
          style={{
            background: "linear-gradient(180deg, #1e1b4b 0%, #312e81 100%)",
            minHeight: 360,
          }}
        >
          <div className="w-12 h-1.5 rounded-full bg-black/40 mx-auto mb-4" />

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 mb-3">
            <div className="flex items-start gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}>
                VP
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white leading-tight">
                  Vikram Patel
                </p>
                <p className="text-[10px] text-white/60 leading-tight">
                  wants to connect · 2m ago
                </p>
              </div>
            </div>
            <p className="text-[11px] text-white/70 italic mb-2 leading-snug">
              &ldquo;Loved your talk on cloud architecture&rdquo;
            </p>
            <span className="inline-block text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
              +1 mutual · TechSummit Bengaluru
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl p-3 animate-notif-slide-in">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">✨</span>
              <p className="text-xs font-semibold text-white leading-tight">
                Smart match · 92% relevance
              </p>
            </div>
            <p className="text-[11px] text-white/70 leading-snug mb-1.5">
              Meet 4 people aligned to your services
            </p>
            <p className="text-[10px] text-indigo-300 font-medium">
              View matches →
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
