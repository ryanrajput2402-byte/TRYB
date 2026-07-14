// Shared band model for the preference wizard's two duration meters
// (Screen 1 — recency, Screen 2 — future intent). Both use the same six
// bands and the same log-scale drag mechanic; only the questions, the copy,
// and which profile column they persist to differ.
export type DurationBand = "0-7d" | "7-30d" | "1-3mo" | "3-12mo" | "1-2y" | "2y+";

const BAND_MAX_DAYS = 900; // drag ceiling — beyond this we just say "2 years+"

export const BANDS: { id: DurationBand; minDays: number }[] = [
  { id: "0-7d", minDays: 0 },
  { id: "7-30d", minDays: 7 },
  { id: "1-3mo", minDays: 30 },
  { id: "3-12mo", minDays: 90 },
  { id: "1-2y", minDays: 365 },
  { id: "2y+", minDays: 730 },
];

export function bandForDays(days: number): DurationBand {
  let band: DurationBand = "0-7d";
  for (const b of BANDS) if (days >= b.minDays) band = b.id;
  return band;
}

// t in [0,1] (drag position) -> days, log-scaled so early drag moves through
// days slowly and accelerates through weeks/months/years — one continuous
// control reading as "days, then weeks, then months, then years."
export function daysForT(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  return Math.round(Math.exp(clamped * Math.log(BAND_MAX_DAYS + 1)) - 1);
}

export function tForDays(days: number): number {
  return Math.log(days + 1) / Math.log(BAND_MAX_DAYS + 1);
}

// Live label shown while dragging — natural units, not raw day counts.
export function formatDuration(days: number): string {
  if (days >= 730) return "2+ years";
  if (days >= 365) {
    const years = Math.round((days / 365) * 10) / 10;
    return `${years} year${years === 1 ? "" : "s"}`;
  }
  if (days >= 60) return `${Math.round(days / 30)} months`;
  if (days >= 30) return "1 month";
  if (days >= 14) return `${Math.round(days / 7)} weeks`;
  if (days >= 7) return "1 week";
  if (days === 1) return "1 day";
  return `${days} days`;
}

// Screen 1 — "When did you travel last?" Reaction copy, approved.
export const RECENCY_REACTIONS: Record<DurationBand, string> = {
  "0-7d": "Still smell like sunscreen, don't you?",
  "7-30d": "Fresh off a trip and already scheming the next one. We like that.",
  "1-3mo": "A little dust on the passport, nothing a good sequel can't fix.",
  "3-12mo": "It's been a while, tiger. Time to remedy that.",
  "1-2y": "Okay, that trip's basically folklore at this point.",
  "2y+":
    "Might as well say, I travelled in a past life? But don't you worry Potato, find your TRYB here.",
};

// Screen 2 — "When would you like to travel next?" Reaction copy, approved.
export const INTENT_REACTIONS: Record<DurationBand, string> = {
  "0-7d": "We never recommend you hold your horses — go on, tiger, hook yourself a nice trip.",
  "7-30d": "Bags half-packed already, aren't they?",
  "1-3mo": "A planner with a deadline. Respect.",
  "3-12mo": "Slow-burn plans. We'll keep the good ones warm for you.",
  "1-2y": "Bold of you to plan this far ahead, Potato.",
  "2y+": "Manifesting hard — let's speed that up a little, shall we?",
};

// travel_urgency_days stores an INT with a 1000-day sentinel ceiling for
// "2 years or more" (see migration) — this is Screen 2's persisted value.
// Screen 1 persists an actual DATE (today minus the dragged day count) to
// last_travel_date instead, since that column is a date, not a count.
export function daysToUrgencySentinel(days: number): number {
  return days >= 730 ? 1000 : days;
}

export function daysAgoToDateString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}
