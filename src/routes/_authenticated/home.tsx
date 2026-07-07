import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { TravelQuoteWidget } from "@/components/travel-quote-widget";
import { HomeMasthead } from "@/components/home-masthead";
import { DestinationMasonry } from "@/components/destination-masonry";
import { GroupsHighlightStrip, HighlightTrip } from "@/components/groups-highlight-strip";
import { ProjectsEntryCard } from "@/components/projects-entry-card";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useInView } from "@/lib/use-in-view";
import { DESTINATIONS, getTimeRelevantDestinations } from "@/lib/destinations";
import { pluralize } from "@/lib/format-date";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { TripCardData as Trip } from "@/lib/trip-urgency";
import { CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

const VIBE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "beach", label: "🏖️ Beach" },
  { id: "mountain", label: "⛰️ Mountain" },
  { id: "city", label: "🏙️ City" },
  { id: "forest", label: "🌲 Forest" },
  { id: "desert", label: "🏜️ Desert" },
];

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "TRYB — Home" }] }),
  component: HomeFeed,
});

// Phase 2 — Home rebuilt as a content-discovery page (Pinterest/Airbnb
// structure): a photographic masthead + a masonry grid of time-relevant
// destinations carry the page, with Groups/your-trips condensed to a
// highlight strip and a Projects/mission entry point below. Distinct from
// Discover, which stays a dense trip-matching utility (search + filters +
// a uniform trip-results grid).
function HomeFeed() {
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const reducedMotion = usePrefersReducedMotion();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [myTrips, setMyTrips] = useState<HighlightTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [livePlanners, setLivePlanners] = useState(0);
  const [vibeFilter, setVibeFilter] = useState("all");
  const tripIndexRef = useRef<Map<string, Trip>>(new Map());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: p }, { data: t }, { data: myMemberships }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", u.user.id).maybeSingle(),
        supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("trip_members").select("trip_id").eq("user_id", u.user.id).eq("status", "approved"),
      ]);
      if (cancelled) return;
      setProfile(p as Profile | null);

      const rawTrips = (t ?? []) as any[];
      const tripIds = rawTrips.map((x) => x.id);

      const { data: memberRows } = tripIds.length
        ? await supabase.from("trip_members").select("trip_id, user_id, status, joined_at").in("trip_id", tripIds)
        : { data: [] as any[] };

      const goingByTrip = new Map<string, number>();
      const approvedIdsByTrip = new Map<string, string[]>();
      const mostRecentJoinByTrip = new Map<string, string>();
      const distinctPlanners = new Set<string>();
      (memberRows ?? []).forEach((m: any) => {
        distinctPlanners.add(m.user_id);
        if (m.status === "approved") {
          goingByTrip.set(m.trip_id, (goingByTrip.get(m.trip_id) ?? 0) + 1);
          const list = approvedIdsByTrip.get(m.trip_id) ?? [];
          list.push(m.user_id);
          approvedIdsByTrip.set(m.trip_id, list);
          const prevMax = mostRecentJoinByTrip.get(m.trip_id);
          if (!prevMax || m.joined_at > prevMax) mostRecentJoinByTrip.set(m.trip_id, m.joined_at);
        }
      });
      setLivePlanners(distinctPlanners.size);

      const organizerIds = rawTrips.map((x) => x.organizer_id);
      const allProfileIds = Array.from(new Set([...organizerIds, ...(memberRows ?? []).map((m: any) => m.user_id)]));
      const { data: profs } = allProfileIds.length
        ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", allProfileIds)
        : { data: [] as Profile[] };
      const profById = new Map((profs ?? []).map((pr) => [pr.id, pr as Profile]));

      const today = new Date().toISOString().slice(0, 10);
      const withGoing: Trip[] = rawTrips.map((tr) => {
        const faceIds = (approvedIdsByTrip.get(tr.id) ?? []).slice(0, 4);
        return {
          ...tr,
          organizer: profById.get(tr.organizer_id),
          going: goingByTrip.get(tr.id) ?? 0,
          memberFaces: faceIds.map((id) => profById.get(id)).filter(Boolean) as Profile[],
          mostRecentJoinAt: mostRecentJoinByTrip.get(tr.id) ?? null,
        };
      });

      tripIndexRef.current = new Map(withGoing.map((tr) => [tr.id, tr]));
      setTrips(withGoing.filter((tr) => tr.end_date >= today));
      setCompletedTrips(withGoing.filter((tr) => tr.end_date < today));

      // Highlight strip — cross-reference this user's approved memberships
      // against the trips already fetched above (RLS already scopes that
      // fetch to public trips + trips this user organizes/belongs to, so no
      // second trips query is needed).
      const myTripIds = new Set((myMemberships ?? []).map((m: any) => m.trip_id));
      const byId = new Map(withGoing.map((tr) => [tr.id, tr]));
      const mine = Array.from(myTripIds)
        .map((id) => byId.get(id as string))
        .filter((tr): tr is Trip => !!tr && tr.end_date >= today)
        .sort((a, b) => a.start_date.localeCompare(b.start_date))
        .slice(0, 8)
        .map((tr) => ({ id: tr.id, destination: tr.destination, cover_image: tr.cover_image, start_date: tr.start_date, end_date: tr.end_date }));
      setMyTrips(mine);

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Honest "someone just joined" toast, riding the trip_members realtime
  // publication that already exists for the join-approval flow.
  useEffect(() => {
    const channel = supabase
      .channel("home-feed-joins")
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_members" }, async (payload) => {
        const row = (payload.new ?? null) as any;
        if (!row || row.status !== "approved") return;
        if (payload.eventType === "UPDATE" && (payload.old as any)?.status === "approved") return;
        const trip = tripIndexRef.current.get(row.trip_id);
        if (!trip) return;
        const { data: joiner } = await supabase.from("profiles").select("full_name").eq("id", row.user_id).maybeSingle();
        const firstName = joiner?.full_name?.split(" ")[0] ?? "Someone";
        toast(`${firstName} just joined ${trip.destination}`);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const timeRelevantDestinations = useMemo(() => getTimeRelevantDestinations(), []);
  const filteredDestinations = useMemo(
    () => (vibeFilter === "all" ? timeRelevantDestinations : timeRelevantDestinations.filter((d) => d.vibe === vibeFilter)),
    [timeRelevantDestinations, vibeFilter],
  );

  const recentlyWrapped = completedTrips.slice(0, 3);

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <TopBar avatarUrl={profile?.avatar_url} name={profile?.full_name} tagline />

        <main className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
          <HomeMasthead />

          <section className="mt-8 lg:flex lg:items-start lg:gap-6">
            <div className="lg:min-w-0 lg:flex-1">
              <div className="flex items-center justify-between gap-3">
                <h2 className="fomo-heading text-ink text-lg font-bold">Where to go right now</h2>
              </div>
              <p className="mt-1 text-xs text-ink/45">
                Picked for the season — real destinations, real reasons to go now.
              </p>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {VIBE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setVibeFilter(f.id)}
                    aria-pressed={vibeFilter === f.id}
                    className={`flex-shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                      vibeFilter === f.id ? "bg-primary text-cream" : "warm-card text-ink/70"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <DestinationMasonry destinations={filteredDestinations} />
              </div>
            </div>
            <TravelQuoteWidget />
          </section>

          {/* Section C, line 1 — count is always the real number of
              destinations actually rendered above, never hardcoded. */}
          {filteredDestinations.length > 0 && (
            <p className="fomo-heading text-ink/70 mx-auto mt-10 max-w-md text-center text-xl font-semibold leading-snug sm:text-2xl">
              You scrolled past {filteredDestinations.length} {pluralize(filteredDestinations.length, "place")} just now.
              Which one did you stop on?
            </p>
          )}

          <div className="mt-10">
            <GroupsHighlightStrip trips={myTrips} livePlanners={livePlanners} />
          </div>

          {/* Section C, line 2 — same livePlanners count already computed
              above and already reused by the highlight strip's eyebrow. */}
          <p className="mt-10 text-center text-sm font-medium text-ink/50">
            <span className="text-ink font-bold">{livePlanners}</span>{" "}
            {livePlanners === 1 ? "person is" : "people are"} already planning. You're not early — you're just
            not in yet.
          </p>

          <div className="mt-10">
            <ProjectsEntryCard />
          </div>

          {!loading && recentlyWrapped.length > 0 && <RecentlyWrapped trips={recentlyWrapped} />}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

function RecentlyWrapped({ trips }: { trips: Trip[] }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`mt-10 ${inView ? "reveal-shown" : "reveal-hidden"}`}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className="fomo-heading text-sm font-bold uppercase tracking-wider text-ink/60">Recently wrapped</h2>
        <div className="bg-ink/10 h-px flex-1" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {trips.map((trip) => (
          <CompletedTripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </div>
  );
}

function CompletedTripCard({ trip }: { trip: Trip }) {
  const cover = trip.cover_image ?? DESTINATIONS[0].image;
  const dateRange = format(new Date(trip.start_date), "MMM yyyy");
  return (
    <Link
      to="/trip/$tripId"
      params={{ tripId: trip.id }}
      className="focus-visible:ring-primary animate-fade-up block rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className="shadow-warm group relative aspect-[3/4] overflow-hidden rounded-3xl transition duration-300 hover:-translate-y-1">
        <img src={cover} alt={trip.destination} loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale-[15%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="bg-teal/90 absolute left-3 top-3 flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold text-black">
          <CheckCircle2 className="h-3 w-3" /> Trip completed
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="fomo-heading text-xl font-bold leading-tight text-white drop-shadow">{trip.destination}</h3>
          <p className="mt-0.5 text-xs text-white/70">{dateRange}</p>
          <p className="mt-2 text-[11px] font-medium text-white/90">
            {trip.going} {pluralize(trip.going, "person", "people")} went — plans became a real trip
          </p>
        </div>
      </div>
    </Link>
  );
}
