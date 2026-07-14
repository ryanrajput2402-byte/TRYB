import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { findDestination } from "@/lib/destinations";

const BEACH_BG = findDestination("Goa")!.image.replace("w=1200", "w=2400");
// Patagonia's curated image is mismatched (a city skyline, not a mountain —
// a pre-existing data issue in destinations.ts, confirmed by opening the
// actual file), so Banff is used here instead for a real mountain photo.
const MOUNTAIN_BG = findDestination("Banff")!.image.replace("w=1200", "w=2400");

// Real poll split only — never a fabricated percentage. Below this many
// total real responses (profiles.vibe IN beach/mountain), we show only the
// playful framing with no number attached, per the no-fabrication rule.
const POLL_FLOOR = 30;

type Choice = "beach" | "mountain";

export function BeachMountainStep({ onContinue }: { onContinue: (choice: Choice) => void }) {
  const [choice, setChoice] = useState<Choice | null>(null);
  const [counts, setCounts] = useState<{ beach: number; mountain: number } | null>(null);

  function pick(c: Choice) {
    setChoice(c);
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("vibe")
        .in("vibe", ["beach", "mountain"]);
      const beach = (data ?? []).filter((r) => r.vibe === "beach").length;
      const mountain = (data ?? []).filter((r) => r.vibe === "mountain").length;
      setCounts({ beach, mountain });
    })();
  }

  const total = counts ? counts.beach + counts.mountain : 0;
  const meetsFloor = total >= POLL_FLOOR;
  const beachPct = meetsFloor ? Math.round((counts!.beach / total) * 1000) / 10 : null;
  const mountainPct = meetsFloor ? Math.round((counts!.mountain / total) * 1000) / 10 : null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink px-6 py-24">
      <div className="relative z-10 mx-auto max-w-lg text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-cream/50">
          Screen 3 of 4
        </p>
        <h1 className="display mt-3 text-3xl font-semibold leading-tight text-cream sm:text-4xl">
          The million-dollar question: beaches or mountains?
        </h1>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <OptionCard
            label="Beaches"
            image={BEACH_BG}
            selected={choice === "beach"}
            disabled={!!choice}
            onClick={() => pick("beach")}
          />
          <OptionCard
            label="Mountains"
            image={MOUNTAIN_BG}
            selected={choice === "mountain"}
            disabled={!!choice}
            onClick={() => pick("mountain")}
          />
        </div>

        <div className="mt-8 min-h-[3rem]">
          {choice && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {meetsFloor ? (
                <p className="text-sm font-medium text-cream/80">
                  The real split so far: <span className="text-cream">{beachPct}% beaches</span>,{" "}
                  <span className="text-cream">{mountainPct}% mountains</span>.
                </p>
              ) : (
                <p className="text-sm font-medium text-cream/80">
                  Everyone has got a side, but hey.
                </p>
              )}
              <p className="mt-1 text-sm text-cream/60">We care about your side.</p>
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                onClick={() => onContinue(choice)}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-cream px-8 py-3.5 text-sm font-semibold text-ink shadow-lift transition hover:scale-[1.02]"
              >
                Continue
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

function OptionCard({
  label,
  image,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  image: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
      animate={{ scale: selected ? 1.02 : 1 }}
      className="group relative aspect-[3/4] overflow-hidden rounded-3xl shadow-lift disabled:cursor-default"
    >
      <img src={image} alt={label} className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/20 to-transparent" />
      {selected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 ring-4 ring-inset ring-primary"
        />
      )}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4">
        <p className="display text-xl font-semibold text-cream">{label}</p>
        {selected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className="grid size-7 place-items-center rounded-full bg-primary"
          >
            <Check className="size-4 text-primary-foreground" strokeWidth={3} />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
