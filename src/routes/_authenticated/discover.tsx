import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { DESTINATIONS, vibeTint } from "@/lib/destinations";
import { Search, X } from "lucide-react";

const FILTERS = ["All", "Beaches", "Mountains", "Cities", "Forest", "Desert"];

export const Route = createFileRoute("/_authenticated/discover")({
  head: () => ({ meta: [{ title: "Discover — TRYB" }] }),
  component: Discover,
});

function Discover() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [trips, setTrips] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("trips").select("*").eq("privacy", "public").order("created_at", { ascending: false }).limit(40)
      .then(({ data }) => setTrips(data ?? []));
  }, []);

  const filteredDest = useMemo(() => {
    let results = DESTINATIONS;
    if (filter !== "All") {
      const vibeMap: Record<string, string> = {
        beaches: "beach", mountains: "mountain", cities: "city", forest: "forest", desert: "desert",
      };
      const v = vibeMap[filter.toLowerCase()] ?? filter.toLowerCase();
      results = results.filter((d) => d.vibe === v);
    }
    if (q.trim()) {
      const lower = q.trim().toLowerCase();
      results = results.filter(
        (d) => d.name.toLowerCase().includes(lower) || d.country.toLowerCase().includes(lower),
      );
    }
    return results;
  }, [filter, q]);

  const filteredTrips = useMemo(() => {
    if (!q.trim()) return trips;
    const lower = q.trim().toLowerCase();
    return trips.filter(
      (t) =>
        t.destination?.toLowerCase().includes(lower) ||
        t.title?.toLowerCase().includes(lower) ||
        t.country?.toLowerCase().includes(lower),
    );
  }, [trips, q]);

  return (
    <>
      <TopBar />
      <main className="mx-auto max-w-2xl px-5 pt-2 pb-28">
        <h1 className="font-display text-3xl font-bold">Discover</h1>

        <div className="glass-card mt-4 flex items-center gap-2 rounded-full px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search destinations…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {q && (
            <button onClick={() => setQ("")} className="shrink-0 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!q && (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                  filter === f
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-glass-border bg-surface text-muted-foreground"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {!q && (
          <section className="mt-6">
            <h2 className="mb-3 font-display text-lg font-semibold">Featured destinations</h2>
            {filteredDest.length === 0 ? (
              <p className="text-sm text-muted-foreground">No destinations match this filter.</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {filteredDest.map((d) => (
                  <div key={d.slug} className="relative h-48 w-64 flex-shrink-0 overflow-hidden rounded-3xl">
                    <img src={d.image} alt={d.name} className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="font-display text-xl font-bold text-white">
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

        <section className="mt-8">
          <h2 className="mb-3 font-display text-lg font-semibold">
            {q ? `Results for "${q}"` : "Trending trips"}
          </h2>
          {filteredTrips.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {q ? "No trips match your search." : "No public trips yet. Be the first to create one."}
            </p>
          ) : (
            <div className="columns-2 gap-3 md:columns-3">
              {filteredTrips.map((t, i) => (
                <Link key={t.id} to="/trip/$tripId" params={{ tripId: t.id }} className="mb-3 block break-inside-avoid">
                  <div className="group relative aspect-[4/5] overflow-hidden rounded-3xl">
                    <img
                      src={t.cover_image ?? DESTINATIONS[i % DESTINATIONS.length].image}
                      alt={t.destination}
                      className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${vibeTint(t.vibe_tags?.[0])}`} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-3">
                      <p className="font-display text-base font-bold text-white">{t.destination}</p>
                      <p className="text-xs text-white/70">{t.max_members} spots</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </>
  );
}
