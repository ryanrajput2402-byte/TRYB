import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TopBar } from "@/components/top-bar";
import { BottomNav } from "@/components/bottom-nav";
import { toast } from "sonner";
import { LogOut, Settings, MapPin, X, Loader as Loader2 } from "lucide-react";
import { DESTINATIONS, INTEREST_TAGS } from "@/lib/destinations";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — TRYB" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [trips, setTrips] = useState<any[]>([]);
  const [savedTrips, setSavedTrips] = useState<any[]>([]);
  const [tab, setTab] = useState<"trips" | "saved">("trips");
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
 const [profileRes, tripsRes, savedRes] = await Promise.all([
  supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
  supabase.from("trips").select("*").eq("organizer_id", u.user.id).order("created_at", { ascending: false }),
  supabase.from("saved_trips").select("trip_id, trips(*)").eq("user_id", u.user.id).order("saved_at", { ascending: false }),
]);

console.log("PROFILE DATA:", profileRes.data);
console.log("PROFILE ERROR:", profileRes.error);

console.log("TRIPS DATA:", tripsRes.data);
console.log("TRIPS ERROR:", tripsRes.error);

console.log("SAVED DATA:", savedRes.data);
console.log("SAVED ERROR:", savedRes.error);

setProfile(profileRes.data);
setTrips(tripsRes.data ?? []);
setSavedTrips((savedRes.data ?? []).map((r: any) => r.trips).filter(Boolean));    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }
  
  console.log("PROFILE DATA:", profile);

  if (!profile) return <div className="min-h-screen bg-background" />;

  const heroImg = trips[0]?.cover_image ?? DESTINATIONS[0].image;
  const interestLabels = INTEREST_TAGS.filter((i) => (profile.interests ?? []).includes(i.id));

  return (
    <>
      <TopBar avatarUrl={profile.avatar_url} name={profile.full_name} />
      <main className="mx-auto max-w-2xl">
        <div className="relative h-56 overflow-hidden">
          <img src={heroImg} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/40 to-background" />
        </div>

        <div className="relative -mt-16 px-5">
          <div className="grid h-28 w-28 place-items-center overflow-hidden rounded-full bg-surface ring-4 ring-primary shadow-2xl">
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.full_name} className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-3xl font-bold text-primary">{(profile.full_name ?? "?").slice(0, 1).toUpperCase()}</span>
            )}
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold">{profile.full_name}</h1>
          {profile.travel_personality && (
            <span className="mt-2 inline-block rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">
              {profile.travel_personality}
            </span>
          )}
          {profile.bio && <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>}
          {profile.location && (
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />{profile.location}
            </p>
          )}

          <div className="mt-5 grid grid-cols-3 gap-3">
            <Stat n={trips.length} label="Trips" />
            <Stat n={profile.countries_count ?? 0} label="Countries" />
            <Stat n={savedTrips.length} label="Saved" />
          </div>

          {interestLabels.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {interestLabels.map((i) => (
                <span key={i.id} className="rounded-full bg-surface px-3 py-1 text-xs">{i.emoji} {i.label}</span>
              ))}
            </div>
          )}

          <div className="mt-5 flex gap-2">
            <button
              onClick={() => setEditOpen(true)}
              className="glass-card flex-1 rounded-full py-2.5 text-sm font-medium hover:bg-surface-elevated transition"
            >
              <Settings className="mr-1.5 inline h-4 w-4" /> Edit Profile
            </button>
            <button onClick={signOut} className="grid h-10 w-10 place-items-center rounded-full bg-surface text-muted-foreground hover:text-destructive transition">
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6 flex border-b border-glass-border">
            {(["trips", "saved"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 pb-3 text-sm font-medium capitalize transition ${tab === t ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          <div className="mt-4 pb-10">
            {tab === "trips" ? (
              trips.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No trips yet — create your first one.</p>
              ) : (
                <TripGrid trips={trips} />
              )
            ) : (
              savedTrips.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No saved trips yet — bookmark trips from the feed.</p>
              ) : (
                <TripGrid trips={savedTrips} />
              )
            )}
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
    </>
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
            <div className="h-full w-full bg-gradient-to-br from-primary/40 to-coral/40 flex items-center justify-center">
              <span className="font-display text-xl font-bold text-white">{t.destination?.slice(0, 1)}</span>
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
    <div className="glass-card rounded-2xl py-3 text-center">
      <div className="font-display text-xl font-bold">{n}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
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
      <div className="glass-card relative z-10 w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Edit Profile</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-surface text-muted-foreground hover:text-foreground transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-glass-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little about you…"
              rows={3}
              className="w-full resize-none rounded-xl border border-glass-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Location</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              className="w-full rounded-xl border border-glass-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary transition"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wide">Avatar URL</label>
            <input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://…"
              type="url"
              className="w-full rounded-xl border border-glass-border bg-surface px-4 py-3 text-sm outline-none focus:border-primary transition"
            />
            {avatarUrl && (
              <div className="mt-2 flex items-center gap-3">
                <img src={avatarUrl} alt="Preview" className="h-12 w-12 rounded-full object-cover border border-glass-border" onError={(e) => (e.currentTarget.style.display = "none")} />
                <span className="text-xs text-muted-foreground">Preview</span>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-full border border-glass-border py-3 text-sm font-medium transition hover:bg-surface">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="flex-1 rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}
