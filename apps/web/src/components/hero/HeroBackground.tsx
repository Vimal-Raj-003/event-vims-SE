export function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/hero/conference-floor-blur.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "50% 40%",
          filter: "blur(20px)",
          transform: "scale(1.1)",
        }}
      />

      <picture>
        <source type="image/avif" srcSet="/hero/conference-floor-2400.avif" />
        <source type="image/webp" srcSet="/hero/conference-floor-1600.webp" />
        <img
          src="/hero/conference-floor-1200.jpg"
          alt=""
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover animate-ken-burns"
          style={{ objectPosition: "50% 40%" }}
        />
      </picture>

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(135deg, rgba(15,23,42,0.85) 0%, rgba(30,27,75,0.7) 50%, rgba(15,23,42,0.6) 100%)",
        }}
      />

      <div className="absolute top-[10%] left-[5%] h-[300px] w-[300px] rounded-full bg-indigo-600/[0.04] blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] h-[250px] w-[250px] rounded-full bg-violet-600/[0.03] blur-[70px] pointer-events-none" />

      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
        }}
      />

      <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-b from-transparent to-background pointer-events-none" />
    </div>
  );
}
