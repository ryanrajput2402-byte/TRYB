import { motion } from "motion/react";

const TOTAL = 4;

export function WizardProgress({ step }: { step: number }) {
  return (
    <div className="fixed inset-x-0 top-0 z-20 px-6 pt-[max(16px,env(safe-area-inset-top))] sm:px-10">
      <div className="mx-auto flex max-w-lg gap-1.5">
        {Array.from({ length: TOTAL }, (_, i) => (
          <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
            <motion.div
              className="h-full rounded-full bg-white"
              initial={false}
              animate={{ width: i < step ? "100%" : i === step ? "40%" : "0%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
