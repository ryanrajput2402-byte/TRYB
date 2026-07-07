import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { HOME_SLOGANS } from "@/lib/home-slogans";

const ROTATE_MS = 7_000;
const FADE_MS = 500;

// Finalized background: a real public-domain vector world map (Wikimedia
// Commons, BlankMap-World.svg — solid continent fills, no fine engraving
// detail, so it holds its silhouette under blur instead of turning to mush)
// multiply-blended against the full-strength pine/clay gradient. White
// "ocean" passes the gradient color through unchanged; gray "land" multiplies
// to a richer, darker shade of that same gradient — continents read as real
// shapes in one coherent warm hue. Composition tightened (reduced vertical
// padding) so the box doesn't read as empty space around a text box.
const WORLD_MAP_URL = "https://upload.wikimedia.org/wikipedia/commons/4/4d/BlankMap-World.svg";

export function HomeMasthead() {
  const reducedMotion = usePrefersReducedMotion();
  const orderRef = useRef(HOME_SLOGANS);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) return;
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % orderRef.current.length);
        setVisible(true);
      }, FADE_MS);
    }, ROTATE_MS);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  return (
    <section className="relative overflow-hidden rounded-3xl px-6 py-10 text-center shadow-2xl sm:py-14">
      <div className="absolute inset-0" style={{ background: "var(--gradient-earth)" }} aria-hidden />
      <img
        src={WORLD_MAP_URL}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{
          filter: "blur(3.6px)",
          opacity: 0.9,
          transform: "scale(1.3) translateY(-4%)",
          mixBlendMode: "multiply",
        }}
      />
      {/* Local grain texture (same SVG turbulence recipe as the page-wide
          .fomo-grain, but position: absolute + contained here rather than
          reusing that fixed/page-wide class). */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
        aria-hidden
      />

      <p
        className={`fomo-heading relative mx-auto max-w-xl text-4xl font-bold leading-[1.05] text-cream drop-shadow-lg sm:text-5xl lg:text-6xl ${
          reducedMotion ? "" : "transition-opacity ease-in-out"
        }`}
        style={reducedMotion ? undefined : { transitionDuration: `${FADE_MS}ms`, opacity: visible ? 1 : 0 }}
      >
        {orderRef.current[index]}
      </p>
    </section>
  );
}
