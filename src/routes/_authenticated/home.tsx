import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { CountUp } from "@/components/count-up";
import { PlannedTripCard } from "@/components/planned-trip-card";
import { DestinationChipRow } from "@/components/destination-chips";
import { usePrefersReducedMotion } from "@/lib/use-reduced-motion";
import { useInView } from "@/lib/use-in-view";
import { DESTINATIONS } from "@/lib/destinations";
import { pluralize, formatCompactRange } from "@/lib/format-date";
import { trackEvent } from "@/lib/analytics";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName, THEME_PICKER_DISMISSED_KEY } from "@/lib/seasonal-themes";
import { ThemePickerModal } from "@/components/theme-picker-modal";
import { TripCardData as Trip, urgencyRatio, sizeTier, deriveDestinationOptions } from "@/lib/trip-urgency";
import { Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({ meta: [{ title: "TRYB — Home" }] }),
  component: HomeFeed,
});

function HomeFeed() {
  const { preference: themePreference, loading: themeLoading, choose: chooseTheme } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const [pickerDismissed, setPickerDismissed] = useState(
    () => typeof window !== "undefined" && window.sessionStorage.getItem(THEME_PICKER_DISMISSED_KEY) === "1",
  );
  // First-login prompt lives here (the true landing screen after auth), not
  // per-screen — it's gated purely on theme_preference being null, so it
  // shows once regardless of which screen a given session starts asking on.
  const showThemePicker = !themeLoading && themePreference === null && !pickerDismissed;
  function dismissThemePicker() {
    setPickerDismissed(true);
    window.sessionStorage.setItem(THEME_PICKER_DISMISSED_KEY, "1");
  }

  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [completedTrips, setCompletedTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [livePlanners, setLivePlanners] = useState(0);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [condensed, setCondensed] = useState(false);
  const tripIndexRef = useRef<Map<string, Trip>>(new Map());
  const reducedMotion = usePrefersReducedMotion();

  // TopBar is a shared component (not modified here) and is itself `sticky
  // top-0` with a higher z-index — measuring its real rendered height (rather
  // than guessing a fixed value) is what lets the condensed header stack
  // visually below it instead of being hidden underneath at the same offset.
  const topBarWrapperRef = useRef<HTMLDivElement | null>(null);
  const [topBarHeight, setTopBarHeight] = useState(72);
  useEffect(() => {
    const el = topBarWrapperRef.current;
    if (!el) return;
    const measure = () => setTopBarHeight(el.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: p }, { data: t }, { data: sv }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", u.user.id).maybeSingle(),
        supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(40),
        supabase.from("saved_trips").select("trip_id").eq("user_id", u.user.id),
      ]);
      setProfile(p as Profile | null);
      setSaved(new Set((sv ?? []).map((r: any) => r.trip_id)));

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
      setLoading(false);
    })();
  }, []);

  // Item 10: honest "someone just joined" toast, riding the trip_members
  // Realtime publication that already exists (enabled for the join-approval
  // flow) — no new backend, just a second frontend subscriber to it.
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
        setTrips((prev) => prev.map((t) => (t.id === row.trip_id ? { ...t, going: t.going + 1 } : t)));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Item 21: sticky condensing header on scroll.
  useEffect(() => {
    function onScroll() {
      setCondensed(window.scrollY > 220);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleSave = useCallback(
    async (tripId: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const isSaved = saved.has(tripId);
      trackEvent({ name: "save_tapped", tripId, saved: !isSaved });
      setSaved((s) => {
        const n = new Set(s);
        isSaved ? n.delete(tripId) : n.add(tripId);
        return n;
      });
      if (!isSaved) {
        setJustSavedId(tripId);
        setTimeout(() => setJustSavedId((cur) => (cur === tripId ? null : cur)), 400);
      }
      if (isSaved) {
        await supabase.from("saved_trips").delete().eq("trip_id", tripId).eq("user_id", u.user.id);
      } else {
        await supabase.from("saved_trips").insert({ trip_id: tripId });
      }
    },
    [saved],
  );

  // Destination filter pills — derived entirely from real trips, never a fixed list.
  const destinationOptions = useMemo(() => deriveDestinationOptions(trips), [trips]);

  const filteredTrips = useMemo(
    () => (selectedDestination ? trips.filter((t) => t.destination === selectedDestination) : trips),
    [trips, selectedDestination],
  );

  // Urgency picks the hero slot; everything else keeps its existing order behind it.
  const orderedTrips = useMemo(() => {
    if (!filteredTrips.length) return filteredTrips;
    const featured = [...filteredTrips].sort((a, b) => urgencyRatio(a) - urgencyRatio(b))[0];
    return [featured, ...filteredTrips.filter((t) => t.id !== featured.id)];
  }, [filteredTrips]);

  const isSparse = trips.length < 4;
  const recentlyWrapped = selectedDestination ? [] : completedTrips.slice(0, 3);

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <div ref={topBarWrapperRef}>
          <TopBar avatarUrl={profile?.avatar_url} name={profile?.full_name} />
        </div>

        {/* Item 21/29: sticky condensing header — a compact frosted-glass live-counter bar */}
        <div
          className={`warm-card sticky z-20 mx-auto flex max-w-7xl items-center gap-2 overflow-hidden border-0 border-b border-ink/8 px-4 transition-[max-height,opacity,padding] duration-300 sm:px-6 lg:px-8 ${
            condensed ? "max-h-14 py-2.5 opacity-100" : "max-h-0 py-0 opacity-0"
          }`}
          style={{ top: topBarHeight }}
          aria-hidden={!condensed}
        >
          <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
            <span className="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full" />
          </span>
          <p className="fomo-heading truncate text-sm font-bold text-ink">
            <span className="text-gradient-earth">{livePlanners}</span> planning trips right now
          </p>
        </div>

        <main className="mx-auto max-w-7xl px-4 pb-10 pt-3 sm:px-6 lg:px-8">
          <section className="pb-5 pt-2">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className={`bg-primary absolute inline-flex h-full w-full rounded-full opacity-75 ${reducedMotion ? "" : "animate-breathe"}`} />
                <span className="bg-primary relative inline-flex h-2.5 w-2.5 rounded-full" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">Live right now</p>
              {isSparse && (
                <span className="warm-card ml-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium text-ink/70">
                  🌱 You're early
                </span>
              )}
            </div>
            {livePlanners > 0 ? (
              <h1 className="fomo-heading mt-2">
                <span className="text-gradient-earth block text-7xl font-bold leading-none sm:text-8xl lg:text-9xl">
                  <CountUp value={livePlanners} />
                </span>
                <span className="mt-1.5 block text-2xl font-bold text-ink sm:text-3xl">
                  {livePlanners === 1 ? "person is" : "people are"} planning trips right now
                </span>
              </h1>
            ) : (
              <h1 className="fomo-heading text-gradient-earth mt-2 text-4xl font-bold leading-[1.05] sm:text-5xl">
                Trips are being planned right now
              </h1>
            )}
            <p className="mt-3 text-sm font-light text-ink/50 sm:text-base">Somewhere out there, your next trip is already taking shape.</p>
          </section>

          {destinationOptions.length > 0 && (
            <section aria-label="Filter by destination" className="pb-2">
              <DestinationChipRow
                options={destinationOptions}
                selected={selectedDestination}
                onSelect={(next) => {
                  setSelectedDestination(next);
                  trackEvent({ name: "filter_used", destination: next });
                }}
              />
            </section>
          )}

          {/* Item 19: labeled section + divider — only rendered because real content exists */}
          {!loading && orderedTrips.length > 0 && (
            <div className="mb-3 mt-4 flex items-center gap-3">
              <h2 className="fomo-heading text-sm font-bold uppercase tracking-wider text-ink/60">Planning now</h2>
              <div className="bg-ink/10 h-px flex-1" />
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-3 lg:grid-cols-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="skeleton-fomo aspect-[3/4] rounded-3xl" />
              ))}
            </div>
          ) : orderedTrips.length === 0 ? (
            <AspirationalEmpty realTrips={trips} filtered={!!selectedDestination} destinationName={selectedDestination} />
          ) : (
            // Item 23: keying by filter remounts the grid, replaying the stagger
            // entrance instead of a hard snap when the destination filter changes.
            <div key={selectedDestination ?? "all"} className="grid grid-cols-2 gap-4 pt-2 md:grid-cols-3 lg:grid-cols-4">
              {orderedTrips.map((trip, i) => (
                <PlannedTripCard
                  key={trip.id}
                  trip={trip}
                  index={i}
                  featured={i === 0}
                  tier={i === 0 ? "large" : sizeTier(trip)}
                  saved={saved.has(trip.id)}
                  justSaved={justSavedId === trip.id}
                  onSave={() => toggleSave(trip.id)}
                  reducedMotion={reducedMotion}
                />
              ))}
            </div>
          )}

          {!loading && isSparse && !selectedDestination && <AspirationalPanel realTripCount={trips.length} />}

          {/* Item 19: "Recently wrapped" — only rendered when real completed trips exist */}
          {!loading && recentlyWrapped.length > 0 && (
            <RecentlyWrapped trips={recentlyWrapped} />
          )}
        </main>
        <BottomNav />
      </div>

      {showThemePicker && <ThemePickerModal onChoose={chooseTheme} onDismiss={dismissThemePicker} />}
    </div>
  );
}

function RecentlyWrapped({ trips }: { trips: Trip[] }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={inView ? "reveal-shown" : "reveal-hidden"}>
      <div className="mb-3 mt-10 flex items-center gap-3">
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

function AspirationalEmpty({
  realTrips,
  filtered,
  destinationName,
}: {
  realTrips: Trip[];
  filtered: boolean;
  destinationName: string | null;
}) {
  // Item 30: refined empty-filter state — always a converting CTA, never a dead blank.
  if (filtered) {
    return (
      <div className="mx-auto mt-8 max-w-md px-6 text-center">
        <p className="text-sm text-ink/60">No trips to {destinationName} yet — start one?</p>
        <Link to="/create" className="bg-primary text-cream mt-4 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold">
          Start a trip <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }
  return (
    <div className="mx-auto mt-8 max-w-xl px-6 text-center">
      <div className="hero-glow-warm warm-card mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full">
        <Sparkles className="text-primary h-10 w-10" />
      </div>
      <h3 className="fomo-heading text-ink text-2xl font-bold">You're early — and that's the exciting part</h3>
      <p className="mt-2 text-sm text-ink/60">
        {realTrips.length === 0
          ? "No trips are live yet. Be the one who starts it — the first pin on the map."
          : "A few trips are already taking shape. Yours could be next."}
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link to="/create" className="bg-primary text-cream inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold">
          Start a trip <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/discover" className="warm-card text-ink inline-flex items-center justify-center rounded-full px-6 py-3 font-medium">
          Discover
        </Link>
      </div>
    </div>
  );
}

function AspirationalPanel({ realTripCount }: { realTripCount: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`warm-card hero-glow-warm mt-8 rounded-3xl p-6 text-center sm:p-10 ${inView ? "reveal-shown" : "reveal-hidden"}`}
    >
      <h3 className="fomo-heading text-ink text-xl font-bold sm:text-2xl">
        {realTripCount === 0 ? "Nobody's planning yet — you could be first" : "This is just the beginning"}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/60">
        Every big trip started as one person's idea. Start yours and watch people show up.
      </p>
      <Link to="/create" className="bg-primary text-cream mt-5 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold">
        Start a trip <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
