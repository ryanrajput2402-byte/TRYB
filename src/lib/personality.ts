import { SeasonThemeId } from "./seasonal-themes";

export type GroupPreference = "solo" | "flexible";

// Screen 5's identity reveal — keyed to the two real signals collected
// earlier in onboarding (solo/group + season), not a personality quiz.
// "Solo Voyager" is kept verbatim for solo+autumn since that label already
// existed under the old quiz, so returning solo travelers who land there
// see a name they may already recognize.
const IDENTITY_LABELS: Record<SeasonThemeId, Record<GroupPreference, string>> = {
  spring: { solo: "Fresh Wanderer", flexible: "Spark Starter" },
  summer: { solo: "Golden Voyager", flexible: "Squad Chaser" },
  autumn: { solo: "Solo Voyager", flexible: "Tribe Gatherer" },
  winter: { solo: "Quiet Drifter", flexible: "Calm Crew" },
};

export function deriveIdentity(theme: SeasonThemeId, group: GroupPreference): string {
  return IDENTITY_LABELS[theme][group];
}
