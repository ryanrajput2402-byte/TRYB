import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { ArrowLeft, Calendar, Users, Wallet, Loader as Loader2, Check } from "lucide-react";
import { format } from "date-fns";
import { INTEREST_TAGS } from "@/lib/destinations";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { costPerPerson, daysUntilStart, groupSizeProgression } from "@/lib/trip-urgency";
import { formatMemberSince } from "@/lib/format-date";

export const Route = createFileRoute("/_authenticated/trip/$tripId")({
  head: () => ({ meta: [{ title: "Trip — TRYB" }] }),
  component: TripDetail,
});

function TripDetail() {
  const { tripId } = Route.useParams();
  const navigate = useNavigate();
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const [trip, setTrip] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [me, setMe] = useState<any>(null);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);
  const [organizerStats, setOrganizerStats] = useState<{ organized: number; completed: number } | null>(null);
  // Item 4/5 gate — derived from real data, not a dismissal flag: true only
  // if this user has never had a trip_members row as a 'member' before
  // (any status, any trip). Independent of the onboarding intro's gate,
  // which is tied to the one-time signup flow instead.
  const [isFirstEverRequest, setIsFirstEverRequest] = useState(false);
  const [showFirstRequestIntro, setShowFirstRequestIntro] = useState(false);

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
      const { data: priorRequests } = await supabase
        .from("trip_members")
        .select("id")
        .eq("user_id", u.user.id)
        .eq("role", "member")
        .limit(1);
      setIsFirstEverRequest((priorRequests ?? []).length === 0);
    }

    // Organizer trust stats — same real definition as Profile's own stats
    // (trips organized = organizer_id count, completed = end_date passed).
    const { data: organizerTrips } = await supabase.from("trips").select("end_date").eq("organizer_id", t.organizer_id);
    const today = new Date().toISOString().slice(0, 10);
    setOrganizerStats({
      organized: organizerTrips?.length ?? 0,
      completed: (organizerTrips ?? []).filter((tr: any) => tr.end_date < today).length,
    });
  }

  useEffect(() => { refresh(); }, [tripId]);

  // So a pending requester sees their approval instantly instead of needing to refresh.
  useEffect(() => {
    if (!me?.id) return;
    const channel = supabase
      .channel(`trip-membership-${tripId}-${me.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trip_members", filter: `trip_id=eq.${tripId}` },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id !== me.id) return;
          setMyMembership(row);
          setMembers((prev) => prev.map((m) => (m.id === row.id ? row : m)));
          if (row.status === "approved") toast.success("You're in — the group chat's open and waiting for you.");
          else if (row.status === "rejected") toast.error("Your request to join wasn't approved");
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId, me?.id]);

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

  if (!trip) return <div className={`${themeClassName} min-h-screen`} />;

  const approved = members.filter((m) => m.status === "approved");
  const pending = members.filter((m) => m.status === "pending");
  const isOrganizer = me?.id === trip.organizer_id;
  const spotsLeft = trip.max_members - approved.length;
  const vibes = INTEREST_TAGS.filter((t) => (trip.vibe_tags ?? []).includes(t.id));
  const pp = costPerPerson(trip);
  const daysToStart = daysUntilStart(trip);
  const progression = groupSizeProgression(trip, approved.map((m) => m.joined_at));

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <main className="mx-auto max-w-2xl pb-32">
          <div className="relative h-72 overflow-hidden">
            <img src={trip.cover_image} alt={trip.destination} className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-sand via-sand/40 to-transparent" />
            <BackButton />
          </div>

          <div className="-mt-20 px-5">
            <h1 className="fomo-heading text-ink text-4xl font-bold leading-tight">{trip.destination}</h1>
            <p className="mt-1 text-base text-ink/60">{trip.title}</p>
            {trip.vibe_summary && (
              <p className="fomo-heading text-primary mt-1.5 text-lg font-semibold">✨ {trip.vibe_summary}</p>
            )}

            {(vibes.length > 0 || trip.solo_friendly) && (
              <div className="mt-3 flex flex-wrap gap-2">
                {trip.solo_friendly && (
                  <span className="rounded-full bg-teal/85 px-3 py-1 text-xs font-semibold text-black">🧍 Solo friendly</span>
                )}
                {vibes.map((v) => (
                  <span key={v.id} className="warm-card text-ink rounded-full px-3 py-1 text-xs">{v.emoji} {v.label}</span>
                ))}
              </div>
            )}

            {organizer && (
              <div className="warm-card mt-5 flex items-center gap-3 rounded-2xl p-3">
                {organizer.avatar_url ? (
                  <img src={organizer.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/20 font-bold text-primary">
                    {organizer.full_name?.slice(0, 1)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink/60">Organized by</p>
                  <p className="text-ink font-semibold truncate">{organizer.full_name}</p>
                  <p className="mt-0.5 truncate text-[11px] text-ink/50">
                    {organizerStats && (
                      <>
                        {organizerStats.organized} trip{organizerStats.organized === 1 ? "" : "s"} organized
                        {organizerStats.completed > 0 ? `, ${organizerStats.completed} completed` : ""}
                        {organizer.created_at && " · "}
                      </>
                    )}
                    {organizer.created_at && formatMemberSince(organizer.created_at)}
                  </p>
                </div>
                {organizer.travel_personality && (
                  <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">{organizer.travel_personality}</span>
                )}
              </div>
            )}

            <div className="mt-4 flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <InfoCard icon={<Calendar className="h-4 w-4" />} label="Dates" value={`${format(new Date(trip.start_date), "MMM d")} – ${format(new Date(trip.end_date), "MMM d")}`} />
              <InfoCard
                icon={<Wallet className="h-4 w-4" />}
                label="Budget"
                value={trip.budget_min ? `$${trip.budget_min}–${trip.budget_max}` : "Flexible"}
                sub={pp ? `~$${pp.min}–${pp.max}/person` : undefined}
              />
              <InfoCard icon={<Users className="h-4 w-4" />} label="Tribe" value={`${approved.length}/${trip.max_members}`} />
            </div>

            {daysToStart >= 0 && daysToStart <= 30 && (
              <p className="mt-3 text-xs font-medium text-ink/50">
                {daysToStart === 0 ? "Dates lock in today" : `${daysToStart} day${daysToStart === 1 ? "" : "s"} until these dates lock in`}
              </p>
            )}

            {progression && (
              <p className="mt-1 text-xs font-medium text-ink/50">
                Started with {progression.initial}, now {progression.current} going
              </p>
            )}

            {isOrganizer && (
              <p className="mt-3 text-xs text-ink/50">
                {pending.length} requested · {approved.length} approved
              </p>
            )}

            {trip.description && (
              <section className="mt-6">
                <h2 className="fomo-heading text-ink text-lg font-semibold">About</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/60 whitespace-pre-wrap">{trip.description}</p>
              </section>
            )}

            {isOrganizer && pending.length > 0 && (
              <section className="mt-6">
                <h2 className="fomo-heading text-ink text-lg font-semibold">Join requests ({pending.length})</h2>
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
            <div className="warm-card mx-auto max-w-md rounded-2xl p-3">
              {myMembership?.status === "approved" ? (
                <p className="py-2 text-center text-sm font-medium text-primary"><Check className="mr-1 inline h-4 w-4" /> You're in this trip</p>
              ) : myMembership?.status === "pending" ? (
                <p className="py-2 text-center text-sm font-medium text-ink/60">Request sent · waiting for organizer</p>
              ) : (
                <>
                  <p className="mb-2 text-center text-xs text-ink/60">{spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left</p>
                  <button
                    onClick={() => (isFirstEverRequest ? setShowFirstRequestIntro(true) : requestToJoin())}
                    disabled={requesting || spotsLeft <= 0}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {requesting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Request to join
                  </button>
                  {/* Item 3 — persistent trust line, shown every time, every trip */}
                  <p className="mt-2 text-center text-[11px] text-ink/40">
                    Organizers approve every request — you're never just dropped into a trip with strangers.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        {showFirstRequestIntro && (
          <FirstRequestIntro
            onConfirm={() => {
              setShowFirstRequestIntro(false);
              requestToJoin();
            }}
            onCancel={() => setShowFirstRequestIntro(false)}
          />
        )}

        <BottomNav />
        <Outlet />
      </div>
    </div>
  );
}

// Items 4/5 — shown once, ever, before a user's very first join-request
// submission (see isFirstEverRequest above). Never reappears after that
// first real trip_members row exists, on any trip.
function FirstRequestIntro({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="warm-card text-ink relative z-10 w-full max-w-md rounded-t-3xl p-6 text-center shadow-2xl sm:rounded-3xl">
        <h2 className="fomo-heading text-xl font-bold">Before you send your first request</h2>
        <p className="mt-3 text-sm text-ink/70">
          Request-to-join keeps trips small and intentional — organizers get to see who's asking before anyone shows
          up.
        </p>
        <p className="mt-3 text-sm text-ink/70">
          You're not messaging a stranger cold — the organizer can already see your profile, and you'll see exactly
          who else is in before you go.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} className="hover:bg-ink/5 flex-1 rounded-full border border-ink/10 py-3 text-sm font-medium text-ink transition">
            Not yet
          </button>
          <button onClick={onConfirm} className="bg-primary text-cream flex-1 rounded-full py-3 text-sm font-semibold transition hover:opacity-90">
            Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="warm-card flex-shrink-0 rounded-2xl px-4 py-3 min-w-[120px]">
      <div className="flex items-center gap-1.5 text-ink/60">{icon}<span className="text-[11px]">{label}</span></div>
      <p className="text-ink mt-1 text-sm font-semibold">{value}</p>
      {sub && <p className="text-ink/50 text-[10px]">{sub}</p>}
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
    <div className="warm-card flex items-center gap-3 rounded-2xl p-3">
      {profile.avatar_url ? (
        <img src={profile.avatar_url} className="h-10 w-10 rounded-full object-cover" alt="" />
      ) : (
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/20 font-bold text-primary">{profile.full_name?.slice(0, 1)}</div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-ink truncate font-semibold text-sm">{profile.full_name}</p>
        <p className="truncate text-xs text-ink/60">{profile.travel_personality ?? "Traveler"}</p>
        {profile.created_at && <p className="truncate text-[10px] text-ink/40">{formatMemberSince(profile.created_at)}</p>}
      </div>
      <button onClick={() => onUpdate(memberId, "rejected")} className="warm-card text-ink/60 rounded-full px-3 py-1.5 text-xs">Decline</button>
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
      className="warm-card text-ink absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] grid h-10 w-10 place-items-center rounded-full"
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
