import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// Animates 0 -> value. If triggerOnView, waits until scrolled into view first;
// otherwise starts immediately on mount. Always respects reduced-motion by
// skipping straight to the final value.
export function CountUp({
  value,
  durationMs = 1200,
  triggerOnView = false,
}: {
  value: number;
  durationMs?: number;
  triggerOnView?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);
  const spanRef = useRef<HTMLSpanElement | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      return;
    }
    startedRef.current = false;

    function animate() {
      const start = performance.now();
      function tick(now: number) {
        const progress = Math.min((now - start) / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplay(Math.round(eased * value));
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!triggerOnView) {
      animate();
      return;
    }
    const el = spanRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !startedRef.current) {
          startedRef.current = true;
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value, reduced, triggerOnView, durationMs]);

  return <span ref={spanRef}>{display}</span>;
}
