import { createFileRoute, Link, Outlet, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Flag,
  Loader as Loader2,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { ReportModal } from "@/components/report-modal";
import { DeclineReasonModal } from "@/components/decline-reason-modal";
import { JoinRequestSentPanel } from "@/components/onboarding/join-request-sent-panel";
import { INTEREST_TAGS } from "@/lib/destinations";
import { costPerPerson, daysUntilStart, groupSizeProgression } from "@/lib/trip-urgency";
import { formatCompactRange, formatMemberSince } from "@/lib/format-date";
import { trackEvent } from "@/lib/analytics";
import { RESPONSE_TIME_LABELS } from "@/lib/profile-badges";
import { spring } from "@/lib/motion";
import { Avatar, AvatarStack, Eyebrow, PressBtn } from "@/components/tryb/ui-kit";
import { FadeIn } from "@/components/tryb/motion-primitives";
import { Dock } from "@/components/tryb/dock";

export const Route = createFileRoute("/_authenticated/trip/$tripId")({
  head: () => ({ meta: [{ title: "Trip — TRYB" }] }),
  component: TripDetail,
});

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  created_at?: string;
  travel_personality?: string | null;
};

function TripDetail() {
  const { tripId } = Route.useParams();
  const [trip, setTrip] = useState<any>(null);
  const [organizer, setOrganizer] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [approvedProfiles, setApprovedProfiles] = useState<Profile[]>([]);
  const [me, setMe] = useState<any>(null);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [requesting, setRequesting] = useState(false);
  const [organizerStats, setOrganizerStats] = useState<{
    organized: number;
    completed: number;
  } | null>(null);
  const [isFirstEverRequest, setIsFirstEverRequest] = useState(false);
  const [showFirstRequestIntro, setShowFirstRequestIntro] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pendingProfiles, setPendingProfiles] = useState<{ id: string; full_name: string }[]>([]);
  const [showRequestSent, setShowRequestSent] = useState(false);

  const heroRef = { current: null as HTMLDivElement | null };
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 400], [0, 120]);
  const scale = useTransform(scrollY, [-200, 0], [1.25, 1]);

  async function refresh() {
    const { data: u } = await supabase.auth.getUser();
    setMe(u.user);
    const { data: t } = await supabase.from("trips").select("*").eq("id", tripId).maybeSingle();
    if (!t) return;
    setTrip(t);
    const { data: org } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", t.organizer_id)
      .maybeSingle();
    setOrganizer(org);
    const { data: mems } = await supabase.from("trip_members").select("*").eq("trip_id", tripId);
    setMembers(mems ?? []);

    const approvedIds = (mems ?? [])
      .filter((m: any) => m.status === "approved")
      .map((m: any) => m.user_id);
    if (approvedIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, created_at, travel_personality")
        .in("id", approvedIds);
      setApprovedProfiles((profs ?? []) as Profile[]);
    } else {
      setApprovedProfiles([]);
    }

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
      const { data: sv } = await supabase
        .from("saved_trips")
        .select("trip_id")
        .eq("user_id", u.user.id)
        .eq("trip_id", tripId)
        .maybeSingle();
      setSaved(!!sv);
    }

    const { data: organizerTrips } = await supabase
      .from("trips")
      .select("end_date")
      .eq("organizer_id", t.organizer_id);
    const today = new Date().toISOString().slice(0, 10);
    setOrganizerStats({
      organized: organizerTrips?.length ?? 0,
      completed: (organizerTrips ?? []).filter((tr: any) => tr.end_date < today).length,
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  useEffect(() => {
    const isOrg = !!(me && trip && me.id === trip.organizer_id);
    const pendingIds = members.filter((m) => m.status === "pending").map((m) => m.user_id);
    if (isOrg || myMembership?.status !== "approved" || pendingIds.length === 0) {
      setPendingProfiles([]);
      return;
    }
    supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", pendingIds)
      .then(({ data }) => setPendingProfiles(data ?? []));
  }, [members, me, trip, myMembership?.status]);

  useEffect(() => {
    if (!me?.id) return;
    const channel = supabase
      .channel(`trip-membership-${tripId}-${me.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "trip_members",
          filter: `trip_id=eq.${tripId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.user_id !== me.id) return;
          setMyMembership(row);
          setMembers((prev) => prev.map((m) => (m.id === row.id ? row : m)));
          if (row.status === "approved")
            toast.success("You're in — the group chat's open and waiting for you.");
          else if (row.status === "rejected") {
            toast.error(
              row.rejection_reason
                ? `Your request to join wasn't approved: ${row.rejection_reason}`
                : "Your request to join wasn't approved",
            );
          }
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
        trip_id: tripId,
        user_id: me.id,
        status: "pending",
        role: "member",
      });
      if (error) throw error;
      trackEvent({ name: "join_request_submitted", tripId });
      setShowRequestSent(true);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send request");
    } finally {
      setRequesting(false);
    }
  }

  async function updateMember(
    memberId: string,
    status: "approved" | "rejected",
    reason?: string | null,
  ) {
    const { error } = await supabase
      .from("trip_members")
      .update({ status, ...(status === "rejected" ? { rejection_reason: reason ?? null } : {}) })
      .eq("id", memberId);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (status === "rejected" && reason)
      trackEvent({ name: "join_request_declined", reasonTemplate: reason });
    toast.success(`Member ${status}`);
    refresh();
  }

  async function toggleSave() {
    if (!me) return;
    trackEvent({ name: "save_tapped", tripId, saved: !saved });
    setSaved((v) => !v);
    if (saved) {
      await supabase.from("saved_trips").delete().eq("trip_id", tripId).eq("user_id", me.id);
    } else {
      await supabase.from("saved_trips").insert({ trip_id: tripId });
    }
  }

  if (!trip) {
    return <div className="tryb-theme min-h-screen bg-background" />;
  }

  const approved = members.filter((m) => m.status === "approved");
  const pending = members.filter((m) => m.status === "pending");
  const isOrganizer = me?.id === trip.organizer_id;
  const spotsLeft = trip.max_members - approved.length;
  const vibes = INTEREST_TAGS.filter((t) => (trip.vibe_tags ?? []).includes(t.id));
  const pp = costPerPerson(trip);
  const daysToStart = daysUntilStart(trip);
  const progression = groupSizeProgression(
    trip,
    approved.map((m) => m.joined_at),
  );
  const crew: { id: string; name: string; avatar?: string | null }[] = approvedProfiles.map(
    (p) => ({
      id: p.id,
      name: p.full_name,
      avatar: p.avatar_url,
    }),
  );

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-40 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      {/* Immersive parallax hero */}
      <div className="relative h-[68vh] min-h-[460px] overflow-hidden bg-ink">
        <motion.img
          src={trip.cover_image ?? "/placeholder.svg"}
          alt={trip.destination}
          style={{ y, scale }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-ink/40" />

        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5 pt-[max(20px,env(safe-area-inset-top))]">
          <BackButton />
          <div className="flex gap-2">
            <button
              onClick={toggleSave}
              aria-label="Save"
              className="grid size-10 place-items-center rounded-full bg-ink/40 text-ink-foreground backdrop-blur-md transition-transform active:scale-90"
            >
              <Bookmark className={saved ? "size-5 fill-current text-primary" : "size-5"} />
            </button>
            {!isOrganizer && (
              <button
                onClick={() => setReportOpen(true)}
                aria-label="Report this trip"
                className="grid size-10 place-items-center rounded-full bg-ink/40 text-ink-foreground backdrop-blur-md transition-transform active:scale-90"
              >
                <Flag className="size-[18px]" />
              </button>
            )}
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 text-ink-foreground">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring.soft, delay: 0.1 }}
          >
            <div className="flex items-center gap-1.5 text-sm text-ink-foreground/85">
              <Calendar className="size-4" />
              {formatCompactRange(trip.start_date, trip.end_date)}
            </div>
            <h1 className="display mt-2 text-balance text-5xl font-semibold leading-[0.95]">
              {trip.destination}
            </h1>
            <p className="mt-1 text-sm text-ink-foreground/70">{trip.title}</p>
            <div className="mt-4 flex items-center gap-3">
              <AvatarStack people={crew} size={34} max={4} />
              <span className="text-sm text-ink-foreground/85">
                {approved.length} going{organizer ? ` · hosted by ${organizer.full_name}` : ""}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto w-full max-w-2xl px-5">
        {/* Quick facts */}
        <FadeIn className="relative -mt-8">
          <div className="grid grid-cols-3 gap-3 rounded-3xl border border-border bg-card p-5 shadow-lift">
            <Fact
              icon={Calendar}
              label="When"
              value={formatCompactRange(trip.start_date, trip.end_date)}
              sub={trip.dateRange ?? ""}
            />
            <Fact
              icon={Wallet}
              label="Budget"
              value={pp ? `₹${(pp.min / 1000).toFixed(pp.min % 1000 === 0 ? 0 : 1)}k` : "Flexible"}
              sub="per person"
            />
            <Fact
              icon={Users}
              label="Spots"
              value={`${Math.max(spotsLeft, 0)} left`}
              sub={trip.solo_friendly ? "solo-friendly" : "group"}
            />
          </div>
        </FadeIn>

        {(vibes.length > 0 || trip.solo_friendly || trip.budget_flexibility) && (
          <FadeIn delay={0.03} className="mt-5 flex flex-wrap gap-2">
            {trip.solo_friendly && (
              <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
                🧍 Solo friendly
              </span>
            )}
            {trip.budget_flexibility && (
              <span className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                {trip.budget_flexibility === "strict" ? "🎯 Strict budget" : "🌊 Flexible budget"}
              </span>
            )}
            {vibes.map((v) => (
              <span
                key={v.id}
                className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground"
              >
                {v.emoji} {v.label}
              </span>
            ))}
          </FadeIn>
        )}

        {/* Organizer */}
        {organizer && (
          <FadeIn delay={0.05} className="mt-6">
            <Link
              to="/profile/$userId"
              params={{ userId: organizer.id }}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft transition hover:-translate-y-0.5"
            >
              <Avatar
                person={{
                  id: organizer.id,
                  name: organizer.full_name,
                  avatar: organizer.avatar_url,
                }}
                size={48}
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Organized by</p>
                <p className="truncate font-semibold text-foreground">
                  {organizer.full_name}
                  {organizer.email_verified && (
                    <span className="ml-1 text-xs font-semibold text-primary">✓</span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                  {organizerStats && (
                    <>
                      {organizerStats.organized} trip{organizerStats.organized === 1 ? "" : "s"}{" "}
                      organized
                      {organizerStats.completed > 0
                        ? `, ${organizerStats.completed} completed`
                        : ""}
                      {organizer.created_at && " · "}
                    </>
                  )}
                  {organizer.created_at && formatMemberSince(organizer.created_at)}
                </p>
                {organizer.response_time_expectation && (
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {RESPONSE_TIME_LABELS[organizer.response_time_expectation]}
                  </p>
                )}
              </div>
              {organizer.travel_personality && (
                <span className="rounded-full bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">
                  {organizer.travel_personality}
                </span>
              )}
            </Link>
          </FadeIn>
        )}

        {(daysToStart >= 0 && daysToStart <= 30) ||
        progression ||
        isOrganizer ||
        pendingProfiles.length > 0 ? (
          <div className="mt-4 space-y-1">
            {daysToStart >= 0 && daysToStart <= 30 && (
              <p className="text-xs font-medium text-muted-foreground">
                {daysToStart === 0
                  ? "Dates lock in today"
                  : `${daysToStart} day${daysToStart === 1 ? "" : "s"} until these dates lock in`}
              </p>
            )}
            {progression && (
              <p className="text-xs font-medium text-muted-foreground">
                Started with {progression.initial}, now {progression.current} going
              </p>
            )}
            {isOrganizer && (
              <p className="text-xs text-muted-foreground">
                {pending.length} requested · {approved.length} approved
              </p>
            )}
            {pendingProfiles.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingProfiles.length} more{" "}
                {pendingProfiles.length === 1 ? "person has" : "people have"} requested to join:{" "}
                {pendingProfiles.map((p) => p.full_name?.split(" ")[0] ?? "Someone").join(", ")}
              </p>
            )}
          </div>
        ) : null}

        {/* Summary */}
        {trip.vibe_summary && (
          <FadeIn delay={0.06} className="mt-10">
            <Eyebrow>The idea</Eyebrow>
            <p className="mt-3 text-pretty text-xl leading-relaxed text-foreground/90">
              {trip.vibe_summary}
            </p>
          </FadeIn>
        )}

        {/* About */}
        {trip.description && (
          <FadeIn delay={0.08} className="mt-10">
            <Eyebrow>About</Eyebrow>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
              {trip.description}
            </p>
          </FadeIn>
        )}

        {/* The crew */}
        {crew.length > 0 && (
          <div className="mt-12">
            <Eyebrow>Who&apos;s going</Eyebrow>
            <div className="mt-4 space-y-3">
              {approvedProfiles.map((p, i) => (
                <FadeIn key={p.id} delay={Math.min(i * 0.04, 0.3)}>
                  <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                    <Avatar
                      person={{ id: p.id, name: p.full_name, avatar: p.avatar_url }}
                      size={44}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {p.full_name}
                        {p.id === trip.organizer_id && (
                          <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                            organiser
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {p.travel_personality ?? "Traveler"}
                        {p.created_at ? ` · ${formatMemberSince(p.created_at)}` : ""}
                      </p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        )}

        {/* Join requests (organizer only) */}
        {isOrganizer && pending.length > 0 && (
          <div className="mt-12">
            <Eyebrow>Join requests ({pending.length})</Eyebrow>
            <div className="mt-3 space-y-2">
              {pending.map((m) => (
                <PendingRow key={m.id} memberId={m.id} userId={m.user_id} onUpdate={updateMember} />
              ))}
            </div>
          </div>
        )}

        {/* Trust note */}
        <FadeIn className="mt-10">
          <div className="flex gap-3 rounded-3xl bg-secondary/60 p-5">
            <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-sm leading-relaxed text-secondary-foreground">
              Your exact location and contact stay private until you&apos;re approved. Requesting to
              join just starts a conversation — {organizer?.full_name ?? "the organizer"} chooses
              who comes along.
            </p>
          </div>
        </FadeIn>

        {myMembership?.status === "approved" && (
          <div className="mt-6">
            <PressBtn href={`/trip/${tripId}/chat`} variant="primary" size="lg" className="w-full">
              Open group chat →
            </PressBtn>
          </div>
        )}
      </div>

      {/* Sticky join bar */}
      {!isOrganizer && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ ...spring.soft, delay: 0.2 }}
          className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[620px] border-t border-border/70 bg-popover/90 px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 backdrop-blur-xl"
        >
          {myMembership?.status === "approved" ? (
            <p className="py-2 text-center text-sm font-medium text-primary">
              You&apos;re in this trip
            </p>
          ) : myMembership?.status === "pending" ? (
            <p className="py-2 text-center text-sm font-medium text-muted-foreground">
              Request sent · waiting for organizer
            </p>
          ) : (
            <div className="flex items-center gap-4">
              <div className="min-w-0">
                {pp ? (
                  <p className="text-lg font-semibold">
                    ₹{pp.min.toLocaleString("en-IN")}
                    <span className="text-sm font-normal text-muted-foreground"> / person</span>
                  </p>
                ) : (
                  <p className="text-lg font-semibold">Flexible budget</p>
                )}
                <p className="text-xs text-muted-foreground">{Math.max(spotsLeft, 0)} spots left</p>
              </div>
              <PressBtn
                variant="primary"
                size="lg"
                className="ml-auto flex-1"
                disabled={requesting || spotsLeft <= 0}
                onClick={() => {
                  trackEvent({
                    name: "join_request_started",
                    tripId,
                    isFirstEver: isFirstEverRequest,
                  });
                  if (isFirstEverRequest) {
                    setShowFirstRequestIntro(true);
                  } else {
                    requestToJoin();
                  }
                }}
              >
                {requesting && <Loader2 className="size-4 animate-spin" />}
                Request to join
              </PressBtn>
            </div>
          )}
        </motion.div>
      )}

      {showFirstRequestIntro && (
        <FirstRequestIntro
          onConfirm={() => {
            setShowFirstRequestIntro(false);
            requestToJoin();
          }}
          onCancel={() => {
            trackEvent({ name: "join_request_cancelled", tripId });
            setShowFirstRequestIntro(false);
          }}
        />
      )}

      {showRequestSent && <JoinRequestSentPanel onClose={() => setShowRequestSent(false)} />}

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        targetType="trip"
        targetId={tripId}
      />

      <Dock />
      <Outlet />
    </div>
  );
}

function FirstRequestIntro({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-popover p-6 text-center text-foreground shadow-2xl sm:rounded-3xl">
        <h2 className="display text-xl font-semibold">Before you send your first request</h2>
        <p className="mt-3 text-pretty text-base leading-relaxed text-foreground/90">
          Some of the best days of your life haven&apos;t happened yet — most of them are waiting
          somewhere you haven&apos;t been. This request is how they start.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          You&apos;re not messaging a stranger cold — the organizer can already see your profile,
          and you&apos;ll see exactly who else is in before you go.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-border py-3 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Not yet
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Send request
          </button>
        </div>
      </div>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="text-center">
      <Icon className="mx-auto size-5 text-muted-foreground" />
      <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 font-semibold leading-tight">{value}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function PendingRow({
  memberId,
  userId,
  onUpdate,
}: {
  memberId: string;
  userId: string;
  onUpdate: (id: string, s: "approved" | "rejected", reason?: string | null) => void;
}) {
  const [profile, setProfile] = useState<any>(null);
  const [declineOpen, setDeclineOpen] = useState(false);
  useEffect(() => {
    supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => setProfile(data));
  }, [userId]);
  if (!profile) return null;
  return (
    <>
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
        <Link
          to="/profile/$userId"
          params={{ userId }}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <Avatar
            person={{ id: profile.id, name: profile.full_name, avatar: profile.avatar_url }}
            size={40}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {profile.full_name}
              {profile.email_verified && (
                <span className="ml-1 text-[10px] font-semibold text-primary">✓</span>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {profile.travel_personality ?? "Traveler"}
            </p>
            {profile.created_at && (
              <p className="truncate text-[10px] text-muted-foreground/70">
                {formatMemberSince(profile.created_at)}
              </p>
            )}
          </div>
        </Link>
        <button
          onClick={() => setDeclineOpen(true)}
          className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"
        >
          Decline
        </button>
        <button
          onClick={() => onUpdate(memberId, "approved")}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Approve
        </button>
      </div>

      <DeclineReasonModal
        open={declineOpen}
        onClose={() => setDeclineOpen(false)}
        onConfirm={(reason) => {
          setDeclineOpen(false);
          onUpdate(memberId, "rejected", reason);
        }}
      />
    </>
  );
}

function BackButton() {
  const router = useRouter();
  const navigate = useNavigate();
  return (
    <button
      onClick={() =>
        router.history.canGoBack?.() ? router.history.back() : navigate({ to: "/home" })
      }
      className="grid size-10 place-items-center rounded-full bg-ink/40 text-ink-foreground backdrop-blur-md transition-transform active:scale-90"
      aria-label="Go back"
    >
      <ArrowLeft className="size-5" />
    </button>
  );
}
