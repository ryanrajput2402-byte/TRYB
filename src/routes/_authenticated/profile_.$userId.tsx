import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { ReportModal } from "@/components/report-modal";
import { ArrowLeft, Flag, MapPin } from "lucide-react";
import { DESTINATIONS } from "@/lib/destinations";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { formatMemberSince, formatCompactRange } from "@/lib/format-date";
import { RESPONSE_TIME_LABELS } from "@/lib/profile-badges";

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
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<{ organized: number; completed: number } | null>(null);
  const [mutualTrips, setMutualTrips] = useState<MutualTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      // Viewing your own id here just goes to the real (editable) profile page.
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

      // Organizer trust stats — same real definition used everywhere else
      // (trips organized = organizer_id count, completed = end_date passed).
      // Only ever sees what RLS already allows (public trips, or ones we
      // overlap on) — never a fabricated/estimated total.
      const { data: organizedTrips } = await supabase
        .from("trips")
        .select("end_date")
        .eq("organizer_id", userId);
      const today = new Date().toISOString().slice(0, 10);
      setStats({
        organized: organizedTrips?.length ?? 0,
        completed: (organizedTrips ?? []).filter((t) => t.end_date < today).length,
      });

      // Mutual trip history — real intersection only. RLS on trip_members
      // only lets us read rows where we're the organizer, an approved
      // member, or the row is our own, so this can never surface a
      // stranger's history — only trips we were both actually approved on.
      const { data: myRows } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", u.user.id)
        .eq("status", "approved");
      const myTripIds = (myRows ?? []).map((r) => r.trip_id);
      const { data: overlapRows } = myTripIds.length
        ? await supabase
            .from("trip_members")
            .select("trip_id")
            .eq("user_id", userId)
            .eq("status", "approved")
            .in("trip_id", myTripIds)
        : { data: [] as { trip_id: string }[] };
      const mutualTripIds = (overlapRows ?? []).map((r) => r.trip_id);
      const { data: mutualTripsData } = mutualTripIds.length
        ? await supabase
            .from("trips")
            .select("id, destination, cover_image, start_date, end_date")
            .in("id", mutualTripIds)
        : { data: [] as MutualTrip[] };
      setMutualTrips((mutualTripsData ?? []) as MutualTrip[]);

      setLoading(false);
    })();
  }, [userId, navigate]);

  if (loading || !profile) {
    return <div className={`${themeClassName} min-h-screen`} />;
  }

  return (
    <div className={`${themeClassName} relative min-h-screen`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative" style={{ zIndex: 2 }}>
        <TopBar />
        <main className="mx-auto max-w-2xl px-5 pb-10 pt-2">
          <div className="flex items-center justify-between">
            <Link to="/home" className="text-ink/60 hover:text-ink inline-flex items-center gap-1.5 text-sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <button
              onClick={() => setReportOpen(true)}
              aria-label="Report this user"
              className="warm-card text-ink/60 grid h-9 w-9 place-items-center rounded-full"
            >
              <Flag className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-4">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
                {(profile.full_name ?? "?").slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="fomo-heading text-ink text-2xl font-bold">
                {profile.full_name}
                {profile.email_verified && <span className="text-pine ml-1.5 text-base font-semibold">✓</span>}
              </h1>
              {profile.travel_personality && (
                <span className="bg-primary/15 text-primary mt-1 inline-block rounded-full px-3 py-1 text-xs font-semibold">
                  {profile.travel_personality}
                </span>
              )}
              <p className="mt-1 text-xs text-ink/40">{formatMemberSince(profile.created_at)}</p>
              {profile.response_time_expectation && (
                <p className="mt-1 text-xs text-ink/50">{RESPONSE_TIME_LABELS[profile.response_time_expectation]}</p>
              )}
            </div>
          </div>

          {profile.bio && <p className="mt-4 text-sm text-ink/60">{profile.bio}</p>}
          {profile.location && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink/50">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </p>
          )}

          {stats && (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="warm-card rounded-2xl py-3 text-center">
                <div className="fomo-heading text-ink text-xl font-bold">{stats.organized}</div>
                <div className="text-[11px] text-ink/50">Organized</div>
              </div>
              <div className="warm-card rounded-2xl py-3 text-center">
                <div className="fomo-heading text-ink text-xl font-bold">{stats.completed}</div>
                <div className="text-[11px] text-ink/50">Completed</div>
              </div>
            </div>
          )}

          {/* Item 9 — only rendered when a real overlap exists; never a
              forced "0 trips together" empty state. */}
          {mutualTrips.length > 0 && (
            <section className="mt-8">
              <h2 className="fomo-heading text-ink mb-3 text-lg font-semibold">
                Trips together ({mutualTrips.length})
              </h2>
              <div className="space-y-2">
                {mutualTrips.map((t) => {
                  const cover = t.cover_image ?? DESTINATIONS[0].image;
                  return (
                    <Link
                      key={t.id}
                      to="/trip/$tripId"
                      params={{ tripId: t.id }}
                      className="warm-card flex items-center gap-3 rounded-2xl p-3"
                    >
                      <img src={cover} alt={t.destination} className="h-12 w-12 rounded-xl object-cover" />
                      <div className="min-w-0">
                        <p className="text-ink truncate font-semibold text-sm">{t.destination}</p>
                        <p className="text-xs text-ink/50">{formatCompactRange(t.start_date, t.end_date)}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </main>
        <BottomNav />
      </div>

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} targetType="user" targetId={userId} />
    </div>
  );
}
