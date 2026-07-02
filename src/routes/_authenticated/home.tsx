import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DESTINATIONS, vibeTint } from "@/lib/destinations";
import { Bookmark, Sparkles, ArrowRight } from "lucide-react";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  travel_personality: string | null;
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  max_members: number;
  vibe_tags: string[];
  organizer_id: string;
  organizer?: Profile;
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

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: p }, { data: t }, { data: sv }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url, travel_personality").eq("id", u.user.id).maybeSingle(),
        supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(30),
        supabase.from("saved_trips").select("trip_id").eq("user_id", u.user.id),
      ]);
      setProfile(p as Profile | null);
      setSaved(new Set((sv ?? []).map((r: any) => r.trip_id)));
      const rawTrips = (t ?? []) as Trip[];
      const ids = Array.from(new Set(rawTrips.map((x) => x.organizer_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name, avatar_url, travel_personality").in("id", ids);
        const byId = new Map((profs ?? []).map((p) => [p.id, p as Profile]));
        rawTrips.forEach((tr) => { tr.organizer = byId.get(tr.organizer_id); });
      }
      setTrips(rawTrips);
      setLoading(false);
    })();
  }, []);

  const toggleSave = useCallback(async (tripId: string) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const isSaved = saved.has(tripId);
    setSaved((s) => { const n = new Set(s); isSaved ? n.delete(tripId) : n.add(tripId); return n; });
    if (isSaved) {
      await supabase.from("saved_trips").delete().eq("trip_id", tripId).eq("user_id", u.user.id);
    } else {
      await supabase.from("saved_trips").insert({ trip_id: tripId });
    }
  }, [saved]);

  const stories = DESTINATIONS.slice(0, 10);

  return (
    <>
      <TopBar avatarUrl={profile?.avatar_url} name={profile?.full_name} />
      <main className="mx-auto max-w-2xl">
        <section aria-label="Featured destinations" className="px-4 pt-2">
          <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {stories.map((s) => (
              <button key={s.slug} className="flex flex-shrink-0 flex-col items-center gap-1">
                <div className="rounded-full bg-gradient-to-tr from-primary to-coral p-[2px]">
                  <div className="overflow-hidden rounded-full border-2 border-background">
                    <img src={s.image} alt={s.name} className="h-16 w-16 object-cover" />
                  </div>
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{s.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="px-5 pt-4 pb-2">
          <h1 className="font-display text-3xl font-bold">
            Hey {(profile?.full_name ?? "explorer").split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">
            {profile?.travel_personality ? (
              <>You're a <span className="text-primary font-medium">{profile.travel_personality}</span> · here's what's brewing</>
            ) : "Here's what's brewing"}
          </p>
        </section>

        <section className="px-3">
          {loading ? (
            <div className="grid grid-cols-2 gap-3 px-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="aspect-[3/4] animate-pulse rounded-3xl bg-surface" />
              ))}
            </div>
          ) : trips.length === 0 ? (
            <EmptyTrips />
          ) : (
            <div className="columns-2 gap-3 px-2 md:columns-3">
              {trips.map((trip, i) => (
                <TripCard
                  key={trip.id}
                  trip={trip}
                  saved={saved.has(trip.id)}
                  onSave={() => toggleSave(trip.id)}
                  index={i}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  );
}

function TripCard({ trip, saved, onSave, index }: { trip: Trip; saved: boolean; onSave: () => void; index: number }) {
  const cover = trip.cover_image ?? DESTINATIONS[index % DESTINATIONS.length].image;
  const heights = ["aspect-[3/4]", "aspect-[4/5]", "aspect-square", "aspect-[3/5]"];
  const aspect = heights[index % heights.length];
  const vibe = trip.vibe_tags?.[0];

  return (
    <Link
      to="/trip/$tripId"
      params={{ tripId: trip.id }}
      className="animate-fade-up mb-3 block break-inside-avoid"
      style={{ animationDelay: `${Math.min(index * 50, 600)}ms` }}
    >
      <div className={`group relative ${aspect} overflow-hidden rounded-3xl`}>
        <img src={cover} alt={trip.destination} loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className={`absolute inset-0 bg-gradient-to-t ${vibeTint(vibe)}`} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

        <button
          onClick={(e) => { e.preventDefault(); onSave(); }}
          aria-label={saved ? "Unsave" : "Save"}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full backdrop-blur-md transition ${
            saved ? "bg-primary text-primary-foreground scale-110" : "bg-black/40 text-white hover:bg-black/60"
          }`}
        >
          <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
        </button>

        <div className="absolute inset-x-0 bottom-0 p-4">
          <h3 className="font-display text-xl font-bold leading-tight text-white drop-shadow">{trip.destination}</h3>
          <p className="mt-0.5 text-xs text-white/80 line-clamp-1">{trip.title}</p>
          <div className="mt-2 flex items-center justify-between text-[11px] text-white/90">
            <div className="flex items-center gap-1.5">
              {trip.organizer?.avatar_url ? (
                <img src={trip.organizer.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
              ) : (
                <div className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
                  {(trip.organizer?.full_name ?? "?").slice(0, 1)}
                </div>
              )}
              <span className="truncate">{trip.organizer?.full_name?.split(" ")[0] ?? "Traveler"}</span>
            </div>
            <span className="rounded-full bg-black/50 px-2 py-0.5 backdrop-blur">{trip.max_members} spots</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyTrips() {
  return (
    <div className="mx-auto mt-10 max-w-md px-6 text-center">
      <div className="glass-card mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>
      <h3 className="font-display text-2xl font-bold">Your first trip is waiting</h3>
      <p className="mt-2 text-sm text-muted-foreground">No trips yet — start something or browse what's out there.</p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link to="/create" className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-primary-foreground">
          Create a trip <ArrowRight className="h-4 w-4" />
        </Link>
        <Link to="/discover" className="inline-flex items-center justify-center rounded-full border border-glass-border px-6 py-3 font-medium">
          Discover
        </Link>
      </div>
    </div>
  );
}
