import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { PlannedTripCard } from "@/components/planned-trip-card";
import { TripCardData as Trip, urgencyRatio, sizeTier } from "@/lib/trip-urgency";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";

// Preview strip for Home — a few real open-to-join trips. Horizontal scroll
// on mobile/tablet; at lg+ (once Home's <main> has room to spare) it becomes
// a wrapping 3-up grid instead, so the wider container gets used rather than
// just leaving more of the scroll strip peeking off-screen. "See all" opens
// the full /discover page (untouched, still the dense search+filter
// trip-matching utility). Reuses Home's already-fetched trips array — no
// separate query.
export function DiscoverPreviewStrip({ trips }: { trips: Trip[] }) {
  const reducedMotion = usePrefersReducedMotion();
  const preview = [...trips].sort((a, b) => urgencyRatio(a) - urgencyRatio(b)).slice(0, 6);

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="fomo-heading text-ink text-lg font-bold">Open to join</h2>
        <Link to="/discover" className="flex flex-shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {preview.length === 0 ? (
        <div className="warm-card rounded-3xl p-5 text-center text-sm text-ink/50">No open trips yet — start one?</div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:pb-0">
          {preview.map((trip, i) => (
            <div key={trip.id} className="w-40 flex-shrink-0 lg:w-auto">
              <PlannedTripCard trip={trip} index={i} featured={false} tier={sizeTier(trip)} reducedMotion={reducedMotion} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
