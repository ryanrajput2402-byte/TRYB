import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Check, MessageCircle, Users, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatCompactRange, pluralize } from "@/lib/format-date";
import { Dock } from "@/components/tryb/dock";
import { Eyebrow, PressBtn, Avatar } from "@/components/tryb/ui-kit";
import { FadeIn } from "@/components/tryb/motion-primitives";

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

// Real countdown, only meaningful for trips that haven't ended yet.
function countdownLabel(trip: { destination: string; start_date: string; end_date: string }): string | null {
  const now = Date.now();
  const start = new Date(trip.start_date).getTime();
  const end = new Date(trip.end_date).getTime();
  if (now >= start && now <= end) return "Happening now";
  if (now < start) {
    const days = Math.ceil((start - now) / 86_400_000);
    if (days === 0) return "Starts today";
    return `${days} ${pluralize(days, "day")} until ${trip.destination}`;
  }
  return null;
}

function GroupsPage() {
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
    const activeTrips = trips.filter((t) => t.end_date >= today).sort((a, b) => a.start_date.localeCompare(b.start_date));
    const pastTrips = trips.filter((t) => t.end_date < today).sort((a, b) => b.end_date.localeCompare(a.end_date));
    return { active: activeTrips, past: pastTrips };
  }, [trips, today]);

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-32 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      <div className="mx-auto w-full max-w-2xl px-5 pt-10">
        <FadeIn>
          <Eyebrow>Groups</Eyebrow>
          <h1 className="display mt-2 text-balance text-4xl font-semibold leading-[0.95] tracking-tight">
            The people and places you&apos;re travelling with.
          </h1>
        </FadeIn>

        {loading ? (
          <div className="mt-8 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-3xl" />
            ))}
          </div>
        ) : trips.length === 0 && pendingRequests.length === 0 ? (
          <FadeIn delay={0.05} className="mt-10 rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
            <Users className="mx-auto size-10 text-primary" />
            <h3 className="display mt-3 text-xl font-semibold">No groups yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">Create a trip or join one to see it here.</p>
            <PressBtn href="/discover" variant="primary" className="mt-5">
              Browse trips
            </PressBtn>
          </FadeIn>
        ) : (
          <>
            {pendingRequests.length > 0 && (
              <FadeIn delay={0.05} className="mt-8">
                <h2 className="display flex items-center gap-2 text-lg font-semibold">
                  Join requests
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                    {pendingRequests.length}
                  </span>
                </h2>
                <div className="mt-3 space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft">
                      <Avatar
                        person={{ id: req.requester?.id ?? "?", name: req.requester?.full_name ?? "Someone", avatar: req.requester?.avatar_url }}
                        size={44}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          <span className="font-semibold">{req.requester?.full_name ?? "Someone"}</span> wants to join
                        </p>
                        <p className="truncate text-xs text-muted-foreground">{req.tripDestination}</p>
                      </div>
                      <button
                        onClick={() => respondToRequest(req.id, "rejected")}
                        aria-label="Decline"
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                      >
                        <XIcon className="size-4" />
                      </button>
                      <button
                        onClick={() => respondToRequest(req.id, "approved")}
                        aria-label="Approve"
                        className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition hover:brightness-105"
                      >
                        <Check className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </FadeIn>
            )}

            {active.length > 0 && (
              <FadeIn delay={0.1} className="mt-8">
                <h2 className="display text-lg font-semibold">Active &amp; upcoming</h2>
                <div className="mt-3 space-y-3">
                  {active.map((t) => (
                    <TripRowCard key={t.id} trip={t} countdown={countdownLabel(t)} />
                  ))}
                </div>
              </FadeIn>
            )}

            {past.length > 0 && (
              <FadeIn delay={0.15} className="mt-10">
                <h2 className="display text-lg font-semibold">Past trips</h2>
                <div className="mt-3 space-y-3">
                  {past.map((t) => (
                    <TripRowCard key={t.id} trip={t} countdown={null} muted />
                  ))}
                </div>
              </FadeIn>
            )}
          </>
        )}
      </div>
      <Dock />
    </div>
  );
}

function TripRowCard({ trip, countdown, muted }: { trip: TripRow; countdown: string | null; muted?: boolean }) {
  return (
    <Link
      to="/trip/$tripId"
      params={{ tripId: trip.id }}
      className={`flex gap-3 overflow-hidden rounded-3xl border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5 ${muted ? "opacity-70" : ""}`}
    >
      {trip.cover_image ? (
        <img src={trip.cover_image} alt={trip.destination} className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
      ) : (
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-secondary">
          <span className="display text-2xl font-semibold text-primary">{trip.destination?.slice(0, 1).toUpperCase() ?? "?"}</span>
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-foreground">{trip.destination}</h3>
          {trip._status === "pending" && (
            <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-medium text-destructive">Pending</span>
          )}
          {trip._role === "organizer" && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">Organizer</span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">{formatCompactRange(trip.start_date, trip.end_date)}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex -space-x-2">
            {trip._faces.map((m) => (
              <Avatar key={m.id} person={{ id: m.id, name: m.full_name, avatar: m.avatar_url }} size={20} ring />
            ))}
          </div>
          {countdown && <span className="text-[11px] font-medium text-primary">{countdown}</span>}
        </div>
      </div>
      <MessageCircle className="size-5 shrink-0 self-center text-muted-foreground/50" />
    </Link>
  );
}
