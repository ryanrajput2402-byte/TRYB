import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Loader as Loader2 } from "lucide-react";
import { DESTINATIONS, FEATURED_DESTINATION_SLUGS, findDestination } from "@/lib/destinations";
import { costPerPerson } from "@/lib/trip-urgency";
import { useThemePreference } from "@/lib/use-theme-preference";
import { SEASON_THEMES, DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { deriveIdentity, GroupPreference } from "@/lib/personality";
import { trackEvent } from "@/lib/analytics";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to TRYB" }] }),
  component: Onboarding,
});

type Step = "solo-group" | "season" | "destination" | "payoff" | "close";

type RealMatch = {
  id: string;
  destination: string;
  cover_image: string | null;
  start_date: string;
  end_date: string;
  max_members: number;
  budget_min: number | null;
  budget_max: number | null;
  going: number;
};

type DestChip = { name: string; image: string; flag: string };

function Onboarding() {
  const navigate = useNavigate();
  const [me, setMe] = useState<{ id: string; full_name?: string } | null>(null);
  const [step, setStep] = useState<Step>("solo-group");
  const [group, setGroup] = useState<GroupPreference | null>(null);
  const { preference: theme, choose: chooseTheme } = useThemePreference(me?.id ?? null);
  const [destinationPick, setDestinationPick] = useState<string | null>(null);
  const [destinationChips, setDestinationChips] = useState<DestChip[]>([]);
  const [match, setMatch] = useState<RealMatch | null>(null);
  const [checkingMatch, setCheckingMatch] = useState(false);
  const [interestCount, setInterestCount] = useState(0);
  const [alreadyInterested, setAlreadyInterested] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth", search: { mode: "login" } });
      else setMe({ id: data.user.id, full_name: data.user.user_metadata?.full_name });
    });
  }, [navigate]);

  // Real destination chips for Screen 3 — real trips first (by how many
  // exist for that destination), padded with the same featured picks
  // Discover uses if there aren't enough real ones yet. Never fabricated:
  // a padded chip just means "nobody's started this yet," which Screen 4
  // is built to say honestly if tapped.
  useEffect(() => {
    (async () => {
      const { data: trips } = await supabase.from("trips").select("destination").eq("privacy", "public").limit(60);
      const counts = new Map<string, number>();
      (trips ?? []).forEach((t: any) => counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1));
      // Only surface a real trip's destination as a chip if it resolves to
      // a real curated photo — falling back to a placeholder image would
      // mean showing the wrong place's picture (e.g. Bali's photo under a
      // destination that isn't Bali), which is worse than just not
      // featuring that destination this round.
      const real: DestChip[] = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => ({ name, dest: findDestination(name) }))
        .filter((r): r is { name: string; dest: NonNullable<ReturnType<typeof findDestination>> } => !!r.dest)
        .slice(0, 4)
        .map(({ name, dest }) => ({ name, image: dest.image, flag: dest.flag }));
      const usedNames = new Set(real.map((r) => r.name));
      const padding: DestChip[] = FEATURED_DESTINATION_SLUGS.map((slug) => DESTINATIONS.find((d) => d.slug === slug)!)
        .filter((d) => !usedNames.has(d.name))
        .slice(0, Math.max(0, 6 - real.length))
        .map((d) => ({ name: d.name, image: d.image, flag: d.flag }));
      setDestinationChips([...real, ...padding]);
    })();
  }, []);

  const finalTheme = theme ?? DEFAULT_SEASON_THEME;
  const themeClassName = seasonThemeClassName(finalTheme);

  function pickGroup(g: GroupPreference) {
    setGroup(g);
    trackEvent({ name: "onboarding_step_reached", step: "season" });
    setTimeout(() => setStep("season"), 200);
  }

  function pickSeason(id: typeof SEASON_THEMES[number]["id"]) {
    chooseTheme(id);
    trackEvent({ name: "onboarding_step_reached", step: "destination" });
    setTimeout(() => setStep("destination"), 250);
  }

  async function pickDestination(name: string) {
    setDestinationPick(name);
    setCheckingMatch(true);
    setStep("payoff");
    trackEvent({ name: "discover_filter_used", filterType: "destination", value: name });
    trackEvent({ name: "onboarding_step_reached", step: "payoff" });

    const { data: trips } = await supabase
      .from("trips")
      .select("id, destination, cover_image, start_date, end_date, max_members, budget_min, budget_max, solo_friendly")
      .eq("privacy", "public")
      .eq("destination", name);

    let best: any = null;
    if (trips && trips.length > 0) {
      best = [...trips].sort((a, b) => {
        if (group === "solo") {
          if (a.solo_friendly && !b.solo_friendly) return -1;
          if (!a.solo_friendly && b.solo_friendly) return 1;
        }
        return 0;
      })[0];
    }

    if (best) {
      const { count } = await supabase
        .from("trip_members")
        .select("id", { count: "exact", head: true })
        .eq("trip_id", best.id)
        .eq("status", "approved");
      setMatch({ ...best, going: count ?? 0 });
    } else {
      setMatch(null);
      const { data: interestRows } = await supabase.from("destination_interest").select("user_id").eq("destination", name);
      setInterestCount((interestRows ?? []).length);
      setAlreadyInterested((interestRows ?? []).some((r: any) => r.user_id === me?.id));
    }
    setCheckingMatch(false);
  }

  async function registerInterest() {
    if (!me || !destinationPick || alreadyInterested) return;
    setAlreadyInterested(true);
    setInterestCount((c) => c + 1);
    try {
      const { error } = await supabase.from("destination_interest").insert({ user_id: me.id, destination: destinationPick });
      if (error) throw error;
      trackEvent({ name: "destination_interest_registered", destination: destinationPick });
    } catch {
      // Real state already reflects intent; a refresh reconciles if this failed.
    }
  }

  async function finish() {
    if (!me || saving || !group) return;
    setSaving(true);
    const identity = deriveIdentity(finalTheme, group);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: me.id,
        full_name: me.full_name ?? "",
        group_preference: group,
        travel_personality: identity,
        onboarding_completed: true,
      });
      if (error) throw error;
      trackEvent({ name: "onboarding_completed", matched: !!match });
      if (match) navigate({ to: "/trip/$tripId", params: { tripId: match.id } });
      else navigate({ to: "/create", search: destinationPick ? { destination: destinationPick } : undefined });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
      setSaving(false);
    }
  }

  const identity = deriveIdentity(finalTheme, group ?? "flexible");
  const pp = match ? costPerPerson(match) : null;

  return (
    <div className={`${themeClassName} relative min-h-screen overflow-hidden bg-sand transition-colors duration-500`}>
      <div className="warm-aurora" aria-hidden />
      <div className="fomo-grain" aria-hidden />
      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-6 pb-10 pt-14" style={{ zIndex: 2 }}>
        {step === "solo-group" && (
          <StepFrame eyebrow="Step 1 of 5">
            <h1 className="fomo-heading text-ink text-3xl font-bold leading-tight">Solo, or bringing your people?</h1>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <TapCard label="Just me" emoji="🧍" onClick={() => pickGroup("solo")} />
              <TapCard label="With my people" emoji="👥" onClick={() => pickGroup("flexible")} />
            </div>
          </StepFrame>
        )}

        {step === "season" && (
          <StepFrame eyebrow="Step 2 of 5">
            <h1 className="fomo-heading text-ink text-3xl font-bold leading-tight">
              Every trip has a season. Which one's you?
            </h1>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {SEASON_THEMES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => pickSeason(s.id)}
                  className={`${s.className} shadow-warm rounded-2xl bg-sand p-3 text-left transition hover:-translate-y-0.5 active:scale-[0.98]`}
                >
                  <div className="space-y-1.5 rounded-xl bg-cream p-2">
                    <div className="shadow-warm-sm w-3/4 rounded-full bg-cream px-2 py-1 text-[9px] text-ink/70">hey! so hyped</div>
                    <div className="bg-clay ml-auto w-3/4 rounded-full px-2 py-1 text-right text-[9px] text-white">same, let's go</div>
                  </div>
                  <p className="fomo-heading mt-2 text-sm font-bold text-ink">{s.label}</p>
                  <p className="text-[11px] text-ink/50">{s.mood}</p>
                </button>
              ))}
            </div>
          </StepFrame>
        )}

        {step === "destination" && (
          <StepFrame eyebrow="Step 3 of 5">
            <h1 className="fomo-heading text-ink text-3xl font-bold leading-tight">Where's pulling at you lately?</h1>
            <div className="mt-8 grid grid-cols-2 gap-3">
              {destinationChips.map((d) => (
                <button
                  key={d.name}
                  onClick={() => pickDestination(d.name)}
                  className="group relative aspect-[4/5] overflow-hidden rounded-3xl border-2 border-transparent transition hover:border-primary"
                >
                  <img src={d.image} alt={d.name} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                    <p className="fomo-heading text-lg font-semibold text-white">
                      {d.flag} {d.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </StepFrame>
        )}

        {step === "payoff" && (
          <StepFrame eyebrow="Step 4 of 5">
            {checkingMatch ? (
              <div className="flex flex-1 items-center justify-center py-20">
                <Loader2 className="text-primary h-6 w-6 animate-spin" />
              </div>
            ) : match ? (
              <>
                <h1 className="fomo-heading text-ink text-2xl font-bold leading-tight">People are already planning this.</h1>
                <div className="shadow-warm mt-5 overflow-hidden rounded-3xl">
                  <div className="relative h-40">
                    <img
                      src={match.cover_image ?? findDestination(match.destination)?.image ?? DESTINATIONS[0].image}
                      alt={match.destination}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="fomo-heading text-xl font-bold text-white">{match.destination}</p>
                      <p className="text-xs text-white/70">
                        {match.going} going · {match.max_members - match.going} spot{match.max_members - match.going === 1 ? "" : "s"} left
                      </p>
                    </div>
                  </div>
                </div>
                {pp && (
                  <div className="mt-4 flex items-end gap-2">
                    <div className="h-7 w-7 flex-shrink-0 rounded-full p-[1.5px]" style={{ background: "var(--gradient-earth-soft)" }}>
                      <div className="bg-cream grid h-full w-full place-items-center rounded-full">
                        <Sparkles className="text-pine h-3.5 w-3.5" />
                      </div>
                    </div>
                    <div className="rounded-2xl p-[1px]" style={{ background: "var(--gradient-earth-soft)", boxShadow: "var(--keyo-glow-shadow)" }}>
                      <div className="bg-cream/95 rounded-2xl px-4 py-2.5 text-sm text-ink/90 backdrop-blur-xl">
                        {match.destination}'s ~₹{pp.min}–{pp.max}pp with {match.going} already in.
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="fomo-heading text-ink text-2xl font-bold leading-tight">Nobody's called this yet.</h1>
                <p className="mt-1 text-sm text-ink/60">Be the one who does.</p>
                {!alreadyInterested ? (
                  <button
                    onClick={registerInterest}
                    className="warm-card text-ink mt-5 inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-medium"
                  >
                    I want this too
                  </button>
                ) : (
                  <p className="mt-5 text-sm font-medium text-ink/60">
                    {interestCount <= 1
                      ? `Noted — you're the first to want ${destinationPick}.`
                      : `Noted — you're one of ${interestCount} who want ${destinationPick}.`}
                  </p>
                )}
                <div className="mt-4 flex items-end gap-2">
                  <div className="h-7 w-7 flex-shrink-0 rounded-full p-[1.5px]" style={{ background: "var(--gradient-earth-soft)" }}>
                    <div className="bg-cream grid h-full w-full place-items-center rounded-full">
                      <Sparkles className="text-pine h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="rounded-2xl p-[1px]" style={{ background: "var(--gradient-earth-soft)", boxShadow: "var(--keyo-glow-shadow)" }}>
                    <div className="bg-cream/95 rounded-2xl px-4 py-2.5 text-sm text-ink/90 backdrop-blur-xl">
                      Once it's real, I'll track the dates and split for everyone in it.
                    </div>
                  </div>
                </div>
              </>
            )}
            <p className="mt-4 text-xs text-ink/40">Splits costs. Settles debates. Right in the thread.</p>
            {!checkingMatch && (
              <button
                onClick={() => {
                  trackEvent({ name: "onboarding_step_reached", step: "close" });
                  setStep("close");
                }}
                className="bg-primary text-cream mt-8 inline-flex items-center justify-center gap-2 self-start rounded-full px-6 py-3 text-sm font-semibold"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </StepFrame>
        )}

        {step === "close" && (
          <StepFrame eyebrow="Step 5 of 5">
            <Sparkles className="text-primary h-8 w-8" />
            <p className="mt-4 text-xs font-semibold uppercase tracking-widest text-ink/40">You're a</p>
            <h1 className="fomo-heading text-gradient-earth mt-1 text-4xl font-bold leading-tight sm:text-5xl">{identity}</h1>
            <p className="mt-4 max-w-sm text-sm text-ink/60">
              {match
                ? "Early enough to help shape this, not just use it."
                : `You're not just early to TRYB — you're first to want ${destinationPick} too.`}
            </p>
            <button
              onClick={finish}
              disabled={saving}
              className="bg-primary text-cream mt-8 inline-flex items-center justify-center gap-2 self-start rounded-full px-8 py-4 font-semibold shadow-[var(--shadow-glow)] transition hover:scale-[1.02] disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {match ? `Join ${match.destination}` : "Create your first trip"} <ArrowRight className="h-4 w-4" />
            </button>
          </StepFrame>
        )}
      </div>
    </div>
  );
}

function StepFrame({ eyebrow, children }: { eyebrow: string; children: React.ReactNode }) {
  return (
    <div key={eyebrow} className="animate-fade-up flex flex-1 flex-col">
      <p className="text-xs font-medium uppercase tracking-widest text-ink/40">{eyebrow}</p>
      <div className="mt-3 flex flex-1 flex-col">{children}</div>
    </div>
  );
}

function TapCard({ label, emoji, onClick }: { label: string; emoji: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="warm-card shadow-warm flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-3xl transition hover:-translate-y-0.5 active:scale-[0.98]"
    >
      <span className="text-4xl">{emoji}</span>
      <span className="fomo-heading text-ink text-base font-semibold">{label}</span>
    </button>
  );
}
