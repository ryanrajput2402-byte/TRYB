import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WizardProgress } from "@/components/onboarding/wizard/wizard-progress";
import { RecencyStep } from "@/components/onboarding/wizard/recency-step";
import { IntentStep } from "@/components/onboarding/wizard/intent-step";
import { BeachMountainStep } from "@/components/onboarding/wizard/beach-mountain-step";
import { TagsStep } from "@/components/onboarding/wizard/tags-step";
import { IdentityStep } from "@/components/onboarding/wizard/identity-step";
import { FeedPreviewStep } from "@/components/onboarding/wizard/feed-preview-step";
import { bandForDays, daysAgoToDateString, daysToUrgencySentinel } from "@/lib/onboarding-wizard";
import { deriveTravellerIdentity } from "@/lib/traveller-identity";
import { trackEvent } from "@/lib/analytics";
import type { Database } from "@/integrations/supabase/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome to TRYB" }] }),
  component: Onboarding,
});

// Destination-pick was removed from this wizard entirely (not just followed
// by another screen) — the live-feed payoff (Step 4 of the original
// Cinematic Opener plan) still exists, just personalized by vibe + tags
// instead of a chosen destination. "feed" isn't counted in the progress bar
// below since it's the payoff, not another question.
const QUESTION_STEPS = ["recency", "intent", "beach-mountain", "tags"] as const;
const STEPS = [...QUESTION_STEPS, "identity", "feed"] as const;
type Step = (typeof STEPS)[number];

// The mandatory preference wizard — no skip, single continuous progress bar
// across all 4 questions, closing on a real identity reveal, then a live
// feed preview built from what was just answered.
function Onboarding() {
  const navigate = useNavigate();
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [step, setStep] = useState<Step>("recency");
  // Collected purely for the identity reveal + feed personalization — not
  // re-fetched from the DB, so both reflect exactly what this session just
  // answered even if a save silently failed along the way.
  const [signals, setSignals] = useState({
    recencyDays: 30,
    intentDays: 14,
    vibe: "mountain" as "beach" | "mountain",
    tags: [] as string[],
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/auth", search: { mode: "login" } });
      else setMe({ id: data.user.id });
    });
  }, [navigate]);

  useEffect(() => {
    const entered: Record<Step, () => void> = {
      recency: () => trackEvent({ name: "onboarding_wizard_recency_entered" }),
      intent: () => trackEvent({ name: "onboarding_wizard_intent_entered" }),
      "beach-mountain": () => trackEvent({ name: "onboarding_wizard_beaches_mountains_entered" }),
      tags: () => trackEvent({ name: "onboarding_wizard_tags_entered" }),
      identity: () => {},
      feed: () => {},
    };
    entered[step]();
  }, [step]);

  async function saveProfile(patch: ProfileUpdate) {
    if (!me) return;
    const { error } = await supabase.from("profiles").update(patch).eq("id", me.id);
    if (error) toast.error("Couldn't save — try again");
  }

  async function handleRecencyContinue(days: number) {
    trackEvent({ name: "onboarding_wizard_recency_completed", days });
    setSignals((s) => ({ ...s, recencyDays: days }));
    await saveProfile({ last_travel_date: daysAgoToDateString(days) });
    setStep("intent");
  }

  async function handleIntentContinue(days: number) {
    trackEvent({ name: "onboarding_wizard_intent_completed", days });
    setSignals((s) => ({ ...s, intentDays: days }));
    await saveProfile({ travel_urgency_days: daysToUrgencySentinel(days) });
    setStep("beach-mountain");
  }

  async function handleBeachMountainContinue(choice: "beach" | "mountain") {
    trackEvent({ name: "onboarding_wizard_beaches_mountains_completed", choice });
    setSignals((s) => ({ ...s, vibe: choice }));
    await saveProfile({ vibe: choice });
    setStep("tags");
  }

  // Tags is the last question screen — onboarding_completed flips here,
  // right before the identity reveal, since everything after it (the feed
  // preview, leaving into a real trip or /discover) is a normal
  // authenticated page.
  async function handleTagsContinue(tags: string[]) {
    trackEvent({ name: "onboarding_wizard_tags_completed", tags });
    setSignals((s) => ({ ...s, tags }));
    await saveProfile({ interests: tags, onboarding_completed: true });
    setStep("identity");
  }

  function handleIdentityDone() {
    setStep("feed");
  }

  function handleFeedSkip() {
    navigate({ to: "/discover" });
  }

  if (!me) return <div className="tryb-theme min-h-screen bg-background" />;

  const progressIndex = QUESTION_STEPS.includes(step as (typeof QUESTION_STEPS)[number])
    ? QUESTION_STEPS.indexOf(step as (typeof QUESTION_STEPS)[number])
    : QUESTION_STEPS.length;
  const identity = deriveTravellerIdentity({
    recencyBand: bandForDays(signals.recencyDays),
    intentBand: bandForDays(signals.intentDays),
    vibe: signals.vibe,
    tagCount: signals.tags.length,
  });

  return (
    <div className="tryb-theme relative min-h-screen overflow-hidden">
      {step !== "identity" && step !== "feed" && <WizardProgress step={progressIndex} />}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === "recency" && <RecencyStep onContinue={handleRecencyContinue} />}
          {step === "intent" && <IntentStep onContinue={handleIntentContinue} />}
          {step === "beach-mountain" && (
            <BeachMountainStep onContinue={handleBeachMountainContinue} />
          )}
          {step === "tags" && <TagsStep onContinue={handleTagsContinue} />}
          {step === "identity" && <IdentityStep identity={identity} onDone={handleIdentityDone} />}
          {step === "feed" && (
            <FeedPreviewStep vibe={signals.vibe} tags={signals.tags} onSkip={handleFeedSkip} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
