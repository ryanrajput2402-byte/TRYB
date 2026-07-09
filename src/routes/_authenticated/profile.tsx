import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Settings, MapPin, X, Loader as Loader2, Camera, Palette, ChevronRight, BookOpen, ShieldCheck } from "lucide-react";
import { DESTINATIONS, INTEREST_TAGS } from "@/lib/destinations";
import { useAppTheme } from "@/lib/theme-context";
import { SEASON_THEMES } from "@/lib/seasonal-themes";
import { ThemePickerModal } from "@/components/theme-picker-modal";
import { formatMemberSince } from "@/lib/format-date";
import { RESPONSE_TIME_LABELS } from "@/lib/profile-badges";
import { Dock } from "@/components/tryb/dock";
import { Eyebrow, PressBtn } from "@/components/tryb/ui-kit";
import { FadeIn } from "@/components/tryb/motion-primitives";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

async function uploadAvatar(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > MAX_AVATAR_BYTES) throw new Error("Image must be under 5MB");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — TRYB" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const { preference: themePreference, choose: chooseTheme } = useAppTheme();
  const currentSeason = SEASON_THEMES.find((t) => t.id === themePreference) ?? SEASON_THEMES[2];
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [organizedTrips, setOrganizedTrips] = useState<any[]>([]);
  const [historyTrips, setHistoryTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [tab, setTab] = useState<"history" | "saved">("history");
  const [editOpen, setEditOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;

      const [profileRes, organizedRes, savedRes, memberRowsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
        supabase.from("trips").select("*").eq("organizer_id", u.user.id).order("created_at", { ascending: false }),
        supabase.from("saved_trips").select("trip_id, trips(*)").eq("user_id", u.user.id).order("saved_at", { ascending: false }),
        supabase.from("trip_members").select("trip_id").eq("user_id", u.user.id).eq("status", "approved"),
      ]);

      setProfile(profileRes.data);
      setOrganizedTrips(organizedRes.data ?? []);
      setSavedTrips((savedRes.data ?? []).map((r: any) => r.trips).filter(Boolean));

      const memberTripIds = (memberRowsRes.data ?? []).map((m) => m.trip_id);
      if (memberTripIds.length > 0) {
        const { data: memberTrips } = await supabase.from("trips").select("*").in("id", memberTripIds);
        const today = new Date().toISOString().slice(0, 10);
        setHistoryTrips((memberTrips ?? []).filter((t: any) => t.end_date < today));
      }
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (!profile) {
    return (
      <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background">
        <div className="mx-auto max-w-2xl px-5 pt-2">
          <div className="skeleton h-56 w-full rounded-3xl" />
          <div className="skeleton -mt-14 ml-5 h-28 w-28 rounded-full" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const heroImg = organizedTrips[0]?.cover_image ?? historyTrips[0]?.cover_image ?? DESTINATIONS[0].image;
  const interestLabels = INTEREST_TAGS.filter((i) => (profile.interests ?? []).includes(i.id));
  const countriesVisited = new Set(historyTrips.map((t) => t.country).filter(Boolean)).size;

  return (
    <div className="tryb-theme relative mx-auto min-h-screen w-full max-w-[620px] bg-background pb-32 shadow-[0_0_120px_oklch(0.2_0.02_60_/_0.06)] sm:border-x sm:border-border/60">
      <main className="mx-auto max-w-2xl">
        {/* Identity zone */}
        <div className="relative h-56 overflow-hidden bg-ink">
          <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="relative -mt-16 px-5">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-card ring-4 ring-primary shadow-lift">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="display text-3xl font-semibold text-primary">{(profile.full_name ?? "?").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <FadeIn>
            <h1 className="display mt-4 text-3xl font-semibold text-foreground">
              {profile.full_name}
              {profile.email_verified && <span className="ml-1.5 text-base font-semibold text-primary">✓</span>}
            </h1>
            {profile.travel_personality && (
              <span className="mt-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
                {profile.travel_personality}
              </span>
            )}
            {profile.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}
            {profile.location && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {profile.location}
              </p>
            )}
            {profile.created_at && <p className="mt-1 text-xs text-muted-foreground/70">{formatMemberSince(profile.created_at)}</p>}
            {profile.response_time_expectation && (
              <p className="mt-1 text-xs text-muted-foreground">{RESPONSE_TIME_LABELS[profile.response_time_expectation]}</p>
            )}
          </FadeIn>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat n={organizedTrips.length} label="Organized" />
            <Stat n={historyTrips.length} label="Completed" />
            <Stat n={countriesVisited} label="Countries" />
          </div>

          {interestLabels.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {interestLabels.map((i) => (
                <span key={i.id} className="rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                  {i.emoji} {i.label}
                </span>
              ))}
            </div>
          )}

          {/* Trip history / saved */}
          <div className="mt-6 flex border-b border-border">
            {(["history", "saved"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 pb-3 text-sm font-medium capitalize transition ${
                  tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"
                }`}
              >
                {t === "history" ? "History" : "Saved"}
              </button>
            ))}
          </div>

          <div className="mt-4 pb-8">
            {tab === "history" ? (
              historyTrips.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-muted-foreground">Your story starts with your first trip.</p>
                  <PressBtn href="/discover" variant="primary" className="mt-4">
                    Find a trip
                  </PressBtn>
                </div>
              ) : (
                <TripGrid trips={historyTrips} />
              )
            ) : savedTrips.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">No saved trips yet — bookmark trips from the feed.</p>
            ) : (
              <TripGrid trips={savedTrips} />
            )}
          </div>

          {/* Settings zone */}
          <div className="border-t border-border pt-5">
            <Eyebrow className="mb-1">Settings</Eyebrow>
            <p className="mb-3 text-[11px] text-muted-foreground">
              We only ever show what you choose to share — your exact location and contact info stay private until
              you&apos;re approved into a trip.
            </p>
            <div className="space-y-2 pb-10">
              <button
                onClick={() => setEditOpen(true)}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground/80 shadow-soft transition hover:bg-muted"
              >
                <Settings className="size-4" /> Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setThemePickerOpen(true)}
                className="flex w-full items-center justify-between rounded-2xl border border-border bg-card px-4 py-3 text-sm shadow-soft transition hover:bg-muted"
              >
                <span className="flex items-center gap-2 text-foreground/80">
                  <Palette className="size-4" /> Vibe
                </span>
                <span className="flex items-center gap-1 font-medium text-foreground">
                  {currentSeason.label}
                  <ChevronRight className="size-3.5 text-muted-foreground" />
                </span>
              </button>
              <button
                type="button"
                onClick={() => setStoryOpen(true)}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground/80 shadow-soft transition hover:bg-muted"
              >
                <BookOpen className="size-4" /> Our story
              </button>
              <button
                type="button"
                onClick={() => setGuidelinesOpen(true)}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground/80 shadow-soft transition hover:bg-muted"
              >
                <ShieldCheck className="size-4" /> Community guidelines
              </button>
              <button
                onClick={signOut}
                className="flex w-full items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-soft transition hover:text-destructive"
              >
                <LogOut className="size-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </main>
      <Dock />

      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={(updated) => {
            setProfile(updated);
            setEditOpen(false);
          }}
        />
      )}

      {themePickerOpen && (
        <ThemePickerModal
          onChoose={(id) => {
            chooseTheme(id);
            setThemePickerOpen(false);
          }}
          onDismiss={() => setThemePickerOpen(false)}
        />
      )}

      {storyOpen && (
        <PlaceholderModal title="Our story" body="[FOUNDER STORY — replace with your own words]" onClose={() => setStoryOpen(false)} />
      )}

      {guidelinesOpen && (
        <PlaceholderModal
          title="Community guidelines"
          body="[COMMUNITY GUIDELINES — replace with your own words]"
          onClose={() => setGuidelinesOpen(false)}
        />
      )}
    </div>
  );
}

function PlaceholderModal({ title, body, onClose }: { title: string; body: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-popover p-6 text-foreground shadow-2xl sm:rounded-3xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="display text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function TripGrid({ trips }: { trips: any[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {trips.map((t) => (
        <Link key={t.id} to="/trip/$tripId" params={{ tripId: t.id }} className="relative aspect-square overflow-hidden rounded-xl">
          {t.cover_image ? (
            <img src={t.cover_image} alt={t.destination} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <span className="display text-xl font-semibold text-muted-foreground">{t.destination?.slice(0, 1)}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="line-clamp-1 text-[10px] font-semibold text-white">{t.destination}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card py-3 text-center shadow-soft">
      <div className="display text-xl font-semibold text-foreground">{n}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}

function EditProfileModal({
  profile,
  onClose,
  onSave,
}: {
  profile: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [responseTime, setResponseTime] = useState<string | null>(profile.response_time_expectation ?? null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const url = await uploadAvatar(profile.id, file);
      setAvatarUrl(url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        location: location.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        response_time_expectation: responseTime,
      })
      .eq("id", profile.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) {
      toast.error("Couldn't save changes.");
      return;
    }
    toast.success("Profile updated!");
    onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-t-3xl bg-popover p-6 text-foreground shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="display text-xl font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little about you…"
              rows={3}
              className="w-full resize-none rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
              As an organizer, how fast do you usually respond?
            </label>
            <div className="flex flex-wrap gap-2">
              {(["fast", "daily", "flexible"] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setResponseTime(responseTime === id ? null : id)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                    responseTime === id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {RESPONSE_TIME_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-muted-foreground">Photo</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="group relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-muted ring-1 ring-border disabled:opacity-60"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="display text-lg font-semibold text-primary">{(fullName || "?").slice(0, 1).toUpperCase()}</span>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  {uploadingAvatar ? <Loader2 className="size-5 animate-spin text-white" /> : <Camera className="size-5 text-white" />}
                </span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="rounded-full border border-border bg-card px-4 py-2 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                {uploadingAvatar ? "Uploading…" : "Change photo"}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-border py-3 text-sm font-medium text-foreground transition hover:bg-muted">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
