import { motion, useScroll, useTransform } from "motion/react";
import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useRef } from "react";
import { PressBtn } from "@/components/tryb/ui-kit";

export function HomeHero({ avatarUrl }: { avatarUrl?: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "28%"]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.12]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative h-[90dvh] min-h-[560px] w-full overflow-hidden bg-ink">
      <motion.div style={{ y, scale }} className="absolute inset-0">
        <img src="/img/hero-dusk.png" alt="Mountains at dusk" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/50 via-ink/20 to-ink/85" />
      </motion.div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-5 pt-[max(16px,env(safe-area-inset-top))]">
        <span className="display text-2xl font-semibold tracking-tight text-ink-foreground">
          TRY<span className="text-gold">B</span>
        </span>
        <div className="flex items-center gap-2">
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative grid size-10 place-items-center rounded-full bg-ink/30 text-ink-foreground backdrop-blur-md transition-colors hover:bg-ink/50"
          >
            <Bell className="size-[18px]" />
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary ring-2 ring-ink/40" />
          </Link>
          <Link
            to="/profile"
            aria-label="Your profile"
            className="grid size-10 place-items-center overflow-hidden rounded-full ring-1 ring-ink-foreground/30"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full w-full place-items-center bg-ink-foreground/10 text-sm font-medium text-ink-foreground">
                {"?"}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* Center copy */}
      <motion.div
        style={{ opacity: fade }}
        className="absolute inset-0 z-[5] flex flex-col items-center justify-center px-6 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          className="text-xs font-medium uppercase tracking-[0.3em] text-ink-foreground/70"
        >
          The travel community
        </motion.p>
        <h1 className="display mt-4 text-balance text-6xl font-semibold text-ink-foreground sm:text-7xl">
          {["Real people.", "Real trips."].map((line, i) => (
            <motion.span
              key={line}
              className="block"
              initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.12 }}
            >
              {line}
            </motion.span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.55 }}
          className="mt-5 max-w-xs text-pretty text-[15px] leading-relaxed text-ink-foreground/80"
        >
          Find the people you were meant to wander with — then go somewhere that matters.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.65 }}
          className="mt-8 flex items-center gap-3"
        >
          <PressBtn href="/create" variant="primary" size="lg">
            Create a trip
          </PressBtn>
          <PressBtn
            href="/discover"
            size="lg"
            className="border border-ink-foreground/25 bg-ink-foreground/10 text-ink-foreground backdrop-blur-md hover:bg-ink-foreground/20"
          >
            Join a trip
          </PressBtn>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div style={{ opacity: fade }} className="absolute inset-x-0 bottom-6 z-[5] flex justify-center">
        <motion.span
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
          className="text-[11px] uppercase tracking-[0.25em] text-ink-foreground/60"
        >
          Scroll
        </motion.span>
      </motion.div>
    </section>
  );
}
