import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { CountUp } from "@/components/count-up";
import { useInView } from "@/lib/use-in-view";
import { DESTINATIONS, vibeTint } from "@/lib/destinations";
import { formatCompactRange } from "@/lib/format-date";
import { trackEvent } from "@/lib/analytics";
import { TripCardData, urgencyBadge, momentumLabel, keyoTeaser, costPerPerson } from "@/lib/trip-urgency";
import { Bookmark, BookmarkCheck, Sparkles } from "lucide-react";

// Shared real-data trip card — Home's planning feed (featured hero + grid)
// and Discover's trip-matching grid both render through this so badges,
// shadows, and organizer/member treatment stay identical rather than
// duplicated per screen.
export function PlannedTripCard({
  trip,
  index,
  featured,
  tier,
  saved,
  justSaved,
  onSave,
  reducedMotion,
  showOrganizer,
}: {
  trip: TripCardData;
  index: number;
  featured: boolean;
  tier: "large" | "medium" | "small";
  saved?: boolean;
  justSaved?: boolean;
  onSave?: () => void;
  reducedMotion: boolean;
  // Home only wants organizer trust info on its one featured hero card
  // (avoids clutter on the smaller grid); Discover wants it on every card
  // as a trust signal, since every card there is a real trip to evaluate.
  // Defaults to Home's existing behavior when not passed.
  showOrganizer?: boolean;
}) {
  const cover = trip.cover_image ?? DESTINATIONS[index % DESTINATIONS.length].image;
  const vibe = trip.vibe_tags?.[0];
  const badge = urgencyBadge(trip);
  const dateRange = formatCompactRange(trip.start_date, trip.end_date);
  const momentum = momentumLabel(trip);
  const isFull = trip.going >= trip.max_members;
  const shouldShowOrganizer = showOrganizer ?? featured;
  const pp = costPerPerson(trip);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Fire-once view instrumentation, piggybacking on the same
  // IntersectionObserver pattern used for scroll-reveals elsewhere.
  const { ref: viewRef, inView } = useInView<HTMLAnchorElement>(0.5);
  useEffect(() => {
    if (inView) trackEvent({ name: "card_viewed", tripId: trip.id, destination: trip.destination, featured });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  // Subtle mouse-move parallax on the featured image only, desktop-oriented.
  function handleMouseMove(e: React.MouseEvent) {
    if (reducedMotion || !featured || !cardRef.current || !imgRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    imgRef.current.style.transform = `translate(${x * -14}px, ${y * -14}px) scale(1.08)`;
  }
  function handleMouseLeave() {
    if (imgRef.current) imgRef.current.style.transform = "";
  }

  const cardInner = (
    <div
      ref={cardRef}
      className={`relative overflow-hidden ${
        featured
          ? "aspect-[4/3] rounded-none sm:aspect-[16/9] sm:rounded-3xl"
          : `shadow-warm transition duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 rounded-3xl ${tier === "medium" ? "aspect-[4/5] ring-1 ring-ink/10" : "aspect-[3/4]"}`
      }`}
    >
      <img
        ref={featured ? imgRef : undefined}
        src={cover}
        alt={trip.destination}
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 group-hover:brightness-110 group-focus-visible:scale-105"
      />
      {/* Consistent neutral warm-charcoal duotone grade so the feed reads as
          one gallery — deliberately NOT season-tinted, since tinting real
          trip photos bright coral/sage/pink per season would look bad. */}
      <div className="absolute inset-0 mix-blend-color" style={{ background: "oklch(0.35 0.02 60 / 0.15)" }} />
      <div className={`absolute inset-0 bg-gradient-to-t ${vibeTint(vibe)}`} />
      <div
        className={`absolute inset-0 bg-gradient-to-t ${
          featured ? "from-black/80 via-black/15 to-black/5" : "from-black/95 via-black/35 to-black/10"
        }`}
      />

      <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
        <span className={`rounded-full px-2.5 py-1 font-semibold backdrop-blur-md ${featured ? "text-sm" : "text-[10px]"} ${badge.className}`}>
          <CountUp value={trip.going} triggerOnView /> going ·{" "}
          {badge.isFull ? (
            "Full"
          ) : (
            <>
              <CountUp value={badge.left} triggerOnView /> {badge.suffix}
            </>
          )}
        </span>
        {momentum && (
          <span className="rounded-full bg-black/40 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/80 backdrop-blur-md">
            {momentum}
          </span>
        )}
      </div>

      {onSave && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onSave();
          }}
          aria-label={saved ? "Unsave" : "Save"}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition ${
            saved ? "bg-teal text-black" : "bg-black/40 text-white hover:bg-black/60"
          } ${justSaved && !reducedMotion ? "animate-save-bounce" : ""}`}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      )}

      {/* Featured card's CTA stays persistently visible with a subtle
          draw-the-eye pulse, positioned clear of the bottom text block. */}
      {featured && (
        <div
          className={`pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 sm:top-24 ${reducedMotion ? "" : "animate-pulse-live"}`}
        >
          <span className="bg-primary text-cream rounded-full px-5 py-2 text-sm font-semibold shadow-lg">
            {isFull ? "Join waitlist" : "Join"}
          </span>
        </div>
      )}

      {/* Non-featured cards reveal their CTA only on hover/focus */}
      {!featured && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100">
          <span className="bg-primary text-cream rounded-full px-5 py-2 text-sm font-semibold shadow-lg">
            {isFull ? "Join waitlist" : "Join"}
          </span>
        </div>
      )}

      <div className={`absolute inset-x-0 bottom-0 ${featured ? "p-5 sm:p-6" : "p-4"}`}>
        {featured && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">Most urgent right now</p>
        )}
        <div className="flex items-center gap-1.5">
          <h3 className={`fomo-heading font-bold leading-tight text-white drop-shadow ${featured ? "text-3xl sm:text-4xl" : "text-xl"}`}>
            {trip.destination}
          </h3>
          {trip.solo_friendly && (
            <span className={`shrink-0 rounded-full bg-teal/85 font-semibold text-black ${featured ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[9px]"}`}>
              🧍 Solo
            </span>
          )}
        </div>
        <p className={`mt-0.5 text-white/70 ${featured ? "text-sm" : "text-xs"}`}>
          {dateRange}
          {pp && <span className="text-white/50"> · ~₹{pp.min}–{pp.max}/person</span>}
        </p>
        {trip.vibe_summary && (
          <p className={`mt-1 line-clamp-1 font-medium text-white/85 ${featured ? "text-sm" : "text-[11px]"}`}>
            ✨ {trip.vibe_summary}
          </p>
        )}
        {featured && trip.description && (
          <p className="mt-1.5 line-clamp-1 text-xs text-white/70">"{trip.description}"</p>
        )}
        {featured && (
          <p className="mt-2 hidden text-sm text-white/85 sm:block">
            <Sparkles className="text-primary mr-1 inline h-3.5 w-3.5" />
            Keyo says: {keyoTeaser(trip.destination, vibe)}
          </p>
        )}

        <div className={`flex items-center gap-2 ${featured ? "mt-3" : "mt-2.5"}`}>
          <div className="flex -space-x-2">
            {trip.memberFaces.map((m) =>
              m.avatar_url ? (
                <img
                  key={m.id}
                  src={m.avatar_url}
                  alt=""
                  className={`rounded-full object-cover ring-2 ring-black/60 ${featured ? "h-7 w-7" : "h-5 w-5"}`}
                />
              ) : (
                <div
                  key={m.id}
                  className={`bg-primary/70 grid place-items-center rounded-full font-bold text-white ring-2 ring-black/60 ${
                    featured ? "h-7 w-7 text-[10px]" : "h-5 w-5 text-[9px]"
                  }`}
                >
                  {(m.full_name ?? "?").slice(0, 1)}
                </div>
              ),
            )}
          </div>
          {shouldShowOrganizer && trip.organizer?.full_name && (
            <span className={`text-white/80 ${featured ? "text-xs" : "text-[11px]"}`}>
              <span className="text-white/50">Organizer</span> {trip.organizer.full_name.split(" ")[0]}
              {typeof trip.organizer.organizedCount === "number" && (
                <span className="text-white/50">
                  {" "}
                  · {trip.organizer.organizedCount} organized
                  {typeof trip.organizer.completedCount === "number" && trip.organizer.completedCount > 0
                    ? `, ${trip.organizer.completedCount} completed`
                    : ""}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Link
      ref={viewRef}
      to="/trip/$tripId"
      params={{ tripId: trip.id }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => trackEvent({ name: "card_tapped", tripId: trip.id, destination: trip.destination })}
      className={`group animate-fade-up focus-visible:ring-primary block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
        featured ? "col-span-2 -mx-4 sm:mx-0" : ""
      }`}
      style={{ animationDelay: reducedMotion ? "0ms" : featured ? "0ms" : `${Math.min(index * 60, 720)}ms` }}
    >
      {featured ? (
        // True gradient border (not just a solid ring) — same padding-wrapper
        // trick as Keyo's border in chat, using this season's --gradient-earth.
        // This is Home's "single focal point" element, mirroring Keyo's role.
        <div
          className={`rounded-none p-[3px] transition duration-300 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 sm:rounded-3xl ${
            reducedMotion ? "shadow-warm" : "animate-heartbeat-glow-warm"
          }`}
          style={{ background: "var(--gradient-earth)" }}
        >
          {cardInner}
        </div>
      ) : (
        cardInner
      )}
    </Link>
  );
}
