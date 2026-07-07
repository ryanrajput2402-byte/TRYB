import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { findDestination } from "@/lib/destinations";
import { getSuggestedItinerary, getPlanningInsight } from "@/lib/destination-itinerary";
import { formatCompactRange } from "@/lib/format-date";
import { ArrowLeft, ArrowRight, MapPin, Wallet, Sparkles, Users } from "lucide-react";

type RealTrip = {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  budget_min: number | null;
  budget_max: number | null;
  max_members: number;
  going: number;
};

export const Route = createFileRoute("/_authenticated/destination/$slug")({
  head: () => ({ meta: [{ title: "Destination — TRYB" }] }),
  component: DestinationPage,
});

function DestinationPage() {
  const { slug } = Route.useParams();
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const destination = findDestination(slug);

  const [realTrips, setRealTrips] = useState<RealTrip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!destination) return;
    let cancelled = false;
    (async () => {
      const { data: trips } = await supabase
        .from("trips")
        .select("id, title, start_date, end_date, budget_min, budget_max, max_members")
        .eq("destination", destination.name)
        .eq("privacy", "public")
        .order("start_date", { ascending: true });

      const today = new Date().toISOString().slice(0, 10);
      const upcoming = (trips ?? []).filter((t) => t.end_date >= today);
      const tripIds = upcoming.map((t) => t.id);
      const { data: memberRows } = tripIds.length
        ? await supabase.from("trip_members").select("trip_id").eq("status", "approved").in("trip_id", tripIds)
        : { data: [] as { trip_id: string }[] };
      const goingByTrip = new Map<string, number>();
      (memberRows ?? []).forEach((m) => goingByTrip.set(m.trip_id, (goingByTrip.get(m.trip_id) ?? 0) + 1));

      if (!cancelled) {
        setRealTrips(upcoming.map((t) => ({ ...t, going: goingByTrip.get(t.id) ?? 0 })));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [destination?.name]);

  if (!destination) {
    return (
      <div className={`${themeClassName} relative flex min-h-screen flex-col items-center justify-center bg-sand px-6 text-center`}>
        <p className="text-ink/60 text-sm">Destination not found.</p>
        <Link to="/home" className="text-primary mt-3 text-sm font-semibold">
          Back to Home
        </Link>
      </div>
    );
  }

  // Real cost breakup — only computed from actual trips.budget_min/max to
  // this destination, never invented. No trips with budget data yet means
  // no number is shown, not a guessed one.
  const withBudget = realTrips.filter((t) => t.budget_min != null && t.budget_max != null);
  const costBreakup =
    withBudget.length > 0
      ? {
          min: Math.round(withBudget.reduce((s, t) => s + t.budget_min! / t.max_members, 0) / withBudget.length),
          max: Math.round(withBudget.reduce((s, t) => s + t.budget_max! / t.max_members, 0) / withBudget.length),
          sampleSize: withBudget.length,
        }
      : null;

  const itinerary = getSuggestedItinerary(destination.vibe);
  const insight = getPlanningInsight(destination.vibe);

  return (
    <div className={`${themeClassName} relative min-h-screen bg-sand`}>
      <div className="warm-aurora" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <TopBar />
        <main className="mx-auto max-w-3xl pb-28">
          <div className="relative aspect-[16/10] w-full sm:aspect-[21/9]">
            <img src={destination.image} alt={destination.name} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
            <Link
              to="/home"
              className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md"
              aria-label="Back to Home"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
              <h1 className="fomo-heading flex items-center gap-2 text-3xl font-bold text-white drop-shadow sm:text-4xl">
                <span>{destination.flag}</span> {destination.name}
              </h1>
              <p className="mt-1 flex items-center gap-1 text-sm text-white/80">
                <MapPin className="h-3.5 w-3.5" /> {destination.country} · {destination.whyNow}
              </p>
            </div>
          </div>

          <div className="px-5 pt-6 sm:px-8">
            <section>
              <h2 className="fomo-heading text-ink text-lg font-bold">Suggested itinerary</h2>
              <div className="mt-3 space-y-3">
                {itinerary.map((day) => (
                  <div key={day.title} className="warm-card rounded-2xl p-4">
                    <p className="text-sm font-semibold text-ink">{day.title}</p>
                    <p className="mt-0.5 text-sm text-ink/60">{day.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-8">
              <h2 className="fomo-heading text-ink flex items-center gap-2 text-lg font-bold">
                <Wallet className="h-4 w-4" /> Cost breakup
              </h2>
              {loading ? (
                <div className="skeleton-fomo mt-3 h-16 rounded-2xl" />
              ) : costBreakup ? (
                <div className="warm-card mt-3 rounded-2xl p-4">
                  <p className="fomo-heading text-2xl font-bold text-ink">
                    ~₹{costBreakup.min.toLocaleString("en-IN")}–{costBreakup.max.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-ink/50"> /person</span>
                  </p>
                  <p className="mt-1 text-xs text-ink/50">
                    Based on {costBreakup.sampleSize} real {costBreakup.sampleSize === 1 ? "trip" : "trips"} planned to {destination.name}
                  </p>
                </div>
              ) : (
                <p className="warm-card mt-3 rounded-2xl p-4 text-sm text-ink/50">
                  No cost data yet for {destination.name} — be the first to plan a trip here.
                </p>
              )}
            </section>

            <section className="mt-8">
              <h2 className="fomo-heading text-ink flex items-center gap-2 text-lg font-bold">
                <Sparkles className="h-4 w-4" /> Planning insight
              </h2>
              <p className="warm-card mt-3 rounded-2xl p-4 text-sm text-ink/70">{insight}</p>
            </section>

            <section className="mt-8">
              {loading ? (
                <div className="skeleton-fomo h-20 rounded-2xl" />
              ) : realTrips.length > 0 ? (
                <>
                  <h2 className="fomo-heading text-ink flex items-center gap-2 text-lg font-bold">
                    <Users className="h-4 w-4" /> Real groups planning {destination.name}
                  </h2>
                  <div className="mt-3 space-y-2">
                    {realTrips.slice(0, 3).map((t) => (
                      <Link
                        key={t.id}
                        to="/trip/$tripId"
                        params={{ tripId: t.id }}
                        className="warm-card flex items-center justify-between rounded-2xl p-4 hover:bg-ink/5"
                      >
                        <div>
                          <p className="text-sm font-semibold text-ink">{t.title}</p>
                          <p className="text-xs text-ink/50">
                            {formatCompactRange(t.start_date, t.end_date)} · {t.going} going
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 flex-shrink-0 text-ink/40" />
                      </Link>
                    ))}
                  </div>
                </>
              ) : (
                <div className="warm-card rounded-2xl p-5 text-center">
                  <p className="text-sm text-ink/60">No real group for {destination.name} yet — start one?</p>
                </div>
              )}
              <Link
                to="/create"
                search={{ destination: destination.slug }}
                className="bg-primary text-cream mt-4 flex items-center justify-center gap-2 rounded-full py-3.5 text-center font-semibold"
              >
                Create a group for {destination.name} <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
