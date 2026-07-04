import { Flame } from "lucide-react";
import { pluralize } from "@/lib/format-date";
import { DestinationOption } from "@/lib/trip-urgency";

// Real-data destination filter chips — shared by Home and Discover so the
// same visual language and trending logic isn't duplicated per screen.
export function DestinationChipRow({
  options,
  selected,
  onSelect,
}: {
  options: DestinationOption[];
  selected: string | null;
  onSelect: (destination: string | null) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <button
        onClick={() => onSelect(null)}
        aria-pressed={selected === null}
        aria-label="Show all destinations"
        className="focus-visible:ring-primary flex flex-shrink-0 flex-col items-center gap-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <div
          className={`grid h-16 w-16 place-items-center rounded-full border-2 text-xs font-semibold transition ${
            selected === null ? "bg-primary border-transparent text-cream" : "warm-card border-transparent text-ink/70"
          }`}
        >
          All
        </div>
        <span className="text-[10px] font-medium text-ink/60">All</span>
      </button>
      {options.map((opt) => {
        const active = selected === opt.destination;
        return (
          <button
            key={opt.destination}
            onClick={() => onSelect(active ? null : opt.destination)}
            aria-pressed={active}
            aria-label={`Filter by ${opt.destination}, ${opt.count} ${pluralize(opt.count, "trip")}${opt.trending ? ", trending" : ""}`}
            className="focus-visible:ring-primary relative flex flex-shrink-0 flex-col items-center gap-1 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {opt.trending && (
              <span className="absolute -right-0.5 -top-0.5 z-10 grid h-5 w-5 place-items-center rounded-full bg-coral text-white">
                <Flame className="h-3 w-3" />
              </span>
            )}
            <div className={`rounded-full p-[2px] transition ${active ? "bg-primary" : "bg-ink/10"}`}>
              <div className="border-sand overflow-hidden rounded-full border-2">
                <img src={opt.image} alt="" className="h-16 w-16 object-cover" />
              </div>
            </div>
            <span className={`text-[10px] font-medium ${active ? "text-ink" : "text-ink/60"}`}>{opt.destination}</span>
          </button>
        );
      })}
    </div>
  );
}
