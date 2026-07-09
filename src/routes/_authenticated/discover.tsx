import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { DiscoverView } from "@/components/tryb/discover-view";
import { Dock } from "@/components/tryb/dock";

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — TRYB" }] }),
  component: Discover,
});

function Discover() {
  const [saved, setSaved] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: sv } = await supabase.from("saved_trips").select("trip_id").eq("user_id", u.user.id);
      setSaved(new Set((sv ?? []).map((r: any) => r.trip_id)));
    })();
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

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-32 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      <DiscoverView saved={saved} onToggleSave={toggleSave} />
      <Dock />
    </div>
  );
}
