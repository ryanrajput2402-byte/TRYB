import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { DurationMeter } from "@/components/onboarding/wizard/duration-meter";
import { bandForDays, RECENCY_REACTIONS } from "@/lib/onboarding-wizard";
import { findDestination } from "@/lib/destinations";

// Real curated photo, requested at a higher resolution than the app's usual
// card-sized crops — same real Unsplash source, just a bigger request for a
// full-bleed background instead of a fabricated/AI image.
const BG = findDestination("Ladakh")!.image.replace("w=1200", "w=2400");

export function RecencyStep({ onContinue }: { onContinue: (days: number) => void }) {
  const [days, setDays] = useState<number | null>(null);

  const band = days !== null ? bandForDays(days) : null;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24">
      <img src={BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/55 to-ink/80" />

      {/* Glass panel — keeps the meter's labels and reaction copy legible
          regardless of what's underneath (a bright sky vs. a dark cliff
          face read very differently without this). */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-black/25 p-6 text-center shadow-lift backdrop-blur-xl sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/60">
          Screen 1 of 4
        </p>
        <h1 className="display mt-3 text-3xl font-semibold leading-tight text-cream sm:text-4xl">
          When did you travel last?
        </h1>

        <DurationMeter initialDays={30} onSettle={setDays} />

        <div className="mt-6 min-h-[4.5rem]">
          <AnimatePresence mode="wait">
            {band && (
              <motion.p
                key={band}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto max-w-sm text-balance text-base font-medium text-cream/90"
              >
                {RECENCY_REACTIONS[band]}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {days !== null && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={() => onContinue(days)}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3.5 text-sm font-semibold text-ink shadow-lift transition hover:scale-[1.02]"
            >
              Continue <ArrowRight className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
