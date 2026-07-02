import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowRight, Check, Loader as Loader2, Sparkles } from "lucide-react";
import { INTEREST_TAGS } from "@/lib/destinations";
import { derivePersonality, type QuizAnswers } from "@/lib/personality";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to TRYB" }] }),
  component: Onboarding,
});

type Step = {
  key: keyof QuizAnswers;
  question: string;
  type: "single" | "multi";
  gradient: string;
  options: { id: string; label: string; image: string; emoji?: string }[];
};

const STEPS: Step[] = [
  {
    key: "travel_style",
    question: "What's your travel style?",
    type: "single",
    gradient: "from-amber-500/30 via-orange-500/20 to-coral/20",
    options: [
      { id: "backpacker", label: "Backpacker", image: "https://images.unsplash.com/photo-1527631746610-bca00a040d60?w=600&q=80" },
      { id: "flashpacker", label: "Flashpacker", image: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80" },
      { id: "comfort", label: "Comfort seeker", image: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&q=80" },
      { id: "nomad", label: "Digital nomad", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=80" },
    ],
  },
  {
    key: "budget_range",
    question: "What's your budget vibe?",
    type: "single",
    gradient: "from-coral/30 via-pink-500/20 to-fuchsia-500/20",
    options: [
      { id: "budget", label: "Budget", emoji: "💸", image: "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=600&q=80" },
      { id: "mid", label: "Mid-range", emoji: "💳", image: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80" },
      { id: "luxury", label: "Luxury", emoji: "💎", image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=600&q=80" },
      { id: "no-limit", label: "No limit", emoji: "🚀", image: "https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=600&q=80" },
    ],
  },
  {
    key: "vibe",
    question: "Pick a vibe.",
    type: "single",
    gradient: "from-teal-500/30 via-cyan-500/20 to-blue-500/20",
    options: [
      { id: "adventure", label: "Adventure", image: "https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80" },
      { id: "relaxed", label: "Relaxed", image: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&q=80" },
      { id: "cultural", label: "Cultural", image: "https://images.unsplash.com/photo-1545569310-c55c1f95a9b5?w=600&q=80" },
      { id: "party", label: "Party", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=80" },
    ],
  },
  {
    key: "group_preference",
    question: "Solo or squad?",
    type: "single",
    gradient: "from-violet-500/30 via-purple-500/20 to-indigo-500/20",
    options: [
      { id: "solo", label: "Mostly solo", image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=600&q=80" },
      { id: "small-group", label: "Small group", image: "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&q=80" },
      { id: "party", label: "The bigger the better", image: "https://images.unsplash.com/photo-1496337589254-7e19d01cec44?w=600&q=80" },
      { id: "flexible", label: "Depends on the trip", image: "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600&q=80" },
    ],
  },
  {
    key: "interests",
    question: "Pick 3 things you love.",
    type: "multi",
    gradient: "from-blue-500/30 via-indigo-500/20 to-violet-500/20",
    options: INTEREST_TAGS.map((t) => ({
      id: t.id,
      label: t.label,
      emoji: t.emoji,
      image: "",
    })),
  },
];

function Onboarding() {
  const navigate = useNavigate();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({ interests: [] });
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const step = STEPS[idx];
  const progress = ((idx + (done ? 1 : 0)) / STEPS.length) * 100;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth", search: { mode: "login" } });
    });
  }, [navigate]);

  function selectOption(optId: string) {
    if (step.type === "multi") {
      const current = (answers.interests ?? []) as string[];
      const next = current.includes(optId)
        ? current.filter((x) => x !== optId)
        : current.length >= 3 ? current : [...current, optId];
      setAnswers({ ...answers, interests: next });
    } else {
      const next = { ...answers, [step.key]: optId } as Partial<QuizAnswers>;
      setAnswers(next);
      setTimeout(() => goNext(next), 250);
    }
  }

  function goNext(state = answers) {
    if (idx < STEPS.length - 1) setIdx(idx + 1);
    else finalize(state);
  }

   async function finalize(state: Partial<QuizAnswers>) {
    console.log("FINALIZE CALLED");
  
  if (saving) return;
    setSaving(true);
    setDone(true);
    const personality = derivePersonality(state);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
const { error } = await supabase
  .from("profiles")
  .upsert({
    id: u.user.id,
    full_name: u.user.user_metadata?.full_name ?? "",
    travel_style: state.travel_style ?? null,
    budget_range: state.budget_range ?? null,
    vibe: state.vibe ?? null,
    group_preference: state.group_preference ?? null,
    interests: state.interests ?? [],
    travel_personality: personality,
    onboarding_completed: true,
  });
console.log("UPSERT ERROR:", error);
   
   if (error) throw error;
      setSaving(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save");
      setSaving(false);
      setDone(false);
      return;
    }
  }

  const personality = derivePersonality(answers);
  const multiSelected = (answers.interests ?? []) as string[];
  const canAdvanceMulti = step.type === "multi" && multiSelected.length >= 3;

  return (
    <div className={`relative min-h-screen overflow-hidden bg-background transition-colors duration-700 bg-gradient-to-br ${step.gradient}`}>
      <div className="fixed inset-x-0 top-0 z-50 h-1 bg-glass-border">
        <div className="h-full bg-gradient-to-r from-primary to-coral transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {done ? (
        <FinalReveal personality={personality} onContinue={() => navigate({ to: "/home" })} loading={saving} />
      ) : (
        <div key={idx} className="animate-fade-up mx-auto flex min-h-screen max-w-3xl flex-col px-6 pt-20 pb-10">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Step {idx + 1} of {STEPS.length}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight md:text-5xl">
            {step.question}
          </h2>

          {step.type === "multi" ? (
            <div className="mt-8 flex flex-wrap gap-3">
              {step.options.map((opt) => {
                const active = multiSelected.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(opt.id)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      active
                        ? "border-primary bg-primary text-primary-foreground scale-105"
                        : "border-glass-border bg-surface hover:bg-surface-elevated"
                    }`}
                  >
                    <span className="mr-1.5">{opt.emoji}</span>{opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-8 grid grid-cols-2 gap-3 md:gap-4">
              {step.options.map((opt) => {
                const active = answers[step.key] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => selectOption(opt.id)}
                    className={`group relative aspect-[4/5] overflow-hidden rounded-3xl border-2 transition ${
                      active ? "border-primary scale-[1.02]" : "border-transparent"
                    }`}
                  >
                    <img src={opt.image} alt={opt.label} className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                    {active && (
                      <div className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 p-4 text-left">
                      <p className="font-display text-lg font-semibold text-white">
                        {opt.emoji && <span className="mr-1">{opt.emoji}</span>}{opt.label}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {step.type === "multi" && (
            <button
              onClick={() => goNext()}
              disabled={!canAdvanceMulti}
              className="mt-8 inline-flex items-center justify-center gap-2 self-start rounded-full bg-primary px-8 py-3.5 font-semibold text-primary-foreground transition disabled:opacity-40"
            >
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function FinalReveal({ personality, onContinue, loading }: { personality: string; onContinue: () => void; loading: boolean }) {
  return (
    <div className="animate-fade-up mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-6 text-center">
      <Sparkles className="h-10 w-10 text-primary" />
      <p className="mt-4 text-sm uppercase tracking-widest text-muted-foreground">You are a</p>
      <h1 className="mt-2 font-display text-5xl font-bold leading-tight text-gradient md:text-7xl">
        {personality}
      </h1>
      <div className="glass-card mt-8 w-full rounded-3xl p-6 text-left">
        <p className="text-sm text-muted-foreground">We'll use this to match you with trips and people that fit your style.</p>
      </div>
      <button
        onClick={onContinue}
        disabled={loading}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-10 py-4 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:scale-[1.03] disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Enter TRYB <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}
