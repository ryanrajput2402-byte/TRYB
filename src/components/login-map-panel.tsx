import { WORLD_MAP_URL } from "@/lib/world-map";

// Full-bleed world-map background for the login screen (same treatment as
// the Home masthead — see lib/world-map.ts). Always rendered at full
// brightness; the dim → lit effect is an illusion painted on top by
// PullLampOverlay's radial mask, not a property of this layer itself.
export function LoginMapPanel() {
  return (
    <div className="fixed inset-0" aria-hidden>
      <div className="absolute inset-0" style={{ background: "var(--gradient-earth)" }} />
      <img
        src={WORLD_MAP_URL}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          filter: "blur(3.6px)",
          opacity: 0.9,
          transform: "scale(1.3) translateY(-4%)",
          mixBlendMode: "multiply",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
