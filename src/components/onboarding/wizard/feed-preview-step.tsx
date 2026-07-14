import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TripCard } from "@/components/tryb/trip-card";
import { FadeIn } from "@/components/tryb/motion-primitives";
import { Eyebrow } from "@/components/tryb/ui-kit";
import { urgencyRatio, type TripCardData, type TripCardProfile } from "@/lib/trip-urgency";
import { FEED_FALLBACK_MIN_TRIPS } from "@/lib/onboarding-config";
import { trackEvent } from "@/lib/analytics";

type Vibe = "beach" | "mountain";

// The wizard's actual payoff — Step 4 of the original Cinematic Opener plan,
// now personalized by the real signals the wizard just collected (vibe +
// tags) instead of a specific destination, since destination-pick was
// removed from this flow. "You told us X, here's X" — never a profile ask,
// just real trips that match what was just answered.
export function FeedPreviewStep({
  vibe,
  tags,
  onSkip,
}: {
  vibe: Vibe;
  tags: string[];
  onSkip: () => void;
}) {
  const [trips, setTrips] = useState<TripCardData[] | null>(null);
  const [fallbackWidened, setFallbackWidened] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [firedView, setFiredView] = useState(false);

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
        ? await supabase
            .from("trip_members")
            .select("trip_id, user_id, status")
            .in("trip_id", tripIds)
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
      const allProfileIds = Array.from(
        new Set([...organizerIds, ...(memberRows ?? []).map((m: any) => m.user_id)]),
      );
      const { data: profs } = allProfileIds.length
        ? await supabase
            .from("profiles")
            .select("id, full_name, avatar_url")
            .in("id", allProfileIds)
        : { data: [] as TripCardProfile[] };
      const profById = new Map((profs ?? []).map((p) => [p.id, p as TripCardProfile]));

      const withGoing: TripCardData[] = rawTrips.map((tr) => {
        const faceIds = (approvedIdsByTrip.get(tr.id) ?? []).slice(0, 4);
        return {
          ...tr,
          organizer: profById.get(tr.organizer_id),
          going: goingByTrip.get(tr.id) ?? 0,
          memberFaces: faceIds.map((id) => profById.get(id)).filter(Boolean) as TripCardProfile[],
          mostRecentJoinAt: null,
        };
      });

      // Real match score only — vibe + tag overlap against the trip's own
      // vibe_tags, both real columns. No fabricated relevance number.
      const scored = withGoing
        .map((trip) => {
          const tripVibes = new Set(trip.vibe_tags ?? []);
          let score = 0;
          if (tripVibes.has(vibe)) score += 2;
          score += tags.filter((tag) => tripVibes.has(tag)).length;
          return { trip, score };
        })
        .sort((a, b) => b.score - a.score || urgencyRatio(a.trip) - urgencyRatio(b.trip));

      const matched = scored.filter((s) => s.score > 0).map((s) => s.trip);

      if (matched.length >= FEED_FALLBACK_MIN_TRIPS || matched.length === withGoing.length) {
        setTrips(matched);
        setFallbackWidened(false);
      } else {
        // Honest widening — matched trips first, then the most-active real
        // trips fill the rest. Never fabricated to hit the floor.
        const matchedIds = new Set(matched.map((t) => t.id));
        const rest = withGoing
          .filter((t) => !matchedIds.has(t.id))
          .sort((a, b) => urgencyRatio(a) - urgencyRatio(b));
        setTrips([...matched, ...rest]);
        setFallbackWidened(matched.length > 0 && rest.length > 0);
      }
    })();
  }, [vibe, tags]);

  useEffect(() => {
    if (trips === null || firedView) return;
    setFiredView(true);
    trackEvent({
      name: "onboarding_feed_view",
      vibe,
      realTripCount: trips.length,
      fallbackWidened,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, firedView]);

  function toggleSave(id: string) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // TripCard's own Link handles the actual navigation — this only records
  // the funnel event alongside it.
  function trackOpenTrip(tripId: string) {
    trackEvent({ name: "onboarding_trip_opened", tripId });
  }

  if (trips === null) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <button
        type="button"
        onClick={onSkip}
        className="absolute right-4 top-4 z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-sm font-medium text-muted-foreground transition hover:text-foreground sm:right-6 sm:top-6"
      >
        Skip
      </button>

      <div className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center px-6 py-20">
        <FadeIn>
          <Eyebrow>Made for you</Eyebrow>
          <h1 className="display mt-2 text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl">
            You told us. Here's what fits.
          </h1>
        </FadeIn>

        {trips.length === 0 ? (
          <FadeIn
            delay={0.1}
            className="mt-10 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-14 text-center"
          >
            <p className="display text-xl font-semibold text-foreground">
              Nobody's mapped a trip yet.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Be the one who does — takes about a minute.
            </p>
            <a
              href="/create"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
            >
              Start a trip <ArrowRight className="size-4" />
            </a>
          </FadeIn>
        ) : (
          <>
            {fallbackWidened && (
              <FadeIn delay={0.08}>
                <p className="mt-8 text-sm text-muted-foreground">
                  More trips travelers are joining now.
                </p>
              </FadeIn>
            )}
            <FadeIn delay={0.1} className={fallbackWidened ? "mt-3" : "mt-10"}>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {trips.slice(0, 8).map((trip) => (
                  <motion.div
                    key={trip.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClickCapture={() => trackOpenTrip(trip.id)}
                  >
                    <TripCard
                      trip={trip}
                      saved={saved.has(trip.id)}
                      onToggleSave={() => toggleSave(trip.id)}
                    />
                  </motion.div>
                ))}
              </div>
            </FadeIn>
          </>
        )}
      </div>
    </div>
  );
}
