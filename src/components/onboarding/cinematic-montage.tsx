import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { CINEMATIC_LINE_B_LEAD_SECONDS, CINEMATIC_OPENER_SRC } from "@/lib/onboarding-config";
import { trackEvent } from "@/lib/analytics";

const LINE_A = "You've seen the Reel.";
const LINE_B = "This is where it becomes a trip.";

function haptic(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Unsupported or blocked — silently degrade, never surface to the user.
  }
}

// Step 1 of the Cinematic Opener — full-bleed muted montage, two lines of
// copy revealed in sequence, hard-cut to Step 2 when the video ends (or
// immediately on Skip). Reduced-motion visitors skip this screen entirely,
// same pattern PullLampOverlay already uses for its own gesture.
export function CinematicMontage({
  onComplete,
  onSkip,
}: {
  onComplete: () => void;
  onSkip: () => void;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [line, setLine] = useState<"a" | "b" | null>(null);
  const firedLineBRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (reducedMotion) onCompleteRef.current();
  }, [reducedMotion]);

  // Deliberately un-guarded against React's dev-mode double-invoke: a ref-based
  // "already fired" latch here would get set by the first (cleaned-up) mount
  // and silently skip scheduling on the real one, dropping line A forever.
  useEffect(() => {
    if (reducedMotion) return;
    trackEvent({ name: "onboarding_montage_view" });
    const t = setTimeout(() => {
      setLine("a");
      haptic(15);
    }, 300);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  function handleTimeUpdate() {
    const v = videoRef.current;
    if (!v || !Number.isFinite(v.duration) || firedLineBRef.current) return;
    if (v.duration - v.currentTime <= CINEMATIC_LINE_B_LEAD_SECONDS) {
      firedLineBRef.current = true;
      setLine("b");
      haptic(15);
    }
  }

  function handleEnded() {
    haptic([10, 40, 10]);
    onComplete();
  }

  function handleSkip() {
    trackEvent({ name: "onboarding_montage_skip" });
    onSkip();
  }

  if (reducedMotion) return null;

  return (
    <div className="tryb-theme fixed inset-0 z-50 overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={CINEMATIC_OPENER_SRC}
        autoPlay
        muted
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* Bottom scrim — keeps line copy legible over any frame the video lands on. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/95 via-black/50 to-transparent" />

      {/* pr- clearance keeps line copy clear of the fixed bottom-right Skip
          button regardless of how many lines the copy wraps to. */}
      <div className="absolute inset-x-0 bottom-0 px-6 pb-14 pr-28 sm:px-10 sm:pb-20 sm:pr-36">
        <AnimatePresence mode="wait">
          {line && (
            <motion.p
              key={line}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="display max-w-lg text-2xl font-semibold leading-tight text-white drop-shadow-[0_2px_16px_rgba(0,0,0,0.5)] sm:text-4xl"
            >
              {line === "a" ? LINE_A : LINE_B}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom-right — deliberately also covers the source clip's corner watermark. */}
      <button
        type="button"
        onClick={handleSkip}
        className="absolute bottom-6 right-5 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/45 px-4 text-sm font-medium text-white/90 backdrop-blur-md transition active:scale-95 sm:bottom-8 sm:right-8"
      >
        Skip
      </button>
    </div>
  );
}
