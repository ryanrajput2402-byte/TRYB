import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { PlannedTripCard } from "@/components/planned-trip-card";
import { DestinationChipRow } from "@/components/destination-chips";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { DESTINATIONS } from "@/lib/destinations";
import {
  TripCardData as Trip,
  sizeTier,
  deriveDestinationOptions,
  tripDateBucket,
  tripSizeBucket,
  DateBucket,
  SizeBucket,
} from "@/lib/trip-urgency";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { Search, X, ArrowRight } from "lucide-react";

const FILTERS = ["All", "Beaches", "Mountains", "Cities", "Forest", "Desert"];
const VIBE_MAP: Record<string, string> = {
  beaches: "beach",
  mountains: "mountain",
  cities: "city",
  forest: "forest",
  desert: "desert",
};

// Real preset buckets computed from actual trip start_date/max_members — not
// a calendar-range picker (bigger UI than a Tier-1 pass warrants) but still
// entirely derived from real data, never fabricated.
const DATE_BUCKETS: { id: DateBucket; label: string }[] = [
  { id: "any", label: "Any time" },
  { id: "this-month", label: "This month" },
  { id: "next-3-months", label: "Next 3 months" },
  { id: "later", label: "Later" },
];
const SIZE_BUCKETS: { id: SizeBucket; label: string }[] = [
  { id: "any", label: "Any size" },
  { id: "small", label: "Small · 2–4" },
  { id: "medium", label: "Medium · 5–8" },
  { id: "large", label: "Large · 9+" },
];

type Profile = { id: string; full_name: string; avatar_url: string | null; created_at?: string };

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — TRYB" }] }),
  component: Discover,
});

function Discover() {
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const reducedMotion = usePrefersReducedMotion();

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [dateBucket, setDateBucket] = useState<DateBucket>("any");
  const [sizeBucket, setSizeBucket] = useState<SizeBucket>("any");
  const [soloOnly, setSoloOnly] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  // Same real-data shape as Home (going count, organizer, member faces) —
  // fetched independently since Discover's needs (no momentum-irrelevant
  // fields) are simple enough that sharing the fetch itself isn't worth the
  // coupling; the *rendering* is shared via PlannedTripCard/trip-urgency.
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
        ? await supabase.from("trip_members").select("trip_id, user_id, status, joined_at").in("trip_id", tripIds)
        : { data: [] as any[] };

      const goingByTrip = new Map<string, number>();
      const approvedIdsByTrip = new Map<string, string[]>();
      const mostRecentJoinByTrip = new Map<string, string>();
      (memberRows ?? []).forEach((m: any) => {
        if (m.status === "approved") {
          goingByTrip.set(m.trip_id, (goingByTrip.get(m.trip_id) ?? 0) + 1);
          const list = approvedIdsByTrip.get(m.trip_id) ?? [];
          list.push(m.user_id);
          approvedIdsByTrip.set(m.trip_id, list);
          const prevMax = mostRecentJoinByTrip.get(m.trip_id);
          if (!prevMax || m.joined_at > prevMax) mostRecentJoinByTrip.set(m.trip_id, m.joined_at);
        }
      });

      const organizerIds = rawTrips.map((x) => x.organizer_id);
      const allProfileIds = Array.from(new Set([...organizerIds, ...(memberRows ?? []).map((m: any) => m.user_id)]));
      const { data: profs } = allProfileIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url, created_at").in("id", allProfileIds)
        : { data: [] as Profile[] };
      const profById = new Map((profs ?? []).map((p) => [p.id, p as Profile]));

      // Organizer trust stats — one batched query across every distinct
      // organizer in this result set (not per-card), so the grid doesn't
      // fire N+1 requests. Real trips-organized/completed counts, same
      // definition as Profile's own stats.
      const uniqueOrganizerIds = Array.from(new Set(organizerIds));
      const { data: organizerTrips } = uniqueOrganizerIds.length
        ? await supabase.from("trips").select("organizer_id, end_date").in("organizer_id", uniqueOrganizerIds)
        : { data: [] as { organizer_id: string; end_date: string }[] };
      const today = new Date().toISOString().slice(0, 10);
      const organizedCountById = new Map<string, number>();
      const completedCountById = new Map<string, number>();
      (organizerTrips ?? []).forEach((t: any) => {
        organizedCountById.set(t.organizer_id, (organizedCountById.get(t.organizer_id) ?? 0) + 1);
        if (t.end_date < today) completedCountById.set(t.organizer_id, (completedCountById.get(t.organizer_id) ?? 0) + 1);
      });

      const withGoing: Trip[] = rawTrips.map((tr) => {
        const faceIds = (approvedIdsByTrip.get(tr.id) ?? []).slice(0, 4);
        const organizerProfile = profById.get(tr.organizer_id);
        return {
          ...tr,
          organizer: organizerProfile && {
            ...organizerProfile,
            organizedCount: organizedCountById.get(tr.organizer_id) ?? 0,
            completedCount: completedCountById.get(tr.organizer_id) ?? 0,
          },
          going: goingByTrip.get(tr.id) ?? 0,
          memberFaces: faceIds.map((id) => profById.get(id)).filter(Boolean) as Profile[],
          mostRecentJoinAt: mostRecentJoinByTrip.get(tr.id) ?? null,
        };
      });

      setTrips(withGoing);
      setLoading(false);
    })();
  }, []);

  const destinationOptions = useMemo(() => deriveDestinationOptions(trips), [trips]);

  const filteredDest = useMemo(() => {
    let results = DESTINATIONS;
    if (filter !== "All") {
      const v = VIBE_MAP[filter.toLowerCase()] ?? filter.toLowerCase();
      results = results.filter((d) => d.vibe === v);
    }
    return results;
  }, [filter]);

  // Every axis combines with AND logic — destination, dates, group size,
  // vibe, and search text all narrow the same real trips list.
  const filteredTrips = useMemo(() => {
    let results = trips;
    if (selectedDestination) {
      results = results.filter((t) => t.destination === selectedDestination);
    }
    if (dateBucket !== "any") {
      results = results.filter((t) => tripDateBucket(t.start_date) === dateBucket);
    }
    if (sizeBucket !== "any") {
      results = results.filter((t) => tripSizeBucket(t.max_members) === sizeBucket);
    }
    if (soloOnly) {
      results = results.filter((t) => t.solo_friendly);
    }
    if (filter !== "All") {
      const v = VIBE_MAP[filter.toLowerCase()] ?? filter.toLowerCase();
      results = results.filter((t) => t.vibe_tags?.includes(v));
    }
    if (q.trim()) {
      const lower = q.trim().toLowerCase();
      results = results.filter(
        (t) =>
          t.destination?.toLowerCase().includes(lower) ||
          t.title?.toLowerCase().includes(lower) ||
          (t.country ?? "").toLowerCase().includes(lower),
      );
    }
    return results;
  }, [trips, selectedDestination, dateBucket, sizeBucket, soloOnly, filter, q]);

  const isFiltered = !!selectedDestination || dateBucket !== "any" || sizeBucket !== "any" || soloOnly || filter !== "All" || !!q.trim();

  const emptyMessage = q.trim()
    ? `No trips match "${q.trim()}" — start one?`
    : selectedDestination
      ? `No trips to ${selectedDestination} yet — start one?`
      : isFiltered
        ? "No trips match yet — start one?"
        : "New to traveling with people you haven't met yet? That's kind of the whole idea here — everyone on this list started as one person looking for their people.";

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <TopBar />
        <main className="mx-auto max-w-2xl px-5 pb-28 pt-2">
          <h1 className="fomo-heading text-ink text-3xl font-bold">Discover</h1>
          <p className="mt-1 text-sm text-ink/50">Real trips looking for people to join.</p>

          <div className="warm-card mt-4 flex items-center gap-2 rounded-full px-4 py-3.5">
            <Search className="h-4 w-4 shrink-0 text-ink/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search destinations…"
              className="flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink/40"
            />
            {q && (
              <button onClick={() => setQ("")} className="shrink-0 text-ink/40 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {!q && (
            <>
              {destinationOptions.length > 0 && (
                <div className="mt-4">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">Destination</p>
                  <DestinationChipRow
                    options={destinationOptions}
                    selected={selectedDestination}
                    onSelect={setSelectedDestination}
                  />
                </div>
              )}

              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">When</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {DATE_BUCKETS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setDateBucket(b.id)}
                      className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                        dateBucket === b.id ? "bg-primary text-cream" : "warm-card text-ink/60"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">Group size</p>
                <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {SIZE_BUCKETS.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => setSizeBucket(b.id)}
                      className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                        sizeBucket === b.id ? "bg-primary text-cream" : "warm-card text-ink/60"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">Traveling solo?</p>
                <button
                  onClick={() => setSoloOnly((v) => !v)}
                  className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    soloOnly ? "bg-primary text-cream" : "warm-card text-ink/60"
                  }`}
                >
                  🧍 Solo friendly only
                </button>
                <p className="mt-1.5 text-[11px] text-ink/40">
                  Solo-friendly just means the organizer's expecting people traveling alone — you (and they) still
                  choose who actually gets approved.
                </p>
                <p className="mt-1 text-[11px] text-ink/40">
                  We only ever show what you choose to share — your exact location and contact info stay private
                  until you're approved into a trip.
                </p>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">Vibe</p>
                <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {FILTERS.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`flex-shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        filter === f ? "bg-primary text-cream" : "warm-card text-ink/60"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <section className="mt-6">
            <h2 className="fomo-heading text-ink mb-3 text-lg font-semibold">
              {q ? `Results for "${q}"` : "Open to join"}
            </h2>
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="skeleton-fomo aspect-[3/4] rounded-3xl" />
                ))}
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-ink/50">{emptyMessage}</p>
                <Link
                  to="/create"
                  className="bg-primary text-cream mt-4 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                >
                  Start a trip <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {filteredTrips.map((trip, i) => (
                  <PlannedTripCard
                    key={trip.id}
                    trip={trip}
                    index={i}
                    featured={false}
                    tier={sizeTier(trip)}
                    reducedMotion={reducedMotion}
                    showOrganizer
                  />
                ))}
              </div>
            )}
          </section>

          {!q && (
            <section className="mt-8">
              <h2 className="fomo-heading text-ink mb-1 text-lg font-semibold">Explore destinations</h2>
              <p className="mb-3 text-xs text-ink/40">For inspiration — start your own trip to one of these.</p>
              {filteredDest.length === 0 ? (
                <p className="text-sm text-ink/50">No destinations match this filter.</p>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {filteredDest.map((d) => (
                    <div key={d.slug} className="shadow-warm relative h-48 w-64 flex-shrink-0 overflow-hidden rounded-3xl">
                      <img src={d.image} alt={d.name} className="absolute inset-0 h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute inset-x-0 bottom-0 p-4">
                        <p className="fomo-heading text-xl font-bold text-white">
                          {d.flag} {d.name}
                        </p>
                        <p className="text-xs text-white/70">{d.country}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
