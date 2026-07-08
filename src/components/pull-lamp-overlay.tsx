import { useEffect, useRef, useState } from "react";
import { Lamp } from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// Full-page light-source interaction — currently the landing page's
// first-visit reveal. The entire page (floating photo cards + hero content,
// rendered underneath at full brightness at all times) starts obscured by a
// near-black overlay. Pulling the cord down punches an expanding circular
// "hole" in that overlay, centered on the bulb's actual screen position —
// light spreading from a real point source, not a flat screen-wide fade.
// Letting go before the pull threshold springs the cord back up and the hole
// collapses to nothing.
//
// The content underneath is always interactive (pointer-events: none on the
// dark overlay itself, re-enabled only on the cord/tab) — gating the "Join
// TRYB" / "I have an account" CTAs behind a drag gesture would be a real
// accessibility regression, so dimness here is purely visual, never a
// functional block.
const PULL_RANGE = 140; // px of vertical drag to go from fully dim to fully lit
const COMPLETE_THRESHOLD = 0.6; // pull past 60% and it snaps open the rest of the way
const SNAP_MS = 550;
const CORD_BASE = 34;
const SEEN_KEY = "tryb:lamp-seen";

function markSeen() {
  window.localStorage.setItem(SEEN_KEY, "1");
}

export function PullLampOverlay() {
  const reducedMotion = usePrefersReducedMotion();
  // Starts `false` to match the server-rendered default (same hydration-safe
  // pattern as usePrefersReducedMotion itself — no window/localStorage on
  // the server), corrected in an effect right after mount. A returning
  // visitor briefly sees one dim frame before this flips, same trade-off
  // already accepted for the reduced-motion correction elsewhere.
  const [alreadySeen, setAlreadySeen] = useState(false);

  useEffect(() => {
    setAlreadySeen(window.localStorage.getItem(SEEN_KEY) === "1");
  }, []);

  // Reduced motion: fully lit immediately, no gesture required at all — not
  // the old tap-to-reveal fallback (that only ever served the auth screen,
  // which no longer uses this component).
  useEffect(() => {
    if (reducedMotion) markSeen();
  }, [reducedMotion]);

  if (reducedMotion || alreadySeen) return null;

  return <DraggableLampOverlay onLit={markSeen} />;
}

function DraggableLampOverlay({ onLit }: { onLit: () => void }) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const cordRef = useRef<HTMLDivElement | null>(null);
  const bulbGlowRef = useRef<HTMLDivElement | null>(null);
  const bulbIconRef = useRef<SVGSVGElement | null>(null);
  const bulbAnchorRef = useRef<HTMLDivElement | null>(null);
  const promptRef = useRef<HTMLParagraphElement | null>(null);
  const originRef = useRef({ x: 0, y: 0 });
  const maxRadiusRef = useRef(0);
  const progressRef = useRef(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    function measure() {
      const rect = bulbAnchorRef.current?.getBoundingClientRect();
      if (rect) originRef.current = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      maxRadiusRef.current = Math.hypot(window.innerWidth, window.innerHeight);
    }
    measure();
    window.addEventListener("resize", measure);
    applyProgress(0);
    return () => window.removeEventListener("resize", measure);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyProgress(progress: number) {
    progressRef.current = progress;
    const { x, y } = originRef.current;
    const radius = progress * maxRadiusRef.current;
    const feather = Math.max(40, radius * 0.3);
    if (overlayRef.current) {
      overlayRef.current.style.background =
        `radial-gradient(circle at ${x}px ${y}px, ` +
        `rgba(8,6,4,0) 0px, rgba(8,6,4,0) ${radius}px, ` +
        `rgba(8,6,4,0.9) ${radius + feather}px, rgba(8,6,4,0.9) 100%)`;
    }
    if (cordRef.current) cordRef.current.style.height = `${CORD_BASE + progress * PULL_RANGE}px`;
    if (bulbGlowRef.current) {
      bulbGlowRef.current.style.opacity = String(progress);
      bulbGlowRef.current.style.boxShadow = `0 0 ${18 + progress * 40}px ${6 + progress * 10}px oklch(0.9 0.05 80 / ${0.25 + progress * 0.5})`;
    }
    if (bulbIconRef.current) bulbIconRef.current.style.color = `color-mix(in oklch, var(--cream) ${Math.round(progress * 100)}%, oklch(1 0 0 / 0.5))`;
    // Fades out faster than the reveal itself (gone by ~60% pulled) so it
    // never lingers overlapping the now-legible form underneath it.
    if (promptRef.current) promptRef.current.style.opacity = String(Math.max(0, 1 - progress * 1.7));
  }

  function setSnapTransition(on: boolean) {
    const dur = on ? `${SNAP_MS}ms` : "0ms";
    const ease = "cubic-bezier(0.34, 1.56, 0.64, 1)";
    if (overlayRef.current) overlayRef.current.style.transition = on ? `background ${dur} ${ease}` : "none";
    if (cordRef.current) cordRef.current.style.transition = on ? `height ${dur} ${ease}` : "none";
    if (bulbGlowRef.current) bulbGlowRef.current.style.transition = on ? `opacity ${dur} ease-out, box-shadow ${dur} ease-out` : "none";
    if (promptRef.current) promptRef.current.style.transition = on ? `opacity ${dur} ease-out` : "none";
  }

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    startYRef.current = e.clientY - progressRef.current * PULL_RANGE;
    setSnapTransition(false);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const delta = e.clientY - startYRef.current;
    const progress = Math.min(1, Math.max(0, delta / PULL_RANGE));
    applyProgress(progress);
  }

  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setSnapTransition(true);
    const completed = progressRef.current >= COMPLETE_THRESHOLD;
    applyProgress(completed ? 1 : 0);
    if (completed) onLit();
  }

  return (
    <>
      <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-40" aria-hidden />

      <div
        className="fixed left-1/2 top-0 z-50 flex -translate-x-1/2 flex-col items-center"
        aria-hidden={false}
      >
        <div className="h-2.5 w-14 rounded-b-2xl bg-ink/70" />
        <div ref={bulbAnchorRef} className="relative mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-ink/70">
          <div ref={bulbGlowRef} className="absolute inset-0 rounded-full" style={{ opacity: 0 }} />
          <Lamp ref={bulbIconRef} className="relative h-4 w-4" style={{ color: "oklch(1 0 0 / 0.5)" }} />
        </div>
        <div ref={cordRef} className="w-px bg-cream/50" style={{ height: CORD_BASE }} />
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          aria-label="Pull to turn on the light"
          className={`grid h-7 w-7 flex-shrink-0 touch-none place-items-center rounded-full bg-cream/90 shadow-lg ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-clay" />
        </button>
        <p
          ref={promptRef}
          className="fomo-heading pointer-events-none mt-3 max-w-[10rem] text-center text-sm font-semibold text-cream/90 drop-shadow"
        >
          Go ahead, wake the world up.
        </p>
      </div>
    </>
  );
}
