import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TripCardData as Trip, urgencyRatio } from "@/lib/trip-urgency";
import { trackEvent } from "@/lib/analytics";
import { HomeHero } from "@/components/tryb/home-hero";
import { TripCard } from "@/components/tryb/trip-card";
import { Feed } from "@/components/tryb/feed";
import { Dock } from "@/components/tryb/dock";
import { Eyebrow } from "@/components/tryb/ui-kit";
import { FadeIn } from "@/components/tryb/motion-primitives";

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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const tripIndexRef = useRef<Map<string, Trip>>(new Map());

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
      setLoading(false);
    })();
  }, []);

  // Honest "someone just joined" toast, riding the trip_members Realtime
  // publication already enabled for the join-approval flow.
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
      if (isSaved) {
        await supabase.from("saved_trips").delete().eq("trip_id", tripId).eq("user_id", u.user.id);
      } else {
        await supabase.from("saved_trips").insert({ trip_id: tripId });
      }
    },
    [saved],
  );

  // Most-urgent-first, same ordering Discover/Home have always used.
  const orderedTrips = useMemo(() => [...trips].sort((a, b) => urgencyRatio(a) - urgencyRatio(b)).slice(0, 10), [trips]);

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-32 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      <HomeHero avatarUrl={profile?.avatar_url} />

      {/* Curated trips rail */}
      <section className="pt-10">
        <div className="flex items-end justify-between px-5">
          <div>
            <Eyebrow>Leaving soon</Eyebrow>
            <h2 className="display mt-1.5 text-3xl font-semibold">This week on TRYB</h2>
          </div>
          <Link
            to="/discover"
            className="flex items-center gap-1 text-sm font-medium text-primary transition-opacity hover:opacity-70"
          >
            All trips <ArrowRight className="size-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-5 flex gap-4 overflow-hidden px-5 pb-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton aspect-[4/5] w-[268px] shrink-0 rounded-3xl" />
            ))}
          </div>
        ) : orderedTrips.length === 0 ? (
          <div className="mx-5 mt-5 rounded-3xl border border-dashed border-border bg-card/50 px-6 py-10 text-center">
            <p className="text-sm text-muted-foreground">No trips are live yet — start one?</p>
            <Link
              to="/create"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Start a trip <ArrowRight className="size-4" />
            </Link>
          </div>
        ) : (
          <div className="no-scrollbar mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2">
            {orderedTrips.map((trip) => (
              <div key={trip.id} className="w-[268px] shrink-0 snap-start">
                <TripCard trip={trip} saved={saved.has(trip.id)} onToggleSave={() => toggleSave(trip.id)} />
              </div>
            ))}
            <div className="w-1 shrink-0" />
          </div>
        )}
      </section>

      {/* Quote moment */}
      <section className="px-6 py-16">
        <FadeIn className="mx-auto max-w-md text-center">
          <span className="display text-5xl leading-none text-primary/40">&ldquo;</span>
          <p className="display -mt-4 text-balance text-2xl font-medium leading-snug text-foreground/90">
            Twenty years from now you&apos;ll be more disappointed by the things you didn&apos;t do than by the
            ones you did.
          </p>
          <p className="mt-4 text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">Mark Twain</p>
        </FadeIn>
      </section>

      {/* Feed */}
      <section className="px-4">
        <div className="mb-5 flex items-baseline justify-between px-1">
          <div>
            <Eyebrow>From the road</Eyebrow>
            <h2 className="display mt-1.5 text-3xl font-semibold">Latest stories</h2>
          </div>
        </div>
        <Feed />
      </section>

      <Dock />
    </div>
  );
}
