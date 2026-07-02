export type QuizAnswers = {
  travel_style: string;
  budget_range: string;
  vibe: string;
  group_preference: string;
  interests: string[];
};

export function derivePersonality(a: Partial<QuizAnswers>): string {
  const b = a.budget_range;
  const v = a.vibe;
  if (b === "budget" && v === "adventure") return "Budget Explorer";
  if (b === "luxury") return "Luxury Wanderer";
  if (v === "cultural") return "Culture Seeker";
  if (v === "adventure") return "Adventure Junkie";
  if (v === "relaxed") return "Slow Drifter";
  if (a.group_preference === "solo") return "Solo Voyager";
  return "Free Spirit";
}
