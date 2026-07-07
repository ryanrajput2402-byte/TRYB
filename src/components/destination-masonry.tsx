import { Link } from "@tanstack/react-router";
import type { Destination } from "@/lib/destinations";

// Phase 2 Home — Pinterest-style masonry grid of time-relevant destinations.
// CSS columns (not CSS grid) is what gives the true masonry stagger — each
// card's height varies with its own aspect ratio instead of being locked to
// a row, which is the visual difference between this and Discover's uniform
// trip-results grid.
const TALL_EVERY = 3;

export function DestinationMasonry({ destinations }: { destinations: Destination[] }) {
  if (destinations.length === 0) return null;
  return (
    <div className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3">
      {destinations.map((d, i) => (
        <DestinationTile key={d.slug} destination={d} tall={i % TALL_EVERY === 0} index={i} />
      ))}
    </div>
  );
}

function DestinationTile({ destination, tall, index }: { destination: Destination; tall: boolean; index: number }) {
  return (
    <Link
      to="/destination/$slug"
      params={{ slug: destination.slug }}
      className="focus-visible:ring-primary group animate-fade-up block break-inside-avoid overflow-hidden rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      style={{ animationDelay: `${Math.min(index * 50, 600)}ms` }}
    >
      <div className={`shadow-warm relative w-full overflow-hidden ${tall ? "aspect-[3/4]" : "aspect-square"}`}>
        <img
          src={destination.image}
          alt={destination.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <p className="flex items-center gap-1 text-sm font-bold text-white drop-shadow">
            <span>{destination.flag}</span> {destination.name}
          </p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-white/75">{destination.whyNow}</p>
        </div>
      </div>
    </Link>
  );
}
