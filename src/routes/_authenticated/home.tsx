import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { TravelQuoteWidget } from "@/components/travel-quote-widget";
import { PostsFeed } from "@/components/posts-feed";
import { Dock } from "@/components/tryb/dock";
import { HomeHero } from "@/components/tryb/home-hero";
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

// Structural rebuild — Home is now: a fixed night-map hero (Create/Join
// CTAs), the quote widget, then the posts feed. Discover, Groups, and
// Projects no longer have any preview/teaser presence here — they're pure
// destination pages now, reachable only via BottomNav. #section-feed is the
// one remaining scroll-spy target BottomNav watches when pathname is /home.
function HomeFeed() {
  const [profile, setProfile] = useState<Profile | null>(null);
  // Backs the "someone just joined" realtime toast below — only needs each
  // trip's own destination, not the going-count/member-face enrichment Home
  // used to compute for its (now-removed) preview cards.
  const tripIndexRef = useRef<Map<string, { destination: string }>>(new Map());

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const [{ data: p }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, avatar_url").eq("id", u.user.id).maybeSingle(),
        supabase.from("trips").select("*").order("created_at", { ascending: false }).limit(40),
      ]);
      if (cancelled) return;
      setProfile(p as Profile | null);
      tripIndexRef.current = new Map(((t ?? []) as any[]).map((tr) => [tr.id, tr]));
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

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-32 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      <HomeHero avatarUrl={profile?.avatar_url} />

      {/* Quiet editorial breath between the hero and the feed. */}
      <TravelQuoteWidget />

      <main className="mx-auto max-w-2xl px-4 pb-10 pt-4">
        <div id="section-feed" className="mx-auto max-w-2xl scroll-mt-20">
          <PostsFeed />
        </div>
      </main>
      <Dock />
    </div>
  );
}
