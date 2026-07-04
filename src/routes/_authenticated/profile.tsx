import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { LogOut, Settings, MapPin, X, Loader as Loader2, Camera, Palette, ChevronRight } from "lucide-react";
import { DESTINATIONS, INTEREST_TAGS } from "@/lib/destinations";
import { useAppTheme } from "@/lib/theme-context";
import { SEASON_THEMES, DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { ThemePickerModal } from "@/components/theme-picker-modal";

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
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const currentSeason = SEASON_THEMES.find((t) => t.id === (themePreference ?? DEFAULT_SEASON_THEME))!;
  const [themePickerOpen, setThemePickerOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [organizedTrips, setOrganizedTrips] = useState<any[]>([]);
  const [historyTrips, setHistoryTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [tab, setTab] = useState<"history" | "saved">("history");
  const [editOpen, setEditOpen] = useState(false);

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

      // Real trip history — organized OR joined, not just organized (the
      // organizer role also gets a trip_members row via a DB trigger, so
      // this one query covers both). Completed = end_date already passed.
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
      <div className={`${themeClassName} min-h-screen bg-sand`}>
        <div className="mx-auto max-w-2xl px-5 pt-2">
          <div className="skeleton-fomo h-56 w-full rounded-3xl" />
          <div className="skeleton-fomo -mt-14 ml-5 h-28 w-28 rounded-full" />
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton-fomo h-16 rounded-2xl" />
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
    <div className={`${themeClassName} relative min-h-screen`}>
      <TopBar avatarUrl={profile.avatar_url} name={profile.full_name} />
      <main className="mx-auto max-w-2xl">
        {/* ===== Identity zone — the credibility layer, kept prominent ===== */}
        <div className="relative h-56 overflow-hidden">
          <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          <div className="via-sand/40 to-sand absolute inset-0 bg-gradient-to-b from-transparent" />
        </div>

        <div className="relative -mt-16 px-5">
          <div className="bg-cream grid h-28 w-28 place-items-center overflow-hidden rounded-full ring-4 ring-primary shadow-2xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="fomo-heading text-primary text-3xl font-bold">{(profile.full_name ?? "?").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <h1 className="fomo-heading text-ink mt-4 text-2xl font-bold">{profile.full_name}</h1>
          {profile.travel_personality && (
            <span className="bg-primary/15 text-primary mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold">
              {profile.travel_personality}
            </span>
          )}
          {profile.bio && <p className="mt-2 text-sm text-ink/60">{profile.bio}</p>}
          {profile.location && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink/50">
              <MapPin className="h-3 w-3" />
              {profile.location}
            </p>
          )}

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat n={organizedTrips.length} label="Organized" />
            <Stat n={historyTrips.length} label="Completed" />
            <Stat n={countriesVisited} label="Countries" />
          </div>

          {interestLabels.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {interestLabels.map((i) => (
                <span key={i.id} className="bg-ink/5 text-ink rounded-full px-3 py-1 text-xs">
                  {i.emoji} {i.label}
                </span>
              ))}
            </div>
          )}

          {/* ===== Trip history / saved — still identity content, the
              actual trust layer for a product where strangers join each
              other's trips ===== */}
          <div className="mt-6 flex border-b border-ink/10">
            {(["history", "saved"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 pb-3 text-sm font-medium capitalize transition ${
                  tab === t ? "border-primary text-ink border-b-2" : "text-ink/40"
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
                  <p className="text-sm text-ink/50">Your story starts with your first trip.</p>
                  <Link to="/discover" className="bg-primary text-cream mt-4 inline-block rounded-full px-5 py-2.5 text-sm font-semibold">
                    Find a trip
                  </Link>
                </div>
              ) : (
                <TripGrid trips={historyTrips} />
              )
            ) : savedTrips.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink/50">No saved trips yet — bookmark trips from the feed.</p>
            ) : (
              <TripGrid trips={savedTrips} />
            )}
          </div>

          {/* ===== Settings zone — de-emphasized, pushed to the bottom,
              deliberately quieter than everything above ===== */}
          <div className="border-t border-ink/10 pt-5">
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-ink/40">Settings</p>
            <div className="space-y-2 pb-10">
              <button
                onClick={() => setEditOpen(true)}
                className="warm-card text-ink/70 flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm transition hover:bg-ink/5"
              >
                <Settings className="h-4 w-4" /> Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setThemePickerOpen(true)}
                className="warm-card flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm transition hover:bg-ink/5"
              >
                <span className="text-ink/70 flex items-center gap-2">
                  <Palette className="h-4 w-4" /> Vibe
                </span>
                <span className="text-ink flex items-center gap-1 font-medium">
                  {currentSeason.label}
                  <ChevronRight className="h-3.5 w-3.5 text-ink/40" />
                </span>
              </button>
              <button
                onClick={signOut}
                className="warm-card text-ink/50 flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-sm transition hover:text-destructive"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />

      {editOpen && (
        <EditProfileModal
          profile={profile}
          onClose={() => setEditOpen(false)}
          onSave={(updated) => { setProfile(updated); setEditOpen(false); }}
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
    </div>
  );
}

function TripGrid({ trips }: { trips: any[] }) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {trips.map((t) => (
        <Link key={t.id} to="/trip/$tripId" params={{ tripId: t.id }}
          className="relative aspect-square overflow-hidden rounded-lg">
          {t.cover_image ? (
            <img src={t.cover_image} alt={t.destination} className="h-full w-full object-cover" />
          ) : (
            <div className="bg-ink/10 flex h-full w-full items-center justify-center">
              <span className="fomo-heading text-xl font-bold text-ink/40">{t.destination?.slice(0, 1)}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2">
            <p className="text-[10px] font-semibold text-white line-clamp-1">{t.destination}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  return (
    <div className="warm-card rounded-2xl py-3 text-center">
      <div className="fomo-heading text-ink text-xl font-bold">{n}</div>
      <div className="text-[11px] text-ink/50">{label}</div>
    </div>
  );
}

function EditProfileModal({ profile, onClose, onSave }: {
  profile: any;
  onClose: () => void;
  onSave: (updated: any) => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [location, setLocation] = useState(profile.location ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
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
      .update({ full_name: fullName.trim(), bio: bio.trim() || null, location: location.trim() || null, avatar_url: avatarUrl.trim() || null })
      .eq("id", profile.id)
      .select()
      .maybeSingle();
    setSaving(false);
    if (error) { toast.error("Couldn't save changes."); return; }
    toast.success("Profile updated!");
    onSave(data);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="warm-card text-ink relative z-10 w-full max-w-lg rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="fomo-heading text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="hover:text-ink grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-ink/50 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-ink/10 bg-ink/5 px-4 py-3 text-sm text-ink outline-none transition focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little about you…"
              rows={3}
              className="w-full resize-none rounded-xl border border-ink/10 bg-ink/5 px-4 py-3 text-sm text-ink outline-none transition focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-xl border border-ink/10 bg-ink/5 px-4 py-3 text-sm text-ink outline-none transition focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-ink/50">Photo</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="group bg-ink/5 ring-ink/10 relative grid h-16 w-16 flex-shrink-0 place-items-center overflow-hidden rounded-full ring-1 disabled:opacity-60"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar preview" className="h-full w-full object-cover" />
                ) : (
                  <span className="fomo-heading text-primary text-lg font-bold">
                    {(fullName || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="warm-card text-ink rounded-full px-4 py-2 text-xs font-medium transition hover:bg-ink/5 disabled:opacity-60"
              >
                {uploadingAvatar ? "Uploading…" : "Change photo"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="hover:bg-ink/5 flex-1 rounded-full border border-ink/10 py-3 text-sm font-medium text-ink transition">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="bg-primary text-cream flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
