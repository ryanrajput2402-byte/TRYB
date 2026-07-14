import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// Full-page light-source interaction. The entire page (rendered underneath
// at full brightness at all times) starts obscured by a near-black overlay.
// Pulling the cord down punches an expanding circular "hole" in that
// overlay, centered on the lamp's actual screen position — light spreading
// from a real point source, not a flat screen-wide fade. Letting go before
// the pull threshold springs the cord back up and the hole collapses to
// nothing.
//
// The content underneath is always interactive (pointer-events: none on the
// dark overlay itself, re-enabled only on the cord handle) — gating CTAs
// behind a drag gesture would be a real accessibility regression, so
// dimness here is purely visual, never a functional block.
const PULL_RANGE = 160; // px of vertical travel to go from fully dim to fully lit
const COMPLETE_THRESHOLD = 0.6; // pull past 60% and it snaps open the rest of the way
const SNAP_MS = 480;
const CORD_BASE = 46;
const BOUNCE_MS = 420; // decaying overshoot pulse layered on a below-threshold release
const BOUNCE_AMPLITUDE = 16; // px
const DEMO_PEAK = 0.32; // stays well under COMPLETE_THRESHOLD — a teaching tug, not a real pull
const DEMO_CYCLE_MS = 1700;
const DEMO_CYCLES = 3;
const DEMO_START_DELAY_MS = 650;
const SEEN_KEY = "tryb:lamp-seen";
const DEMO_SEEN_KEY = "tryb:lamp-demo-seen";

function markSeen() {
  window.localStorage.setItem(SEEN_KEY, "1");
}

// forceShow / onLit — added for the Cinematic Opener, which composes this
// same component onto the auth card ("switch the light on" revealing the
// login form underneath) instead of only the standalone landing page.
// forceShow bypasses the "already seen once" localStorage gate, since the
// auth screen is reached exactly once per first-run flow, not repeatedly
// like a landing page. onLit lets the parent hook into the reveal
// completing (e.g. analytics) without owning any of the drag/mask logic.
//
// Reduced motion still short-circuits above everything else, unchanged: the
// lamp never renders and the page is lit immediately, no gesture required.
// (Not a place to also show a static "pull to enter" hint — there is
// nothing to pull under reduced motion, so there's no affordance to cue.)
export function PullLampOverlay({
  forceShow = false,
  onLit,
  promptText,
}: {
  forceShow?: boolean;
  onLit?: () => void;
  promptText?: string;
} = {}) {
  const reducedMotion = usePrefersReducedMotion();
  // Starts `false` to match the server-rendered default (same hydration-safe
  // pattern as usePrefersReducedMotion itself — no window/localStorage on
  // the server), corrected in an effect right after mount. A returning
  // visitor briefly sees one dim frame before this flips, same trade-off
  // already accepted for the reduced-motion correction elsewhere.
  const [alreadySeen, setAlreadySeen] = useState(false);

  useEffect(() => {
    if (!forceShow) setAlreadySeen(window.localStorage.getItem(SEEN_KEY) === "1");
  }, [forceShow]);

  useEffect(() => {
    if (reducedMotion) {
      markSeen();
      onLit?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  if (reducedMotion || (!forceShow && alreadySeen)) return null;

  return (
    <DraggableLampOverlay
      promptText={promptText}
      onLit={() => {
        markSeen();
        onLit?.();
      }}
    />
  );
}

function DraggableLampOverlay({ onLit, promptText }: { onLit: () => void; promptText?: string }) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const bulbGlowRef = useRef<HTMLDivElement | null>(null);
  const bulbAnchorRef = useRef<HTMLDivElement | null>(null);
  const promptRef = useRef<HTMLParagraphElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);
  const handleBtnRef = useRef<HTMLButtonElement | null>(null);
  const shadeWrapRef = useRef<HTMLDivElement | null>(null);
  const cordSvgRef = useRef<SVGSVGElement | null>(null);

  const originRef = useRef({ x: 0, y: 0 });
  const maxRadiusRef = useRef(0);
  const progressRef = useRef(0);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const bendPhaseRef = useRef(0);
  const lastFrameRef = useRef(0);
  const snapRef = useRef<{ active: boolean; from: number; to: number; start: number }>({
    active: false,
    from: 0,
    to: 0,
    start: 0,
  });
  const bounceRef = useRef<{ active: boolean; start: number }>({ active: false, start: 0 });
  const demoRef = useRef<{ active: boolean; cycle: number; cycleStart: number }>({
    active: false,
    cycle: 0,
    cycleStart: 0,
  });
  const demoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Once lit, the shade/cord/handle have done their narrative job — left at
  // full size they'd sit permanently on top of card content (the original
  // small glyph never had this problem; this one is deliberately large).
  // Held briefly so the "light switching on" moment still registers, then
  // fades and stops accepting pointer events entirely.
  const litFadeRef = useRef<{ active: boolean; start: number }>({ active: false, start: 0 });
  const [dragging, setDragging] = useState(false);

  function easeOutCubic(t: number) {
    return 1 - (1 - t) ** 3;
  }

  function applyProgress(progress: number) {
    const { x, y } = originRef.current;
    const clamped = Math.max(0, Math.min(1, progress));
    const radius = clamped * maxRadiusRef.current;
    const feather = Math.max(40, radius * 0.3);
    if (overlayRef.current) {
      overlayRef.current.style.background =
        `radial-gradient(circle at ${x}px ${y}px, ` +
        `rgba(8,6,4,0) 0px, rgba(8,6,4,0) ${radius}px, ` +
        `rgba(8,6,4,0.9) ${radius + feather}px, rgba(8,6,4,0.9) 100%)`;
    }
    if (bulbGlowRef.current) {
      bulbGlowRef.current.style.opacity = String(clamped);
      bulbGlowRef.current.style.boxShadow = `0 0 ${18 + clamped * 46}px ${8 + clamped * 12}px oklch(0.9 0.05 80 / ${0.3 + clamped * 0.5})`;
    }
    // Fades out faster than the reveal itself (gone by ~60% pulled) so it
    // never lingers overlapping the now-legible content underneath.
    const cueOpacity = Math.max(0, 1 - clamped * 1.7);
    if (promptRef.current) promptRef.current.style.opacity = String(cueOpacity);
    if (hintRef.current) hintRef.current.style.opacity = String(cueOpacity);
  }

  useEffect(() => {
    function measure() {
      const rect = bulbAnchorRef.current?.getBoundingClientRect();
      if (rect)
        originRef.current = { x: rect.left + rect.width / 2, y: rect.bottom - rect.height * 0.12 };
      maxRadiusRef.current = Math.hypot(window.innerWidth, window.innerHeight);
    }
    measure();
    window.addEventListener("resize", measure);
    applyProgress(0);

    lastFrameRef.current = performance.now();
    let raf = requestAnimationFrame(loop);

    function loop(now: number) {
      const dt = now - lastFrameRef.current;
      lastFrameRef.current = now;

      // Snap tween (release, in either direction) — owns progressRef during
      // its run so pointer-move can't fight it once the finger has lifted.
      if (snapRef.current.active) {
        const t = Math.min(1, (now - snapRef.current.start) / SNAP_MS);
        const eased = easeOutCubic(t);
        progressRef.current =
          snapRef.current.from + (snapRef.current.to - snapRef.current.from) * eased;
        applyProgress(progressRef.current);
        if (t >= 1) snapRef.current.active = false;
      }

      // Teaching demo — pulses progress up to a low peak and back, purely
      // cosmetic, never touches the real completion threshold.
      if (demoRef.current.active) {
        const t = (now - demoRef.current.cycleStart) / DEMO_CYCLE_MS;
        if (t >= 1) {
          demoRef.current.cycle += 1;
          demoRef.current.cycleStart = now;
          if (demoRef.current.cycle >= DEMO_CYCLES) {
            demoRef.current.active = false;
            applyProgress(0);
          }
        } else {
          applyProgress(Math.sin(t * Math.PI) * DEMO_PEAK);
        }
      }

      // Idle sway — a slight rubbery bow in the cord, more slack when
      // fully closed, straightening out as it's pulled taut.
      bendPhaseRef.current += dt * 0.0021;
      const bendRoom = 1 - Math.max(0, Math.min(1, progressRef.current));
      const bendAmp = 13 * bendRoom * (draggingRef.current ? 0.35 : 1);
      const bend = Math.sin(bendPhaseRef.current) * bendAmp;

      // Decaying bounce layered on top of a below-threshold release, purely
      // a cosmetic recoil on the cord's resting position.
      let bouncePx = 0;
      if (bounceRef.current.active) {
        const t = (now - bounceRef.current.start) / BOUNCE_MS;
        if (t >= 1) bounceRef.current.active = false;
        else bouncePx = Math.sin(t * Math.PI) * BOUNCE_AMPLITUDE * (1 - t);
      }

      const { x: ax, y: ay } = originRef.current;
      const handleX = ax;
      const handleY = ay + CORD_BASE + Math.max(0, progressRef.current) * PULL_RANGE - bouncePx;
      const midX = (ax + handleX) / 2 + bend;
      const midY = (ay + handleY) / 2;

      if (pathRef.current)
        pathRef.current.setAttribute("d", `M ${ax} ${ay} Q ${midX} ${midY} ${handleX} ${handleY}`);
      if (handleBtnRef.current)
        handleBtnRef.current.style.transform = `translate(${handleX}px, ${handleY}px) translate(-50%, -50%)`;

      if (litFadeRef.current.active) {
        const HOLD_MS = 350;
        const FADE_MS = 400;
        const elapsed = now - litFadeRef.current.start - HOLD_MS;
        const opacity = elapsed <= 0 ? 1 : Math.max(0, 1 - elapsed / FADE_MS);
        [shadeWrapRef.current, cordSvgRef.current, handleBtnRef.current].forEach((el) => {
          if (el) el.style.opacity = String(opacity);
        });
        if (opacity <= 0) {
          litFadeRef.current.active = false;
          if (handleBtnRef.current) handleBtnRef.current.style.pointerEvents = "none";
        }
      }

      raf = requestAnimationFrame(loop);
    }

    // Teach the gesture once per browser, ever — not once per onboarding
    // session, so a user who fails a login and reloads /auth isn't shown
    // the same demo tug repeatedly.
    if (window.localStorage.getItem(DEMO_SEEN_KEY) !== "1") {
      window.localStorage.setItem(DEMO_SEEN_KEY, "1");
      demoTimeoutRef.current = setTimeout(() => {
        demoRef.current = { active: true, cycle: 0, cycleStart: performance.now() };
      }, DEMO_START_DELAY_MS);
    }

    return () => {
      window.removeEventListener("resize", measure);
      cancelAnimationFrame(raf);
      if (demoTimeoutRef.current) clearTimeout(demoTimeoutRef.current);
    };
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    setDragging(true);
    snapRef.current.active = false;
    bounceRef.current.active = false;
    // The demo must stop the instant a real grab happens, whether it's
    // mid-cycle or still waiting on its initial delay.
    demoRef.current.active = false;
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    startYRef.current = e.clientY - progressRef.current * PULL_RANGE;
    // Capture is a nice-to-have; the drag math above doesn't depend on it,
    // so a platform that refuses capture shouldn't break the gesture.
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignored — see above.
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const delta = e.clientY - startYRef.current;
    const progress = Math.min(1, Math.max(0, delta / PULL_RANGE));
    progressRef.current = progress;
    applyProgress(progress);
  }

  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    const completed = progressRef.current >= COMPLETE_THRESHOLD;
    snapRef.current = {
      active: true,
      from: progressRef.current,
      to: completed ? 1 : 0,
      start: performance.now(),
    };
    if (!completed) bounceRef.current = { active: true, start: performance.now() };
    if (completed) {
      litFadeRef.current = { active: true, start: performance.now() };
      onLit();
    }
  }

  return (
    <>
      <div ref={overlayRef} className="pointer-events-none fixed inset-0 z-40" aria-hidden />

      {/* Ceiling mount + shade — large and unmistakably lamp-shaped, not a
          decorative glyph. Upper-center on mobile; shifted left-of-center on
          wider viewports so it never sits over the (centered) content below
          it once lit — e.g. the auth card's Google button on Step 2. */}
      <div
        ref={shadeWrapRef}
        className="fixed left-1/2 top-0 z-50 flex -translate-x-1/2 flex-col items-center pt-[max(8px,env(safe-area-inset-top))] sm:left-[15%] sm:translate-x-0"
        aria-hidden={false}
      >
        <div className="h-3 w-2.5 rounded-b-md bg-ink/70" />
        <div
          ref={bulbAnchorRef}
          className="relative h-14 w-24 sm:h-16 sm:w-28"
          style={{ clipPath: "polygon(38% 0%, 62% 0%, 100% 100%, 0% 100%)" }}
        >
          <div className="absolute inset-0 bg-ink/75" style={{ clipPath: "inherit" }} />
          <div
            ref={bulbGlowRef}
            className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 translate-y-1/3 rounded-full bg-cream"
            style={{ opacity: 0 }}
          />
        </div>
      </div>

      {/* Cord — a curved SVG path (not a rigid line) between the lamp and
          the handle, redrawn every frame: rubbery slack at rest, straighter
          under tension, with a decaying bounce layered on a soft release. */}
      <svg
        ref={cordSvgRef}
        className="pointer-events-none fixed inset-0 z-40 h-full w-full"
        aria-hidden
      >
        <path
          ref={pathRef}
          fill="none"
          stroke="var(--cream)"
          strokeOpacity={0.55}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
      </svg>

      <button
        ref={handleBtnRef}
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Pull down to enter"
        className={`fixed left-0 top-0 z-50 grid h-14 w-14 flex-shrink-0 touch-none place-items-center rounded-full bg-cream shadow-lift ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <span className="h-4 w-4 rounded-full bg-primary" />
      </button>

      {/* Persistent low-key directional cue, in case the demo is missed
          (e.g. a very fast interaction before it starts). Fades with the
          same curve as the prompt text, gone well before the card is fully
          legible. */}
      <div
        ref={hintRef}
        className="pointer-events-none fixed left-1/2 top-[150px] z-40 -translate-x-1/2 sm:left-[15%] sm:top-[184px] sm:translate-x-0"
      >
        <svg width="14" height="18" viewBox="0 0 14 18" fill="none" className="mx-auto opacity-70">
          <path
            d="M7 1v13M2 10l5 5 5-5"
            stroke="var(--cream)"
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <p
        ref={promptRef}
        className="fomo-heading pointer-events-none fixed left-1/2 top-[178px] z-40 max-w-[10rem] -translate-x-1/2 text-center text-sm font-semibold text-cream/90 drop-shadow sm:left-[15%] sm:top-[212px] sm:translate-x-0"
      >
        {promptText ?? "Go ahead, wake the world up."}
      </p>
    </>
  );
}
