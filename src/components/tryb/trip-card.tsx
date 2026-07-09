import { motion } from "motion/react";
import { Bookmark, MapPin } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { spring } from "@/lib/motion";
import { AvatarStack, type Person } from "@/components/tryb/ui-kit";
import { cn } from "@/lib/utils";
import { formatCompactRange } from "@/lib/format-date";
import { costPerPerson, type TripCardData } from "@/lib/trip-urgency";

export function TripCard({
  trip,
  saved,
  onToggleSave,
  className,
}: {
  trip: TripCardData;
  saved: boolean;
  onToggleSave: () => void;
  className?: string;
}) {
  const spots = Math.max(trip.max_members - trip.going, 0);
  const pp = costPerPerson(trip);
  const crew: Person[] = trip.memberFaces.map((p) => ({ id: p.id, name: p.full_name, avatar: p.avatar_url }));

  return (
    <motion.div whileHover={{ y: -6 }} transition={spring.soft} className={cn("group relative", className)}>
      <Link
        to="/trip/$tripId"
        params={{ tripId: trip.id }}
        className="block overflow-hidden rounded-3xl bg-ink text-ink-foreground shadow-lift"
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <img
            src={trip.cover_image ?? "/placeholder.svg"}
            alt={trip.destination}
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />

          {/* Top row */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <span className="rounded-full bg-ink/45 px-3 py-1 text-xs font-medium text-ink-foreground backdrop-blur-md">
              {trip.going} going · {spots} spots left
            </span>
            <button
              aria-label={saved ? "Saved" : "Save trip"}
              onClick={(e) => {
                e.preventDefault();
                onToggleSave();
              }}
              className="grid size-9 place-items-center rounded-full bg-ink/45 text-ink-foreground backdrop-blur-md transition-transform active:scale-90"
            >
              <Bookmark className={cn("size-4", saved && "fill-current text-primary")} />
            </button>
          </div>

          {/* Bottom content */}
          <div className="absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-center gap-1.5 text-xs font-medium text-ink-foreground/80">
              <MapPin className="size-3.5" />
              {trip.destination}
              {trip.country ? `, ${trip.country}` : ""}
            </div>
            <h3 className="display mt-1 text-[26px] font-semibold text-ink-foreground">{trip.title}</h3>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-ink-foreground/80">
                {formatCompactRange(trip.start_date, trip.end_date)}
                {pp ? ` · from ₹${pp.min.toLocaleString("en-IN")}` : ""}
              </span>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t border-ink-foreground/15 pt-3">
              <AvatarStack people={crew} size={26} max={3} />
              <span className="text-xs text-ink-foreground/70">
                {trip.organizer ? `with ${trip.organizer.full_name}` : null}
                {trip.solo_friendly && " · solo-friendly"}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
