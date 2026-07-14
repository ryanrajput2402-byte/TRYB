import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { findDestination } from "@/lib/destinations";

const BG = findDestination("Queenstown")!.image.replace("w=1200", "w=2400");

// Screen 6 — the wizard's actual closing beat. Destination-pick (Screen 5)
// hands off real trip data and shouldn't also have to carry the "you're
// done" feeling; this gives that its own moment before the real app opens.
export function IdentityStep({ identity, onDone }: { identity: string; onDone: () => void }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      <img src={BG} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-ink/75 via-ink/60 to-ink/85" />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-black/30 p-8 shadow-lift backdrop-blur-xl"
      >
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/60">You're a</p>
        <h1 className="display mt-2 text-4xl font-semibold leading-tight text-cream sm:text-5xl">
          {identity}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-cream/70">
          Early enough to help shape this, not just use it.
        </p>
        <button
          onClick={onDone}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3.5 text-sm font-semibold text-ink shadow-lift transition hover:scale-[1.02]"
        >
          Into TRYB <ArrowRight className="size-4" />
        </button>
      </motion.div>
    </div>
  );
}
