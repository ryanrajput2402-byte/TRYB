import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReportModal } from "@/components/report-modal";
import { ArrowLeft, Flag, MapPin } from "lucide-react";
import { DESTINATIONS } from "@/lib/destinations";
import { formatMemberSince, formatCompactRange } from "@/lib/format-date";
import { RESPONSE_TIME_LABELS } from "@/lib/profile-badges";
import { Dock } from "@/components/tryb/dock";
import { Eyebrow } from "@/components/tryb/ui-kit";
import { FadeIn } from "@/components/tryb/motion-primitives";

type Profile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  travel_personality: string | null;
  created_at: string;
  email_verified: boolean;
  response_time_expectation: string | null;
};

type MutualTrip = {
  id: string;
  destination: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
};

export const Route = createFileRoute("/_authenticated/profile_/$userId")({
  head: () => ({ meta: [{ title: "Profile — TRYB" }] }),
  component: OtherProfile,
});

function OtherProfile() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{ organized: number; completed: number } | null>(null);
  const [mutualTrips, setMutualTrips] = useState<MutualTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      if (u.user.id === userId) {
        navigate({ to: "/profile" });
        return;
      }

      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, bio, location, travel_personality, created_at, email_verified, response_time_expectation")
        .eq("id", userId)
        .maybeSingle();
      setProfile(prof as Profile | null);

      const { data: organizedTrips } = await supabase.from("trips").select("end_date").eq("organizer_id", userId);
      const today = new Date().toISOString().slice(0, 10);
      setStats({
        organized: organizedTrips?.length ?? 0,
        completed: (organizedTrips ?? []).filter((t) => t.end_date < today).length,
      });

      const { data: myRows } = await supabase.from("trip_members").select("trip_id").eq("user_id", u.user.id).eq("status", "approved");
      const myTripIds = (myRows ?? []).map((r) => r.trip_id);
      const { data: overlapRows } = myTripIds.length
        ? await supabase.from("trip_members").select("trip_id").eq("user_id", userId).eq("status", "approved").in("trip_id", myTripIds)
        : { data: [] as { trip_id: string }[] };
      const mutualTripIds = (overlapRows ?? []).map((r) => r.trip_id);
      const { data: mutualTripsData } = mutualTripIds.length
        ? await supabase.from("trips").select("id, destination, cover_image, start_date, end_date").in("id", mutualTripIds)
        : { data: [] as MutualTrip[] };
      setMutualTrips((mutualTripsData ?? []) as MutualTrip[]);

      setLoading(false);
    })();
  }, [userId, navigate]);

  if (loading || !profile) {
    return <div className="tryb-theme min-h-screen bg-background" />;
  }

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-32 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      <main className="mx-auto max-w-2xl px-5 pb-10 pt-6">
        <div className="flex items-center justify-between">
          <Link to="/home" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back
          </Link>
          <button
            onClick={() => setReportOpen(true)}
            aria-label="Report this user"
            className="grid size-9 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft"
          >
            <Flag className="size-4" />
          </button>
        </div>

        <FadeIn className="mt-5 flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="size-20 rounded-full object-cover" />
          ) : (
            <div className="grid size-20 place-items-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
              {(profile.full_name ?? "?").slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="display text-2xl font-semibold text-foreground">
              {profile.full_name}
              {profile.email_verified && <span className="ml-1.5 text-base font-semibold text-primary">✓</span>}
            </h1>
            {profile.travel_personality && (
              <span className="mt-1 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                {profile.travel_personality}
              </span>
            )}
            <p className="mt-1 text-xs text-muted-foreground/70">{formatMemberSince(profile.created_at)}</p>
            {profile.response_time_expectation && (
              <p className="mt-1 text-xs text-muted-foreground">{RESPONSE_TIME_LABELS[profile.response_time_expectation]}</p>
            )}
          </div>
        </FadeIn>

        {profile.bio && <p className="mt-4 text-sm text-muted-foreground">{profile.bio}</p>}
        {profile.location && (
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3" />
            {profile.location}
          </p>
        )}

        {stats && (
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-border bg-card py-3 text-center shadow-soft">
              <div className="display text-xl font-semibold text-foreground">{stats.organized}</div>
              <div className="text-[11px] text-muted-foreground">Organized</div>
            </div>
            <div className="rounded-2xl border border-border bg-card py-3 text-center shadow-soft">
              <div className="display text-xl font-semibold text-foreground">{stats.completed}</div>
              <div className="text-[11px] text-muted-foreground">Completed</div>
            </div>
          </div>
        )}

        {mutualTrips.length > 0 && (
          <section className="mt-8">
            <Eyebrow className="mb-3">Trips together ({mutualTrips.length})</Eyebrow>
            <div className="space-y-2">
              {mutualTrips.map((t) => {
                const cover = t.cover_image ?? DESTINATIONS[0].image;
                return (
                  <Link
                    key={t.id}
                    to="/trip/$tripId"
                    params={{ tripId: t.id }}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
                  >
                    <img src={cover} alt={t.destination} className="size-12 rounded-xl object-cover" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{t.destination}</p>
                      <p className="text-xs text-muted-foreground">{formatCompactRange(t.start_date, t.end_date)}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>
      <Dock />

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={userId} />
    </div>
  );
}
