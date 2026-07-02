import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Users, Wallet, Loader as Loader2, Check } from "lucide-react";
import { format } from "date-fns";
import { INTEREST_TAGS } from "@/lib/destinations";

export const Route = createFileRoute("/_authenticated/trip/$tripId")({
  head: () => ({ meta: [{ title: "Trip — TRYB" }] }),
  component: TripDetail,
});

function TripDetail() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);

  async function refresh() {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user);
    const { data: t } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
    if (!t) return;
    setTrip(t);
    const { data: org } = await supabase.from("profiles").select("*").eq("id", t.organizer_id).maybeSingle();
    setOrganizer(org);
    const { data: mems } = await supabase.from("trip_members").select("*").eq("trip_id", tripId);
    setMembers(mems ?? []);
    if (u.user) {
      const mine = (mems ?? []).find((m: any) => m.user_id === u.user!.id);
      setMyMembership(mine ?? null);
    }
  }

  useEffect(() => { refresh(); }, [tripId]);

  async function requestToJoin() {
    if (!me) return;
    setRequesting(true);
    try {
      const { error } = await supabase.from("trip_members").insert({
        trip_id: tripId, user_id: me.id, status: "pending", role: "member",
      });
      if (error) throw error;
      toast.success("Request sent ✓");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send request");
    } finally {
      setRequesting(false);
    }
  }

  async function updateMember(memberId: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("trip_members").update({ status }).eq("id", memberId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Member ${status}`);
    refresh();
  }

  if (!trip) return <div className="min-h-screen bg-background" />;

  const approved = members.filter((m) => m.status === "approved");
  const pending = members.filter((m) => m.status === "pending");
  const isOrganizer = me?.id === trip.organizer_id;
  const spotsLeft = trip.max_members - approved.length;
  const vibes = INTEREST_TAGS.filter((t) => (trip.vibe_tags ?? []).includes(t.id));

  return (
    <>
      <main className="mx-auto max-w-2xl pb-32">
        <div className="relative h-72 overflow-hidden">
          <img src={trip.cover_image} alt={trip.destination} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <BackButton />
        </div>

        <div className="-mt-20 px-5">
          <h1 className="font-display text-4xl font-bold leading-tight">{trip.destination}</h1>
          <p className="mt-1 text-base text-muted-foreground">{trip.title}</p>

          {vibes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {vibes.map((v) => (
                <span key={v.id} className="glass-card rounded-full px-3 py-1 text-xs">{v.emoji} {v.label}</span>
              ))}
            </div>
          )}

          {organizer && (
            <div className="glass-card mt-5 flex items-center gap-3 rounded-2xl p-3">
              {organizer.avatar_url ? (
                <img src={organizer.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/20 font-bold text-primary">
                  {organizer.full_name?.slice(0, 1)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Organized by</p>
                <p className="font-semibold truncate">{organizer.full_name}</p>
              </div>
              {organizer.travel_personality && (
                <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">{organizer.travel_personality}</span>
              )}
            </div>
          )}

          <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <InfoCard icon={<Calendar className="h-4 w-4" />} label="Dates" value={`${format(new Date(trip.start_date), "MMM d")} – ${format(new Date(trip.end_date), "MMM d")}`} />
            <InfoCard icon={<Wallet className="h-4 w-4" />} label="Budget" value={trip.budget_min ? `$${trip.budget_min}–${trip.budget_max}` : "Flexible"} />
            <InfoCard icon={<Users className="h-4 w-4" />} label="Tribe" value={`${approved.length}/${trip.max_members}`} />
          </div>

          {trip.description && (
            <section className="mt-6">
              <h2 className="font-display text-lg font-semibold">About</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">{trip.description}</p>
            </section>
          )}

          {isOrganizer && pending.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-lg font-semibold">Join requests ({pending.length})</h2>
              <div className="mt-3 space-y-2">
                {pending.map((m) => <PendingRow key={m.id} memberId={m.id} userId={m.user_id} onUpdate={updateMember} />)}
              </div>
            </section>
          )}

          {myMembership?.status === "approved" && (
            <section className="mt-6">
              <Link to="/trip/$tripId/chat" params={{ tripId }} className="block rounded-2xl bg-primary py-4 text-center font-semibold text-primary-foreground shadow-[var(--shadow-glow)]">
                Open group chat →
              </Link>
            </section>
          )}
        </div>
      </main>

      {/* Sticky CTA */}
      {!isOrganizer && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+88px)]">
          <div className="glass-card mx-auto max-w-md rounded-2xl p-3">
            {myMembership?.status === "approved" ? (
              <p className="py-2 text-center text-sm font-medium text-primary"><Check className="mr-1 inline h-4 w-4" /> You're in this trip</p>
            ) : myMembership?.status === "pending" ? (
              <p className="py-2 text-center text-sm font-medium text-muted-foreground">Request sent · waiting for organizer</p>
            ) : (
              <>
                <p className="mb-2 text-center text-xs text-muted-foreground">{spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left</p>
                <button onClick={requestToJoin} disabled={requesting || spotsLeft <= 0}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50">
                  {requesting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Request to join
                </button>
              </>
            )}
          </div>
        </div>
      )}
            <BottomNav />
      <Outlet />
      </>
  );
}

function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="glass-card flex-shrink-0 rounded-2xl px-4 py-3 min-w-[120px]">
      <div className="flex items-center gap-1.5 text-muted-foreground">{icon}<span className="text-[11px]">{label}</span></div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function PendingRow({ memberId, userId, onUpdate }: { memberId: string; userId: string; onUpdate: (id: string, s: "approved" | "rejected") => void }) {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle().then(({ data }) => setProfile(data));
  }, [userId]);
  if (!profile) return null;
  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl p-3">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 font-bold text-primary">{profile.full_name?.slice(0, 1)}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-sm">{profile.full_name}</p>
        <p className="truncate text-xs text-muted-foreground">{profile.travel_personality ?? "Traveler"}</p>
      </div>
      <button onClick={() => onUpdate(memberId, "rejected")} className="rounded-full bg-surface px-3 py-1.5 text-xs text-muted-foreground">Decline</button>
      <button onClick={() => onUpdate(memberId, "approved")} className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">Approve</button>
    </div>
  );
}

function BackButton() {
  const router = useRouter();
  const navigate = useNavigate();
  return (
    <button
      onClick={() => router.history.canGoBack?.() ? router.history.back() : navigate({ to: "/home" })}
      className="glass-card absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] grid h-10 w-10 place-items-center rounded-full"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
