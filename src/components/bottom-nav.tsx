import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Plus, Users, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Item = { to: string; label: string; icon: LucideIcon; primary?: boolean };

const ITEMS: Item[] = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/create", label: "Create", icon: Plus, primary: true },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary navigation"
    >
      <div className="glass-card mx-auto mb-3 flex max-w-md items-center justify-around rounded-full px-2 py-2 shadow-2xl">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.to || pathname.startsWith(item.to + "/");
          if (item.primary) {
            return (
              <Link
                key={item.to}
                to={item.to}
                className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-90"
                aria-label={item.label}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex min-w-[44px] flex-col items-center gap-0.5 rounded-full px-3 py-2 transition ${
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-label={item.label}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
              {active && <span className="h-1 w-1 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
