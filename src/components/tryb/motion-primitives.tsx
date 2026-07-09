import { motion, useInView } from "motion/react";
import { useRef } from "react";
import { revealContainer, revealItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Reveals children with a staggered blur-up once scrolled into view. */
export function Reveal({
  children,
  className,
  once = true,
  amount = 0.25,
}: {
  children: React.ReactNode;
  className?: string;
  once?: boolean;
  amount?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once, amount });
  return (
    <motion.div
      ref={ref}
      className={className}
      variants={revealContainer}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const Comp = motion[as];
  return (
    <Comp variants={revealItem} className={className}>
      {children}
    </Comp>
  );
}

/** Single element that blurs up when in view (no parent needed). */
export function FadeIn({
  children,
  className,
  delay = 0,
  y = 16,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/** Progressive image: subtle scale + blur reveal on load. */
export function Img({
  src,
  alt,
  className,
  imgClassName,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <motion.img
        src={src || "/placeholder.svg"}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        initial={{ opacity: 0, scale: 1.06, filter: "blur(12px)" }}
        whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: true, amount: 0.1 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className={cn("h-full w-full object-cover", imgClassName)}
      />
    </div>
  );
}
