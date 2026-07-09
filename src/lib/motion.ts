import type { Transition, Variants } from "motion/react";

/** Signature springs — calm, physical, never bouncy-for-the-sake-of-it. */
export const spring = {
  soft: { type: "spring", stiffness: 260, damping: 30, mass: 0.9 } as Transition,
  snappy: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 } as Transition,
  gentle: { type: "spring", stiffness: 170, damping: 26 } as Transition,
  press: { type: "spring", stiffness: 600, damping: 22, mass: 0.5 } as Transition,
};

export const ease = [0.16, 1, 0.3, 1] as const;

/** Staggered reveal container + child. */
export const revealContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const revealItem: Variants = {
  hidden: { opacity: 0, y: 16, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease } },
};

export const tapScale = { scale: 0.96 };
export const hoverLift = { y: -4 };
