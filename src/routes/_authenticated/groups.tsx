import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { formatCompactRange, pluralize } from "@/lib/format-date";
import { MessageCircle, Users, Check, X as XIcon } from "lucide-react";
import { toast } from "sonner";

type Profile = { id: string; full_name: string; avatar_url: string | null };

type TripRow = {
  id: string;
  destination: string;
  title: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  organizer_id: string;
  _status: string;
  _role: string;
  _faces: Profile[];
};

type PendingRequest = {
  id: string;
  tripId: string;
  tripDestination: string;
  requester: Profile | null;
  requestedAt: string;
};

export const Route = createFileRoute("/_authenticated/groups")({
  head: () => ({ meta: [{ title: "Groups — TRYB" }] }),
  component: GroupsPage,
});

// Real countdown, only meaningful for trips that haven't ended yet — never
// shown for past trips. "Happening now" and day counts are both derived
// directly from real start_date/end_date, nothing estimated.
function countdownLabel(trip: { destination: string; start_date: string; end_date: string }): string | null {
  const now = Date.now();
  const start = new Date(trip.start_date).getTime();
  const end = new Date(trip.end_date).getTime();
  if (now >= start && now <= end) return "Happening now";
  if (now < start) {
    const days = Math.ceil((start - now) / 86_400_000);
    if (days === 0) return `Starts today`;
    return `${days} ${pluralize(days, "day")} until ${trip.destination}`;
  }
  return null;
}

function GroupsPage() {
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);

  const [trips, setTrips] = useState<TripRow[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const userId = u.user.id;

      const { data: memberships } = await supabase
        .from("trip_members")
        .select("trip_id, status, role")
        .eq("user_id", userId);
      const tripIds = (memberships ?? []).map((m) => m.trip_id);

      if (tripIds.length > 0) {
        const [{ data: tripsData }, { data: allMemberRows }] = await Promise.all([
          supabase.from("trips").select("*").in("id", tripIds),
          supabase.from("trip_members").select("trip_id, user_id, status").in("trip_id", tripIds).eq("status", "approved"),
        ]);

        const memberUserIds = Array.from(new Set((allMemberRows ?? []).map((m) => m.user_id)));
        const { data: memberProfiles } = memberUserIds.length
          ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", memberUserIds)
          : { data: [] as Profile[] };
        const profileById = new Map((memberProfiles ?? []).map((p) => [p.id, p as Profile]));

        const facesByTrip = new Map<string, Profile[]>();
        (allMemberRows ?? []).forEach((m: any) => {
          const list = facesByTrip.get(m.trip_id) ?? [];
          if (list.length < 4) {
            const p = profileById.get(m.user_id);
            if (p) list.push(p);
          }
          facesByTrip.set(m.trip_id, list);
        });

        const byId = new Map((memberships ?? []).map((m) => [m.trip_id, m]));
        setTrips(
          (tripsData ?? []).map((t: any) => ({
            ...t,
            _status: byId.get(t.id)?.status ?? "approved",
            _role: byId.get(t.id)?.role ?? "member",
            _faces: facesByTrip.get(t.id) ?? [],
          })),
        );
      }

      // Pending join requests for trips this user organizes — a distinct
      // admin task, surfaced separately rather than buried per-trip.
      const { data: organizedTrips } = await supabase.from("trips").select("id, destination").eq("organizer_id", userId);
      const organizedIds = (organizedTrips ?? []).map((t) => t.id);
      const destById = new Map((organizedTrips ?? []).map((t) => [t.id, t.destination]));

      if (organizedIds.length > 0) {
        const { data: pendingRows } = await supabase
          .from("trip_members")
          .select("id, trip_id, user_id, joined_at")
          .eq("status", "pending")
          .in("trip_id", organizedIds);
        const requesterIds = (pendingRows ?? []).map((r) => r.user_id);
        const { data: requesterProfiles } = requesterIds.length
          ? await supabase.from("profiles").select("id, full_name, avatar_url").in("id", requesterIds)
          : { data: [] as Profile[] };
        const reqProfileById = new Map((requesterProfiles ?? []).map((p) => [p.id, p as Profile]));
        setPendingRequests(
          (pendingRows ?? [])
            .map((r) => ({
              id: r.id,
              tripId: r.trip_id,
              tripDestination: destById.get(r.trip_id) ?? "your trip",
              requester: reqProfileById.get(r.user_id) ?? null,
              requestedAt: r.joined_at,
            }))
            .sort((a, b) => b.requestedAt.localeCompare(a.requestedAt)),
        );
      }

      setLoading(false);
    })();
  }, []);

  async function respondToRequest(memberId: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("trip_members").update({ status }).eq("id", memberId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPendingRequests((prev) => prev.filter((r) => r.id !== memberId));
    toast.success(status === "approved" ? "Request approved" : "Request declined");
  }

  const today = new Date().toISOString().slice(0, 10);
  const { active, past } = useMemo(() => {
    const activeTrips = trips
      .filter((t) => t.end_date >= today)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    const pastTrips = trips
      .filter((t) => t.end_date < today)
      .sort((a, b) => b.end_date.localeCompare(a.end_date));
    return { active: activeTrips, past: pastTrips };
  }, [trips, today]);

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <TopBar />
        <main className="mx-auto max-w-2xl px-5 pb-28 pt-2">
          <h1 className="fomo-heading text-ink text-3xl font-bold">Groups</h1>
          <p className="text-sm text-ink/50">The people and places you're traveling with.</p>

          {loading ? (
            <div className="mt-6 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-fomo h-24 rounded-3xl" />
              ))}
            </div>
          ) : trips.length === 0 && pendingRequests.length === 0 ? (
            <div className="warm-card mt-8 rounded-3xl p-8 text-center">
              <Users className="text-primary mx-auto h-10 w-10" />
              <h3 className="fomo-heading text-ink mt-3 text-xl font-bold">No groups yet</h3>
              <p className="mt-1 text-sm text-ink/50">Create a trip or join one to see it here.</p>
              <Link to="/discover" className="bg-primary text-cream mt-4 inline-block rounded-full px-6 py-2.5 font-semibold">
                Browse trips
              </Link>
            </div>
          ) : (
            <>
              {pendingRequests.length > 0 && (
                <section className="mt-6">
                  <h2 className="fomo-heading text-ink mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider">
                    Join requests
                    <span className="bg-primary text-cream rounded-full px-2 py-0.5 text-[11px] normal-case tracking-normal">
                      {pendingRequests.length}
                    </span>
                  </h2>
                  <div className="space-y-2">
                    {pendingRequests.map((req) => (
                      <div key={req.id} className="warm-card flex items-center gap-3 rounded-2xl p-3">
                        <div className="bg-primary/15 grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-full">
                          {req.requester?.avatar_url ? (
                            <img src={req.requester.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-primary text-sm font-bold">
                              {(req.requester?.full_name ?? "?").slice(0, 1).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-ink">
                            <span className="font-semibold">{req.requester?.full_name ?? "Someone"}</span> wants to join
                          </p>
                          <p className="truncate text-xs text-ink/50">{req.tripDestination}</p>
                        </div>
                        <button
                          onClick={() => respondToRequest(req.id, "rejected")}
                          aria-label="Decline"
                          className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-ink/5 text-ink/50 transition hover:bg-ink/10 hover:text-ink"
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => respondToRequest(req.id, "approved")}
                          aria-label="Approve"
                          className="bg-primary text-cream grid h-9 w-9 flex-shrink-0 place-items-center rounded-full transition hover:opacity-90"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {active.length > 0 && (
                <section className="mt-6">
                  <h2 className="fomo-heading text-ink mb-3 text-sm font-bold uppercase tracking-wider">Active &amp; upcoming</h2>
                  <div className="space-y-3">
                    {active.map((t) => (
                      <TripRowCard key={t.id} trip={t} countdown={countdownLabel(t)} />
                    ))}
                  </div>
                </section>
              )}

              {past.length > 0 && (
                <section className="mt-8">
                  <h2 className="fomo-heading text-ink mb-3 text-sm font-bold uppercase tracking-wider">Past trips</h2>
                  <div className="space-y-3">
                    {past.map((t) => (
                      <TripRowCard key={t.id} trip={t} countdown={null} muted />
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}

function TripRowCard({ trip, countdown, muted }: { trip: TripRow; countdown: string | null; muted?: boolean }) {
  return (
    <Link
      to="/trip/$tripId"
      params={{ tripId: trip.id }}
      className={`warm-card shadow-warm flex gap-3 overflow-hidden rounded-3xl p-3 transition hover:-translate-y-0.5 ${muted ? "opacity-70" : ""}`}
    >
      {trip.cover_image ? (
        <img src={trip.cover_image} alt={trip.destination} className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover" />
      ) : (
        <div className="bg-primary/20 flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl">
          <span className="fomo-heading text-primary text-2xl font-bold">
            {trip.destination?.slice(0, 1).toUpperCase() ?? "?"}
          </span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="fomo-heading text-ink truncate text-base font-semibold">{trip.destination}</h3>
          {trip._status === "pending" && (
            <span className="bg-coral/20 text-coral rounded-full px-2 py-0.5 text-[10px] font-medium">Pending</span>
          )}
          {trip._role === "organizer" && (
            <span className="bg-primary/20 text-primary rounded-full px-2 py-0.5 text-[10px] font-medium">Organizer</span>
          )}
        </div>
        <p className="truncate text-xs text-ink/50">{formatCompactRange(trip.start_date, trip.end_date)}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex -space-x-2">
            {trip._faces.map((m) =>
              m.avatar_url ? (
                <img key={m.id} src={m.avatar_url} alt="" className="ring-cream h-5 w-5 rounded-full object-cover ring-2" />
              ) : (
                <div key={m.id} className="bg-primary/70 ring-cream grid h-5 w-5 place-items-center rounded-full text-[9px] font-bold text-white ring-2">
                  {(m.full_name ?? "?").slice(0, 1)}
                </div>
              ),
            )}
          </div>
          {countdown && <span className="text-primary text-[11px] font-medium">{countdown}</span>}
        </div>
      </div>
      <MessageCircle className="h-5 w-5 flex-shrink-0 self-center text-ink/30" />
    </Link>
  );
}
