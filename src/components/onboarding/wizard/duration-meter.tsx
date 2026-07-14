import { useRef, useState } from "react";
import { motion } from "motion/react";
import { daysForT, formatDuration, tForDays } from "@/lib/onboarding-wizard";

const THUMB_SIZE = 28; // px — knob diameter
const HIT_HEIGHT = 44; // px — full touch target height (thumb rides a thinner visible rail inside it)

// Shared drag mechanic for Screens 1 & 2 — one continuous horizontal
// control spanning days -> weeks -> months -> years (log-scaled, see
// daysForT). A thin rail with a larger knob riding on it (the standard
// premium-slider pattern) rather than a fat pill track, with the knob's
// horizontal travel explicitly inset by its own radius so it never
// overhangs the rail's rounded ends at either extreme.
export function DurationMeter({
  initialDays = 30,
  onSettle,
}: {
  initialDays?: number;
  onSettle: (days: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [days, setDays] = useState(initialDays);
  const [dragging, setDragging] = useState(false);
  const [settled, setSettled] = useState(false);
  // Read synchronously inside the pointer handlers instead of the `dragging`
  // state — a pointermove that lands before React re-renders from the
  // preceding pointerdown would otherwise still see the stale `false`
  // closure and bail out, dropping the very first move of a fast drag.
  const draggingRef = useRef(false);
  const daysRef = useRef(initialDays);

  function tFromClientX(clientX: number) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function onPointerDown(e: React.PointerEvent) {
    draggingRef.current = true;
    setDragging(true);
    setSettled(false);
    const next = daysForT(tFromClientX(e.clientX));
    daysRef.current = next;
    setDays(next);
    // Capture is a nice-to-have (keeps the drag tracking if the pointer
    // leaves the track's bounds) — the drag math above works fine without
    // it, so a platform that refuses capture shouldn't break the gesture.
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch {
      // Ignored — see above.
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    const next = daysForT(tFromClientX(e.clientX));
    daysRef.current = next;
    setDays(next);
  }

  function onPointerUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setSettled(true);
    onSettle(daysRef.current);
  }

  const t = tForDays(days);
  // Knob center travels between [radius, 100% - radius] instead of [0%,
  // 100%] — the fix for the knob overhanging the rail's ends.
  const knobLeft = `calc(${THUMB_SIZE / 2}px + ${t} * (100% - ${THUMB_SIZE}px))`;

  return (
    <div className="mt-10">
      <div className="flex justify-center">
        <motion.div
          animate={{ scale: dragging ? 1.06 : 1, y: dragging ? -2 : 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="rounded-full bg-primary px-5 py-2 text-sm font-semibold tabular-nums text-primary-foreground shadow-lift"
        >
          {formatDuration(days)} {days >= 730 ? "" : "ago"}
        </motion.div>
      </div>

      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mt-7 flex touch-none items-center"
        style={{ height: HIT_HEIGHT }}
      >
        {/* Thin rail, inset by the knob radius so its rounded caps line up
            with the knob's furthest possible travel at each end. */}
        <div
          className="pointer-events-none absolute inset-y-0 my-auto h-1.5 rounded-full bg-cream/20"
          style={{ left: THUMB_SIZE / 2, right: THUMB_SIZE / 2 }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 my-auto h-1.5 rounded-full bg-primary"
          style={{ left: THUMB_SIZE / 2, width: `calc(${t} * (100% - ${THUMB_SIZE}px))` }}
        />
        <motion.div
          animate={{ left: knobLeft, scale: dragging ? 1.12 : 1 }}
          transition={
            dragging
              ? { type: "tween", duration: 0 }
              : { type: "spring", stiffness: 520, damping: 32 }
          }
          className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-primary bg-background shadow-lift"
          style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
        />
      </div>
      {/* Always used on a dark glass panel over photography (see
          recency-step.tsx / intent-step.tsx) — cream, not a theme-relative
          muted token that could resolve too dark to read here. */}
      <div className="mt-1 flex justify-between px-1 text-[11px] font-medium text-cream/55">
        <span>Days</span>
        <span>Weeks</span>
        <span>Months</span>
        <span>Years</span>
      </div>

      {!settled && !dragging && (
        <p className="mt-4 text-center text-xs text-cream/55">
          Drag to set — let go when it feels right.
        </p>
      )}
    </div>
  );
}
