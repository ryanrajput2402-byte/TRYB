import { motion, AnimatePresence } from "motion/react";
import { Search, Sparkles, ArrowUpRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { spring } from "@/lib/motion";
import { Chip, Eyebrow, AvatarStack } from "@/components/tryb/ui-kit";
import { TripCard } from "@/components/tryb/trip-card";
import { FadeIn, Img } from "@/components/tryb/motion-primitives";
import { cn } from "@/lib/utils";
import { DESTINATIONS } from "@/lib/destinations";
import { urgencyRatio, type TripCardData as Trip } from "@/lib/trip-urgency";

const VIBES = ["All", "Beaches", "Mountains", "Cities", "Forest", "Desert"] as const;
const VIBE_MAP: Record<string, string> = {
  Beaches: "beach",
  Mountains: "mountain",
  Cities: "city",
  Forest: "forest",
  Desert: "desert",
};
const BUDGETS = [
  { id: "any", label: "Any budget", max: Infinity, min: 0 },
  { id: "low", label: "Under ₹12k", max: 12000, min: 0 },
  { id: "mid", label: "₹12k–25k", max: 25000, min: 12000 },
  { id: "high", label: "₹25k+", max: Infinity, min: 25000 },
] as const;

type Profile = { id: string; full_name: string; avatar_url: string | null };

export function DiscoverView({
  saved,
  onToggleSave,
}: {
  saved: Set<string>;
  onToggleSave: (tripId: string) => void;
}) {
  const [vibe, setVibe] = useState<string>("All");
  const [budget, setBudget] = useState<string>("any");
  const [query, setQuery] = useState("");
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: t } = await supabase
        .from("trips")
        .select("*")
        .eq("privacy", "public")
        .order("created_at", { ascending: false })
        .limit(60);
      const rawTrips = (t ?? []) as any[];
      const tripIds = rawTrips.map((x) => x.id);

      const { data: memberRows } = tripIds.length
        ? await supabase.from("trip_members").select("trip_id, user_id, status").in("trip_id", tripIds)
        : { data: [] as any[] };

      const goingByTrip = new Map<string, number>();
      const approvedIdsByTrip = new Map<string, string[]>();
      (memberRows ?? []).forEach((m: any) => {
        if (m.status === "approved") {
          goingByTrip.set(m.trip_id, (goingByTrip.get(m.trip_id) ?? 0) + 1);
          const list = approvedIdsByTrip.get(m.trip_id) ?? [];
          list.push(m.user_id);
          approvedIdsByTrip.set(m.trip_id, list);
        }
      });

      const organizerIds = rawTrips.map((x) => x.organizer_id);
      const allProfileIds = Array.from(new Set([...organizerIds, ...(memberRows ?? []).map((m: any) => m.user_id)]));
      const { data: profs } = allProfileIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allProfileIds)
        : { data: [] as Profile[] };
      const profById = new Map((profs ?? []).map((p) => [p.id, p as Profile]));

      const withGoing: Trip[] = rawTrips.map((tr) => {
        const faceIds = (approvedIdsByTrip.get(tr.id) ?? []).slice(0, 4);
        return {
          ...tr,
          organizer: profById.get(tr.organizer_id),
          going: goingByTrip.get(tr.id) ?? 0,
          memberFaces: faceIds.map((id) => profById.get(id)).filter(Boolean) as Profile[],
          mostRecentJoinAt: null,
        };
      });

      setTrips(withGoing);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return trips.filter((t) => {
      const vibeOk = vibe === "All" || (t.vibe_tags ?? []).includes(VIBE_MAP[vibe]);
      const b = BUDGETS.find((x) => x.id === budget)!;
      const max = t.budget_max ?? t.budget_min ?? null;
      const budgetOk = budget === "any" || (max != null && max <= b.max && max >= b.min);
      const q = query.trim().toLowerCase();
      const queryOk =
        !q ||
        t.destination.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        (t.country ?? "").toLowerCase().includes(q);
      return vibeOk && budgetOk && queryOk;
    });
  }, [trips, vibe, budget, query]);

  const featured = useMemo(() => {
    if (!trips.length) return null;
    return [...trips].sort((a, b) => urgencyRatio(a) - urgencyRatio(b))[0];
  }, [trips]);

  const destinationTripCounts = useMemo(() => {
    const counts = new Map<string, number>();
    trips.forEach((t) => counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1));
    return counts;
  }, [trips]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-5 pb-40 pt-10">
        <div className="skeleton h-32 rounded-3xl" />
        <div className="skeleton mt-6 aspect-[3/2] rounded-[28px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-5 pb-40 pt-10">
      {/* Header */}
      <FadeIn>
        <Eyebrow>Discover</Eyebrow>
        <h1 className="display mt-2 text-balance text-5xl font-semibold leading-[0.95] tracking-tight">
          Find your next
          <br />
          <span className="italic text-primary">favourite memory.</span>
        </h1>
        <p className="mt-4 max-w-md text-pretty leading-relaxed text-muted-foreground">
          These aren&apos;t listings. They&apos;re real trips, with real people already going — looking for
          someone exactly like you to come along.
        </p>
      </FadeIn>

      {/* Search */}
      <FadeIn delay={0.05} className="mt-8">
        <label className="group flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-soft transition-colors focus-within:border-foreground/30">
          <Search className="size-5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Where are you dreaming of?"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
        </label>
      </FadeIn>

      {/* Featured — the anticipation moment */}
      {featured && (
        <FadeIn delay={0.1} className="mt-6">
          <Link
            to="/trip/$tripId"
            params={{ tripId: featured.id }}
            className="group relative block overflow-hidden rounded-[28px] bg-ink text-ink-foreground shadow-lift"
          >
            <Img
              src={featured.cover_image ?? "/placeholder.svg"}
              alt={featured.destination}
              className="aspect-[3/2] w-full"
              imgClassName="transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="flex items-center gap-2 self-start rounded-full bg-ink/40 px-3 py-1.5 text-xs font-medium backdrop-blur-md">
                <Sparkles className="size-3.5 text-primary" />
                TRYB&apos;s pick this week
              </div>
              <div>
                <p className="text-sm text-ink-foreground/80">
                  {featured.destination}
                  {featured.country ? `, ${featured.country}` : ""}
                </p>
                <h2 className="display mt-1 text-4xl font-semibold">{featured.title}</h2>
                {featured.vibe_summary && (
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-ink-foreground/85">
                    {featured.vibe_summary}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <AvatarStack
                    people={featured.memberFaces.map((p) => ({ id: p.id, name: p.full_name, avatar: p.avatar_url }))}
                    size={30}
                    max={4}
                  />
                  <span className="text-sm text-ink-foreground/80">
                    {featured.going} going · {Math.max(featured.max_members - featured.going, 0)} spots left
                  </span>
                  <ArrowUpRight className="ml-auto size-6 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                </div>
              </div>
            </div>
          </Link>
        </FadeIn>
      )}

      {/* Filters */}
      <div className="mt-10 space-y-5">
        <div>
          <Eyebrow className="mb-3">The feeling you&apos;re after</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => (
              <Chip key={v} active={vibe === v} onClick={() => setVibe(v)}>
                {v}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Eyebrow className="mb-3">Budget</Eyebrow>
          <div className="flex flex-wrap gap-2">
            {BUDGETS.map((b) => (
              <Chip key={b.id} active={budget === b.id} onClick={() => setBudget(b.id)}>
                {b.label}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mt-10">
        <div className="mb-4 flex items-baseline justify-between">
          <h3 className="display text-2xl font-semibold">Open to join</h3>
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "trip" : "trips"}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {filtered.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={spring.soft}
                >
                  <TripCard trip={t} saved={saved.has(t.id)} onToggleSave={() => onToggleSave(t.id)} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <EmptyState
              onReset={() => {
                setVibe("All");
                setBudget("any");
                setQuery("");
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Explore destinations — inspiration */}
      <div className="mt-14">
        <Eyebrow>For inspiration</Eyebrow>
        <h3 className="display mt-2 text-2xl font-semibold">Places worth starting a trip for</h3>
        <div className="no-scrollbar mt-5 flex gap-4 overflow-x-auto pb-4">
          {DESTINATIONS.map((d) => {
            const count = destinationTripCounts.get(d.name) ?? 0;
            return (
              <motion.div
                key={d.slug}
                whileHover={{ y: -4 }}
                transition={spring.soft}
                className="relative w-56 shrink-0 overflow-hidden rounded-3xl bg-ink text-ink-foreground shadow-lift"
              >
                <Img src={d.image} alt={d.name} className="aspect-[3/4] w-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h4 className="display text-2xl font-semibold">
                    {d.flag} {d.name}
                  </h4>
                  <p className="text-xs text-ink-foreground/70">{d.country}</p>
                  <p className="mt-3 text-xs text-ink-foreground/70">
                    {count > 0 ? `${count} trip${count === 1 ? "" : "s"} open` : "Be the first to plan one"}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"
    >
      <div className="grid size-14 place-items-center rounded-2xl bg-secondary">
        <Search className="size-6 text-muted-foreground" />
      </div>
      <h4 className="display mt-4 text-xl font-semibold">No trips match — yet</h4>
      <p className="mt-2 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
        Nothing fits that combination right now. Loosen a filter, or be the one who starts it.
      </p>
      <div className="mt-5 flex gap-3">
        <button onClick={onReset} className={cn("rounded-full bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground")}>
          Clear filters
        </button>
        <Link to="/create" className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background">
          Start a trip
        </Link>
      </div>
    </motion.div>
  );
}
