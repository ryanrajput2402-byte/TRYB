import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Compass, Plus, Users, User, ImagePlus, MapPin } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

type Item = { to: string; label: string; icon: LucideIcon; primary?: boolean; sectionId?: string };

// sectionId only set for nav items that have a corresponding section on the
// single-scroll Home page. Home no longer previews Discover/Groups content
// inline (that only ever exists on their own full pages now), so those two
// go back to being plain route links — same as Create and Profile always
// were, on Home or anywhere else.
const ITEMS: Item[] = [
  { to: "/home", label: "Home", icon: Home, sectionId: "section-feed" },
  { to: "/discover", label: "Discover", icon: Compass },
  { to: "/create", label: "Create", icon: Plus, primary: true },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const reducedMotion = usePrefersReducedMotion();
  const isHome = pathname === "/home";
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Scroll-spy — only engages on Home, where masthead/feed, the Discover
  // preview, and the Groups preview are sections on one page rather than
  // separate routes. Everywhere else, nav highlighting/navigation is
  // exactly the original route-based behavior, untouched.
  useEffect(() => {
    if (!isHome) {
      setActiveSection(null);
      return;
    }
    const ids = ITEMS.map((i) => i.sectionId).filter((id): id is string => !!id);
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Topmost intersecting section wins — matches "the section
        // currently in view" more intuitively than raw intersection ratio
        // when two sections are both partially on screen at once.
        const topmost = visible.reduce((a, b) => (a.boundingClientRect.top <= b.boundingClientRect.top ? a : b));
        setActiveSection(topmost.target.id);
      },
      { rootMargin: "-35% 0px -55% 0px", threshold: 0 },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isHome]);

  function handleNavClick(item: Item, e: React.MouseEvent) {
    if (!isHome || !item.sectionId) return; // normal Link navigation everywhere else
    e.preventDefault();
    document.getElementById(item.sectionId)?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth" });
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 px-4 pb-[env(safe-area-inset-bottom)]"
      aria-label="Primary navigation"
    >
      <div className="warm-card mx-auto mb-3 flex max-w-md items-center justify-around rounded-full px-2 py-2 shadow-2xl">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            isHome && item.sectionId
              ? activeSection === item.sectionId
              : pathname === item.to || pathname.startsWith(item.to + "/");
          if (item.primary) {
            return <CreateTray key={item.to} icon={Icon} label={item.label} />;
          }
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={(e) => handleNavClick(item, e)}
              className={`flex min-w-[44px] flex-col items-center gap-0.5 rounded-full px-3 py-2 transition ${
                active ? "text-primary" : "text-ink/60 hover:text-ink"
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

function CreateTray({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  const navigate = useNavigate();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-90"
          aria-label={label}
        >
          <Icon className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="center"
        sideOffset={12}
        className="warm-card text-ink w-auto rounded-2xl border-0 p-2 shadow-2xl"
      >
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => navigate({ to: "/post" })}
            className="hover:bg-primary/10 flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition"
          >
            <ImagePlus className="h-4 w-4 text-primary" />
            Post
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: "/create" })}
            className="hover:bg-primary/10 flex items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm font-medium transition"
          >
            <MapPin className="h-4 w-4 text-primary" />
            Trip
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
