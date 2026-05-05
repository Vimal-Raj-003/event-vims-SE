/**
 * Animated network-graph SVG used as a soft backdrop on landing sections.
 * Subtle (opacity ~0.55) so it never overpowers foreground content but adds
 * a sense of "connections forming" — reinforcing the product story.
 *
 * Pure presentational, no client interactivity required, but uses SVG SMIL
 * animations which run without JS.
 *
 * @param idPrefix  Unique prefix to scope <defs> ids when multiple instances mount.
 * @param accentTone Optional radial blur orb colour family (emerald default).
 */
export function NetworkGraphBackdrop({
  idPrefix,
  accentTone = "emerald",
}: {
  idPrefix: string;
  accentTone?: "emerald" | "indigo";
}) {
  const linkId = `${idPrefix}-link`;
  const nodeId = `${idPrefix}-node`;
  const orbColor = accentTone === "emerald" ? "bg-emerald-200/25" : "bg-indigo-200/25";

  return (
    <>
      {/* Soft accent orb */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -bottom-32 -right-20 h-[420px] w-[420px] rounded-full ${orbColor} blur-[120px]`}
      />

      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.55]"
        viewBox="0 0 1200 600"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <defs>
          <linearGradient id={linkId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={nodeId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Connection lines */}
        <g stroke={`url(#${linkId})`} strokeWidth="1">
          <line x1="120" y1="120" x2="380" y2="220" />
          <line x1="380" y1="220" x2="640" y2="100" />
          <line x1="640" y1="100" x2="900" y2="260" />
          <line x1="900" y1="260" x2="1080" y2="140" />
          <line x1="220" y1="420" x2="480" y2="500" />
          <line x1="480" y1="500" x2="760" y2="380" />
          <line x1="760" y1="380" x2="1020" y2="460" />
          <line x1="380" y1="220" x2="480" y2="500" />
          <line x1="640" y1="100" x2="760" y2="380" />
          <line x1="900" y1="260" x2="1020" y2="460" />
        </g>

        {/* Pulsing nodes */}
        {[
          { x: 120, y: 120, r: 6, c: "#10b981" },
          { x: 380, y: 220, r: 8, c: "#10b981" },
          { x: 640, y: 100, r: 6, c: "#0f172a" },
          { x: 900, y: 260, r: 8, c: "#6366f1" },
          { x: 1080, y: 140, r: 6, c: "#6366f1" },
          { x: 220, y: 420, r: 6, c: "#10b981" },
          { x: 480, y: 500, r: 7, c: "#0f172a" },
          { x: 760, y: 380, r: 8, c: "#6366f1" },
          { x: 1020, y: 460, r: 6, c: "#6366f1" },
        ].map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r * 4} fill={`url(#${nodeId})`} />
            <circle cx={n.x} cy={n.y} r={n.r} fill={n.c}>
              <animate
                attributeName="opacity"
                values="0.5;1;0.5"
                dur={`${2 + (i % 3) * 0.4}s`}
                repeatCount="indefinite"
                begin={`${i * 0.18}s`}
              />
            </circle>
          </g>
        ))}

        {/* Pulse ring on hub node */}
        <circle cx="640" cy="100" r="10" fill="none" stroke="#0f172a" strokeWidth="1.5" opacity="0.5">
          <animate attributeName="r" values="10;28" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.5;0" dur="2.4s" repeatCount="indefinite" />
        </circle>
      </svg>
    </>
  );
}
