import { useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { INTEREST_TAGS, findDestination } from "@/lib/destinations";

// Marrakech's curated image URL is dead (404 — confirmed by requesting it
// directly, a pre-existing data issue), so Kyoto is used here instead.
const BG = findDestination("Kyoto")!.image.replace("w=1200", "w=2400");

// Reuses INTEREST_TAGS — the same vocabulary trips.vibe_tags is built from
// (see create.tsx), so these picks map onto real trip filters instead of a
// parallel taxonomy invented just for onboarding.
export function TagsStep({ onContinue }: { onContinue: (tags: string[]) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24">
      <img src={BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/60 to-ink/85" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-black/25 p-6 text-center shadow-lift backdrop-blur-xl sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/60">
          Screen 4 of 4
        </p>
        <h1 className="display mt-3 text-3xl font-semibold leading-tight text-cream sm:text-4xl">
          What pulls you in?
        </h1>
        <p className="mt-2 text-sm text-cream/70">Pick as many as feel right.</p>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {INTEREST_TAGS.map((tag) => {
            const active = selected.has(tag.id);
            return (
              <motion.button
                key={tag.id}
                type="button"
                onClick={() => toggle(tag.id)}
                whileTap={{ scale: 0.94 }}
                animate={{ scale: active ? 1.03 : 1 }}
                className={`flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-cream/25 bg-cream/10 text-cream backdrop-blur-md"
                }`}
              >
                {active && <Check className="size-3.5" strokeWidth={3} />}
                {tag.label}
              </motion.button>
            );
          })}
        </div>

        <motion.button
          animate={{ opacity: selected.size > 0 ? 1 : 0.5 }}
          disabled={selected.size === 0}
          onClick={() => onContinue(Array.from(selected))}
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3.5 text-sm font-semibold text-ink shadow-lift transition hover:scale-[1.02] disabled:pointer-events-none"
        >
          Continue <ArrowRight className="size-4" />
        </motion.button>
      </div>
    </div>
  );
}
