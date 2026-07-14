import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  X,
  Home,
  Compass,
  Plus,
  Users,
  User,
  Sparkles,
  Wallet,
  BarChart3,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { trackEvent } from "@/lib/analytics";

const SLIDE_COUNT = 5;
const AUTO_ADVANCE_MS = 5000;

// Restored — a real 5-slide product tour that existed before the Cinematic
// Opener rebuild, then got dropped along the way. Shown once ever, on the
// first authenticated screen a user lands on after finishing onboarding
// (see _authenticated/route.tsx), gated on profiles.onboarding_intro_seen.
// Rebuilt onto tryb-theme's tokens; the original content and mechanics are
// unchanged.
export function OnboardingIntroCarousel({
  onClose,
  onCreateTrip,
}: {
  onClose: () => void;
  onCreateTrip: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [trackHeight, setTrackHeight] = useState<number | undefined>(undefined);
  const reducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const closedRef = useRef(false);

  function finish(completed: boolean) {
    if (closedRef.current) return;
    closedRef.current = true;
    trackEvent({ name: "onboarding_intro_dismissed", lastSlide: index, completed });
    onClose();
  }

  function goTo(next: number) {
    setIndex(Math.max(0, Math.min(SLIDE_COUNT - 1, next)));
  }

  // Each slide sizes to its own content (Slide 2's nav-diagram genuinely
  // needs more room) — measure the active slide and animate the shared
  // track to match, rather than letting a flex row force every slide to
  // the tallest one's height.
  useLayoutEffect(() => {
    const el = slideRefs.current[index];
    if (el) setTrackHeight(el.offsetHeight);
  }, [index]);

  // Auto-advance — any manual navigation (Next, a dot, arrow keys) changes
  // `index`, which tears down this effect and starts a fresh 5s window.
  // Reduced motion disables auto-advance entirely; manual Next/Done/dots
  // still work.
  useEffect(() => {
    if (reducedMotion || index >= SLIDE_COUNT - 1) return;
    const t = setTimeout(() => goTo(index + 1), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [index, reducedMotion]);

  // Keyboard: Escape closes (same as Done), Left/Right move between
  // slides, Tab is trapped inside the dialog.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        finish(false);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goTo(index + 1);
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goTo(index - 1);
        return;
      }
      if (e.key === "Tab" && containerRef.current) {
        const focusable = containerRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const isLast = index === SLIDE_COUNT - 1;
  // Slide 2 (index 1) carries the most information — a wider card rather
  // than cramming a 5-icon annotated diagram into the same frame every
  // other slide uses. Height follows automatically via the measurement
  // above.
  const isWideSlide = index === 1;

  const slides = [
    <Slide1 key={0} />,
    <Slide2 key={1} />,
    <Slide3 key={2} />,
    <Slide4 key={3} />,
    <Slide5 key={4} />,
  ];

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to TRYB"
    >
      <div
        ref={containerRef}
        tabIndex={-1}
        className={`animate-scale-in relative flex w-full flex-col rounded-3xl border border-border bg-card shadow-float outline-none transition-[max-width] duration-300 ${
          isWideSlide ? "max-w-lg" : "max-w-md"
        }`}
      >
        <button
          type="button"
          onClick={() => finish(false)}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full bg-black/10 text-foreground/60 backdrop-blur-md hover:bg-black/20 hover:text-foreground"
        >
          <X className="size-4" />
        </button>

        <div
          className="overflow-hidden rounded-t-3xl"
          style={{
            height: trackHeight,
            transition: reducedMotion ? "none" : "height 320ms ease",
          }}
        >
          <div
            className="flex"
            style={{
              transform: `translateX(-${index * 100}%)`,
              transition: reducedMotion ? "none" : "transform 420ms cubic-bezier(0.65, 0, 0.35, 1)",
            }}
          >
            {slides.map((slide, i) => (
              <div
                key={i}
                ref={(el) => {
                  slideRefs.current[i] = el;
                }}
                className="w-full flex-shrink-0 px-6 pb-5 pt-8"
              >
                {slide}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <button
            type="button"
            onClick={() => finish(false)}
            className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            Done
          </button>

          <div className="flex items-center gap-1.5" role="tablist" aria-label="Slide">
            {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Go to slide ${i + 1}`}
                onClick={() => goTo(i)}
                className={`h-1.5 rounded-full transition-all ${i === index ? "w-5 bg-primary" : "w-1.5 bg-foreground/15"}`}
              />
            ))}
          </div>

          {isLast ? (
            <button
              type="button"
              onClick={() => {
                finish(true);
                onCreateTrip();
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-soft transition hover:opacity-90"
            >
              Create your first trip <ArrowRight className="size-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goTo(index + 1)}
              className="inline-flex items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-semibold text-secondary-foreground transition hover:opacity-90"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Slide1() {
  return (
    <div>
      <div className="-mx-6 -mt-8 mb-5 h-44 overflow-hidden shadow-soft">
        <img
          src="https://images.unsplash.com/photo-1646303297330-17073f7823c3?w=900&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
      </div>
      <p className="display text-center text-xl font-semibold leading-snug text-foreground">
        Where a trip goes from "we should do this" to "we're doing this" — with real people, not
        just plans.
      </p>
    </div>
  );
}

const NAV_ITEMS: { icon: typeof Home; label: string; primary?: boolean }[] = [
  { icon: Home, label: "See who's planning right now" },
  { icon: Compass, label: "Search real trips to join" },
  { icon: Plus, label: "Post an update, or start a trip", primary: true },
  { icon: Users, label: "Track trips you're part of" },
  { icon: User, label: "Your identity and trust signals" },
];

function Slide2() {
  return (
    <div>
      <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Getting around TRYB
      </p>
      <h2 className="display mt-1.5 text-center text-lg font-semibold text-foreground">
        Five places, five real jobs
      </h2>

      {/* A faithful recreation of the app's real bottom nav — the actual
          UI a user recognizes the instant this modal closes, not an
          abstract icon grid standing in for it. */}
      <div className="mx-auto mt-6 flex max-w-xs items-center justify-around rounded-full border border-border bg-card px-2 py-2 shadow-lift">
        {NAV_ITEMS.map((item, i) => {
          const Icon = item.icon;
          return item.primary ? (
            <div
              key={i}
              className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft"
            >
              <Icon className="size-5" />
            </div>
          ) : (
            <div key={i} className="grid size-11 place-items-center text-muted-foreground">
              <Icon className="size-5" />
            </div>
          );
        })}
      </div>

      <div className="mx-auto mt-3 grid max-w-xs grid-cols-5 gap-1.5">
        {NAV_ITEMS.map((item, i) => (
          <div key={i} className="flex flex-col items-center gap-1 text-center">
            <span className="h-2 w-px bg-border" />
            <span className="text-[9.5px] leading-tight text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide3() {
  return (
    <div>
      <p className="display text-center text-lg font-semibold leading-snug text-foreground">
        Meet Keyo — not a chatbot you open separately, but the one already in your group chat.
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        It knows your dates, your budget, your people — and jumps in exactly when you need it.
      </p>

      {/* A live recreation of Keyo's real gradient-bordered message
          treatment from group chat — a genuine preview, not an icon. */}
      <div className="mt-5 flex items-end gap-2">
        <div
          className="h-7 w-7 flex-shrink-0 rounded-full p-[1.5px]"
          style={{ background: "var(--gradient-earth-soft)" }}
        >
          <div className="grid h-full w-full place-items-center rounded-full bg-card">
            <Sparkles className="size-3.5 text-primary" />
          </div>
        </div>
        <div className="min-w-0">
          <p className="mb-0.5 flex items-center gap-1 px-1 text-[11px] font-bold uppercase tracking-wide text-primary">
            <Sparkles className="size-2.5" /> Keyo
          </p>
          <div
            className="rounded-2xl p-[1px]"
            style={{
              background: "var(--gradient-earth-soft)",
              boxShadow: "var(--keyo-glow-shadow)",
            }}
          >
            <div className="rounded-2xl bg-card/95 px-4 py-2.5 text-sm text-foreground/90 backdrop-blur-xl">
              Goa's ~₹6,250pp if everyone confirms by Friday — want me to nudge the group?
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Slide4() {
  const TOOLS = [
    { icon: MessageCircle, label: "Chat" },
    { icon: Wallet, label: "Expenses" },
    { icon: BarChart3, label: "Polls" },
  ];
  return (
    <div>
      <p className="display text-center text-xl font-semibold leading-snug text-foreground">
        Everything that makes planning actually happen, in one thread.
      </p>
      <p className="mt-2 text-center text-sm text-muted-foreground">
        Split an expense without the group-chat math, settle it with a tap, or drop a poll when
        nobody can decide on dates. Keyo's already watching — ready with an answer before you finish
        typing the question.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        {TOOLS.map((t) => (
          <div
            key={t.label}
            className="flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-5 py-3 shadow-soft"
          >
            <t.icon className="size-5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide5() {
  return (
    <div>
      <div className="relative -mx-6 -mb-5 -mt-8 h-80 overflow-hidden shadow-soft">
        <img
          src="https://images.unsplash.com/photo-1754400356403-84715a991736?w=900&q=80"
          alt=""
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="display text-lg font-semibold leading-snug text-white drop-shadow">
            Somewhere right now, five strangers just became a group headed to Spain.
          </p>
          <p className="mt-2 text-sm text-white/80">
            You've had that thought too — the one where you almost booked it, then didn't, because
            you had no one to go with. That's not a reason anymore.
          </p>
        </div>
      </div>
    </div>
  );
}
