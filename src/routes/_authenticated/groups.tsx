import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { MessageCircle, Users } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({ meta: [{ title: "Groups — TRYB" }] }),
  component: GroupsPage,
});

function GroupsPage() {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: memberships } = await supabase
        .from("trip_members")
        .select("trip_id, status, role")
        .eq("user_id", u.user.id);
      const tripIds = (memberships ?? []).map((m) => m.trip_id);
      if (tripIds.length === 0) { setLoading(false); return; }
      const { data: tripsData } = await supabase.from("trips").select("*").in("id", tripIds);
      const byId = new Map((memberships ?? []).map((m) => [m.trip_id, m]));
      setTrips((tripsData ?? []).map((t) => ({ ...t, _m: byId.get(t.id) })));
      setLoading(false);
    })();
  }, []);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pt-2">
        <h1 className="font-display text-3xl font-bold">Your trips</h1>
        <p className="text-sm text-muted-foreground">Groups you've joined or organized.</p>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-surface" />)}
          </div>
        ) : trips.length === 0 ? (
          <div className="glass-card mt-8 rounded-3xl p-8 text-center">
            <Users className="mx-auto h-10 w-10 text-primary" />
            <h3 className="mt-3 font-display text-xl font-bold">No groups yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a trip or join one to see it here.</p>
            <Link to="/discover" className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 font-semibold text-primary-foreground">Browse trips</Link>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {trips.map((t) => (
              <Link key={t.id} to="/trip/$tripId" params={{ tripId: t.id }} className="glass-card flex gap-3 overflow-hidden rounded-3xl p-3 transition hover:bg-surface-elevated">
                {t.cover_image ? (
                    <img src={t.cover_image} alt={t.destination} className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <div className="h-20 w-20 flex-shrink-0 rounded-2xl bg-gradient-to-br from-primary/40 to-coral/40 flex items-center justify-center">
                      <span className="font-display text-2xl font-bold text-white">
                        {t.destination?.slice(0, 1).toUpperCase() ?? "?"}
                      </span>
                    </div>
                  )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-base font-semibold">{t.destination}</h3>
                    {t._m?.status === "pending" && <span className="rounded-full bg-coral/20 px-2 py-0.5 text-[10px] font-medium text-coral">Pending</span>}
                    {t._m?.role === "organizer" && <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">Organizer</span>}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{t.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{format(new Date(t.start_date), "MMM d")} — {format(new Date(t.end_date), "MMM d")}</p>
                </div>
                <MessageCircle className="h-5 w-5 self-center text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </>
  );
}
