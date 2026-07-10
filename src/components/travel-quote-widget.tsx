import { useEffect, useRef, useState } from "react";
import { Quote } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { TRAVEL_QUOTES } from "@/lib/travel-quotes";

const ADVANCE_MS = 10_000;
const FADE_MS = 400;

function shuffled(length: number): number[] {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Ambient quote strip — a quiet editorial breath between the full-bleed
// masthead and the content feed below it, on every breakpoint (its original
// desktop-only upper-right hero placement doesn't exist anymore now that the
// hero is a single centered composition, not a two-column layout). Cycles
// through the full TRAVEL_QUOTES list in shuffled order with no repeats
// until it wraps, then reshuffles (avoiding an immediate repeat across the
// seam).
export function TravelQuoteWidget() {
  const reducedMotion = usePrefersReducedMotion();
  const orderRef = useRef<number[]>(shuffled(TRAVEL_QUOTES.length));
  const posRef = useRef(0);
  const [quoteIndex, setQuoteIndex] = useState(orderRef.current[0]);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (reducedMotion) return; // static quote, no auto-advance
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        posRef.current += 1;
        if (posRef.current >= orderRef.current.length) {
          const last = orderRef.current[orderRef.current.length - 1];
          const next = shuffled(TRAVEL_QUOTES.length);
          if (TRAVEL_QUOTES.length > 1 && next[0] === last) {
            [next[0], next[1]] = [next[1], next[0]];
          }
          orderRef.current = next;
          posRef.current = 0;
        }
        setQuoteIndex(orderRef.current[posRef.current]);
        setVisible(true);
      }, FADE_MS);
    }, ADVANCE_MS);
    return () => clearInterval(interval);
  }, [reducedMotion]);

  const current = TRAVEL_QUOTES[quoteIndex];

  return (
    <figure
      className={`mx-auto flex max-w-xl flex-col items-center gap-2 px-6 py-8 text-center sm:py-10 ${
        reducedMotion ? "" : "transition-opacity ease-in-out"
      }`}
      style={
        reducedMotion ? undefined : { transitionDuration: `${FADE_MS}ms`, opacity: visible ? 1 : 0 }
      }
    >
      <Quote className="text-ink/25 h-4 w-4 flex-shrink-0" aria-hidden />
      <blockquote className="text-ink/55 text-sm font-light italic leading-relaxed sm:text-base">
        "{current.quote}"
      </blockquote>
      <figcaption className="text-ink/35 text-xs font-medium not-italic">
        — {current.author}
      </figcaption>
    </figure>
  );
}
