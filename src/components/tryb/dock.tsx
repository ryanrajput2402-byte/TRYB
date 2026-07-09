import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Compass, Home, MapPlus, PenLine, Plus, User, Users, X } from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/profile", label: "You", icon: User },
];

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(to + "/");
}

export function Dock() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    if (open) return;
    if (y > prev && y > 140) setHidden(true);
    else setHidden(false);
  });

  // Contextual bias: which action leads on this screen.
  const tripLed = pathname.startsWith("/discover") || pathname.startsWith("/trip");

  const go = (to: string) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      {/* Expandable action sheet */}
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              aria-label="Close"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={spring.soft}
              className="fixed bottom-28 left-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 px-2"
            >
              <div className="overflow-hidden rounded-3xl border border-border/70 bg-popover p-2 shadow-float">
                <div className="flex items-center justify-between px-3 pb-2 pt-1">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    Create
                  </p>
                  <button
                    onClick={() => setOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <ActionRow
                  onClick={() => go("/create")}
                  icon={MapPlus}
                  title="Create a trip"
                  sub="Plan it, set the vibe, choose your crew"
                  lead={tripLed}
                />
                <ActionRow
                  onClick={() => go("/post")}
                  icon={PenLine}
                  title="Share a story"
                  sub="A moment from the road, live for everyone"
                  lead={!tripLed}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dock */}
      <motion.nav
        aria-label="Primary"
        initial={false}
        animate={{ y: hidden ? 120 : 0, opacity: hidden ? 0 : 1 }}
        transition={spring.soft}
        className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[620px] justify-center pb-[max(16px,env(safe-area-inset-bottom))]"
      >
        <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 bg-popover/85 p-1.5 shadow-float backdrop-blur-xl">
          {NAV.slice(0, 2).map((item) => (
            <DockLink key={item.to} item={item} active={isActive(pathname, item.to)} />
          ))}

          <button
            aria-label="Create"
            onClick={() => setOpen((v) => !v)}
            className="group relative mx-0.5 grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[0_6px_20px_oklch(0.575_0.135_42_/_0.45)] transition-transform active:scale-90"
          >
            <motion.span animate={{ rotate: open ? 45 : 0 }} transition={spring.snappy}>
              <Plus className="size-6" strokeWidth={2.2} />
            </motion.span>
          </button>

          {NAV.slice(2).map((item) => (
            <DockLink key={item.to} item={item} active={isActive(pathname, item.to)} />
          ))}
        </div>
      </motion.nav>
    </>
  );
}

function DockLink({
  item,
  active,
}: {
  item: (typeof NAV)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className="relative flex h-11 w-[62px] flex-col items-center justify-center gap-0.5 rounded-full text-[10px] font-medium tracking-wide"
    >
      {active && (
        <motion.span
          layoutId="dock-pill"
          transition={spring.soft}
          className="absolute inset-0 rounded-full bg-secondary"
        />
      )}
      <span className={cn("relative transition-colors", active ? "text-primary" : "text-muted-foreground")}>
        <Icon className="size-[19px]" strokeWidth={active ? 2.3 : 1.9} />
      </span>
      <span className={cn("relative transition-colors", active ? "text-foreground" : "text-muted-foreground")}>
        {item.label}
      </span>
    </Link>
  );
}

function ActionRow({
  onClick,
  icon: Icon,
  title,
  sub,
  lead,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  sub: string;
  lead?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group flex w-full items-center gap-4 rounded-2xl p-3 text-left transition-colors",
        lead ? "bg-secondary/70 hover:bg-secondary" : "hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl transition-colors",
          lead ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-medium text-foreground">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">{sub}</span>
      </span>
    </button>
  );
}
