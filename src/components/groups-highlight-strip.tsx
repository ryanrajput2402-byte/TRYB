import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { CountUp } from "@/components/count-up";
import { formatCompactRange } from "@/lib/format-date";
import { DESTINATIONS } from "@/lib/destinations";

export type HighlightTrip = {
  id: string;
  destination: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
};

// Phase 2 — Groups/your-trips condensed to a highlight strip, no longer the
// main weight of Home. The live "planning right now" count moves here (per
// the counter-placement decision) as the strip's eyebrow label, tying it to
// an actual decision moment (join/create) instead of being page-wide ambient
// noise at the top of the page.
export function GroupsHighlightStrip({ trips, livePlanners }: { trips: HighlightTrip[]; livePlanners: number }) {
  return (
    <section className="pt-2">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full" />
          </span>
          <p className="fomo-heading text-xs font-bold uppercase tracking-wider text-ink/60">
            <CountUp value={livePlanners} /> planning trips right now
          </p>
        </div>
        <Link to="/groups" className="flex flex-shrink-0 items-center gap-0.5 text-xs font-semibold text-primary">
          See all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {trips.length === 0 ? (
        <Link
          to="/create"
          className="warm-card flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-medium text-ink/70 hover:bg-ink/5"
        >
          You haven't joined a trip yet — start one
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:pb-0">
          {trips.map((trip, i) => (
            <Link
              key={trip.id}
              to="/trip/$tripId"
              params={{ tripId: trip.id }}
              className="shadow-warm group relative aspect-[4/3] w-40 flex-shrink-0 overflow-hidden rounded-3xl lg:w-auto"
            >
              <img
                src={trip.cover_image ?? DESTINATIONS[i % DESTINATIONS.length].image}
                alt={trip.destination}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5">
                <p className="truncate text-xs font-bold text-white drop-shadow">{trip.destination}</p>
                <p className="text-[10px] text-white/70">{formatCompactRange(trip.start_date, trip.end_date)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
