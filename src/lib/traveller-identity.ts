import type { DurationBand } from "@/lib/onboarding-wizard";

// The wizard's closing identity reveal — replaces the old quiz-derived
// "Solo Voyager" style labels (personality.ts), which were keyed to season
// theme + solo/group, neither of which the new wizard collects anymore.
// This one is keyed to what the new wizard actually asks: how recently you
// travelled, how soon you want to next, beach-or-mountain, and how many
// interest tags you picked. Deliberately modest, two-word, warm — not a
// bold claim about who you are, just a label that reads as "yeah, fair."
export type Vibe = "beach" | "mountain";

const TITLES: string[] = [
  "Slow Drifter",
  "Quiet Wanderer",
  "Coastal Roamer",
  "Peak Seeker",
  "Golden Hour Chaser",
  "Trail Wanderer",
  "Tide Watcher",
  "Ridge Walker",
  "Map Dreamer",
  "Horizon Chaser",
  "Salt Air Seeker",
  "Alpine Drifter",
  "Sunset Collector",
  "Backroad Wanderer",
  "Cloud Chaser",
  "Windward Roamer",
  "Summit Dreamer",
  "Shoreline Wanderer",
  "Wayfinder",
  "Restless Planner",
  "Easy Explorer",
  "Warm Light Seeker",
  "Dust Road Traveller",
  "Fresh Air Chaser",
  "Sunlit Wanderer",
  "Open Road Dreamer",
  "Quiet Coast Seeker",
  "Highland Wanderer",
  "Sea Breeze Drifter",
  "Trail Dreamer",
  "Distant Peak Seeker",
  "Lantern Light Wanderer",
  "Blue Water Chaser",
  "Mountain Air Dreamer",
  "Slow Traveller",
  "Curious Roamer",
  "Firelight Wanderer",
  "Long Way Traveller",
  "Morning Fog Chaser",
  "Golden Coast Seeker",
  "Steady Wanderer",
  "New Trail Seeker",
  "Bright Sky Dreamer",
  "Weekend Escapist",
  "Familiar Road Wanderer",
  "Fresh Start Traveller",
  "Deep Valley Seeker",
  "Coastal Dreamer",
  "Snowline Wanderer",
  "Wide Open Roamer",

  "Patient Explorer",
  "Next Trip Dreamer",
  "Early Riser Traveller",
  "Star Trail Wanderer",
  "Warm Sand Seeker",
];

const RECENCY_WEIGHT: Record<DurationBand, number> = {
  "0-7d": 0,
  "7-30d": 1,
  "1-3mo": 2,
  "3-12mo": 3,
  "1-2y": 4,
  "2y+": 5,
};
const INTENT_WEIGHT: Record<DurationBand, number> = {
  "0-7d": 0,
  "7-30d": 1,
  "1-3mo": 2,
  "3-12mo": 3,
  "1-2y": 4,
  "2y+": 5,
};

// Deterministic, not random — the same real answers always produce the
// same title for a given user (stable across reloads), while different
// combinations spread across the full list.
export function deriveTravellerIdentity(signals: {
  recencyBand: DurationBand;
  intentBand: DurationBand;
  vibe: Vibe;
  tagCount: number;
}): string {
  const vibeWeight = signals.vibe === "beach" ? 0 : 1;
  const hash =
    RECENCY_WEIGHT[signals.recencyBand] * 7 +
    INTENT_WEIGHT[signals.intentBand] * 11 +
    vibeWeight * 13 +
    Math.min(signals.tagCount, 9) * 3;
  return TITLES[hash % TITLES.length];
}

export const TRAVELLER_IDENTITY_COUNT = TITLES.length;
