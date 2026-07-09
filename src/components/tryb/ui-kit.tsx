import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Minimal person shape needed to render an avatar/avatar-stack — callers
 * adapt their real profile rows (full_name/avatar_url) into this shape. */
export type Person = {
  id: string;
  name: string;
  avatar?: string | null;
};

/* ---------- Tactile button ---------- */
type PressBtnProps = {
  children: React.ReactNode;
  variant?: "primary" | "ink" | "ghost" | "outline" | "soft";
  size?: "sm" | "md" | "lg";
  className?: string;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  "aria-label"?: string;
};

const variants: Record<string, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft hover:brightness-105",
  ink: "bg-ink text-ink-foreground hover:brightness-125",
  ghost: "text-foreground hover:bg-muted",
  outline: "border border-border bg-transparent text-foreground hover:bg-muted",
  soft: "bg-secondary text-secondary-foreground hover:brightness-[0.97]",
};
const sizes: Record<string, string> = {
  sm: "h-9 px-4 text-sm rounded-full",
  md: "h-11 px-5 text-[15px] rounded-full",
  lg: "h-14 px-7 text-base rounded-full",
};

export function PressBtn({
  children,
  variant = "primary",
  size = "md",
  className,
  href,
  onClick,
  type = "button",
  disabled,
  ...rest
}: PressBtnProps) {
  const cls = cn(
    "inline-flex select-none items-center justify-center gap-2 font-medium tracking-tight transition-[filter,background-color,color] disabled:opacity-50",
    variants[variant],
    sizes[size],
    className,
  );
  const motionProps = {
    whileTap: { scale: disabled ? 1 : 0.96 },
    transition: spring.press,
  };
  if (href) {
    return (
      <motion.div {...motionProps} className="inline-flex">
        <Link to={href} className={cls} aria-label={rest["aria-label"]}>
          {children}
        </Link>
      </motion.div>
    );
  }
  return (
    <motion.button
      {...motionProps}
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cls}
      aria-label={rest["aria-label"]}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Avatar ---------- */
export function Avatar({
  person,
  size = 40,
  ring,
  className,
}: {
  person: Person;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const initials = person.name.slice(0, 1).toUpperCase();
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-foreground",
        ring && "ring-2 ring-background",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {person.avatar ? (
        <img src={person.avatar} alt={person.name} className="h-full w-full object-cover" />
      ) : (
        <span className="font-medium">{initials}</span>
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  size = 28,
  max = 4,
}: {
  people: Person[];
  size?: number;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <div className="flex items-center">
      <div className="flex -space-x-2.5">
        {shown.map((p) => (
          <Avatar key={p.id} person={p} size={size} ring />
        ))}
      </div>
      {extra > 0 && (
        <span
          className="ml-2 grid place-items-center rounded-full bg-secondary text-xs font-medium text-muted-foreground ring-2 ring-background"
          style={{ height: size, minWidth: size, paddingInline: 6 }}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}

/* ---------- Chip ---------- */
export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      transition={spring.press}
      onClick={onClick}
      className={cn(
        "relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-foreground text-background"
          : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

/* ---------- Section eyebrow ---------- */
export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}
