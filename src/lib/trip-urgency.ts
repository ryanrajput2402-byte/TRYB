import { pluralize, formatRelativeTime } from "@/lib/format-date";
import { DESTINATIONS } from "@/lib/destinations";

// Shared trip-card data shape + urgency/badge logic — used by both Home's
// planning feed and Discover's trip-matching grid so both screens render
// identical real-data badges from the same functions, not duplicated copies.
export type TripCardProfile = {
  id: string;
  full_name: string;
  avatar_url: string | null;
};

export type TripCardData = {
  id: string;
  title: string;
  destination: string;
  country?: string | null;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  max_members: number;
  vibe_tags: string[];
  organizer_id: string;
  organizer?: TripCardProfile;
  description: string | null;
  going: number;
  memberFaces: TripCardProfile[];
  mostRecentJoinAt: string | null;
};

// Lower ratio = fewer spots left relative to capacity = more urgent.
// Full trips rank as Infinity — still shown, but never picked as a featured hero.
export function urgencyRatio(trip: { going: number; max_members: number }) {
  const left = Math.max(trip.max_members - trip.going, 0);
  return left === 0 ? Infinity : left / trip.max_members;
}

export function urgencyBadge(trip: { going: number; max_members: number }) {
  const left = Math.max(trip.max_members - trip.going, 0);
  if (left === 0) return { left, isFull: true, suffix: "Full", className: "bg-coral/90 text-white" };
  const ratio = left / trip.max_members;
  const spotWord = pluralize(left, "spot");
  if (ratio < 0.2)
    return { left, isFull: false, suffix: `${spotWord} left · filling fast`, className: "bg-coral/90 text-white animate-pulse-live" };
  if (ratio <= 0.55) return { left, isFull: false, suffix: `${spotWord} left`, className: "bg-teal/85 text-black" };
  return { left, isFull: false, suffix: `${spotWord} left`, className: "bg-black/40 text-white/90" };
}

// Urgency-driven size tier for non-featured cards, independent of list
// position — a genuinely urgent card gets more visual weight wherever it sits.
export function sizeTier(trip: { going: number; max_members: number }): "medium" | "small" {
  const ratio = urgencyRatio(trip);
  return ratio < 0.3 ? "medium" : "small";
}

// Momentum microcopy — every branch here maps to real data. If neither
// condition is truthfully met, this returns null and nothing is shown.
export function momentumLabel(trip: TripCardData): string | null {
  const now = Date.now();
  if (trip.mostRecentJoinAt) {
    const hoursAgo = (now - new Date(trip.mostRecentJoinAt).getTime()) / 3_600_000;
    if (hoursAgo >= 0 && hoursAgo <= 72) {
      return hoursAgo < 1 ? "Someone just joined" : `Joined ${formatRelativeTime(trip.mostRecentJoinAt)}`;
    }
  }
  const daysToStart = Math.ceil((new Date(trip.start_date).getTime() - now) / 86_400_000);
  if (daysToStart >= 0 && daysToStart <= 21) {
    return daysToStart === 0 ? "Starts today" : `Starts in ${daysToStart} ${pluralize(daysToStart, "day")}`;
  }
  return null;
}

// Keyo teaser placeholder — deterministic, client-side only, no backend call.
// Only ever shown on Home's featured hero card.
const KEYO_BY_VIBE: Record<string, string[]> = {
  beach: ["pack reef-safe sunscreen, the sunsets don't wait", "bring a book you don't mind getting sandy"],
  mountain: ["pack layers — mornings bite here", "altitude sneaks up, hydrate early and often"],
  city: ["comfortable shoes over anything else", "book the popular spot a day ahead of time"],
  forest: ["bug spray is non-negotiable here", "the quiet is the whole point of this one"],
  desert: ["nights get cold fast, pack a layer", "sunrise is worth the early alarm"],
};
export function keyoTeaser(destination: string, vibe?: string) {
  const pool = KEYO_BY_VIBE[vibe ?? ""] ?? ["this one's shaping up to be special"];
  return pool[destination.length % pool.length];
}

export type DestinationOption = {
  destination: string;
  count: number;
  image: string;
  soonestDate: string;
  trending: boolean;
};

// Real per-destination chip data derived entirely from real trips — never a
// fixed/curated list. Shared by Home and Discover so both compute identical
// counts/trending signals from one implementation.
export function deriveDestinationOptions(trips: TripCardData[]): DestinationOption[] {
  const byDestination = new Map<string, TripCardData[]>();
  trips.forEach((t) => {
    const list = byDestination.get(t.destination) ?? [];
    list.push(t);
    byDestination.set(t.destination, list);
  });
  const entries = Array.from(byDestination.entries())
    .map(([destination, group]) => {
      const mostUrgent = [...group].sort((a, b) => urgencyRatio(a) - urgencyRatio(b))[0];
      const soonest = [...group].sort((a, b) => a.start_date.localeCompare(b.start_date))[0];
      return {
        destination,
        count: group.length,
        image: mostUrgent.cover_image ?? DESTINATIONS.find((d) => d.name === destination)?.image ?? DESTINATIONS[0].image,
        soonestDate: soonest.start_date,
      };
    })
    .sort((a, b) => b.count - a.count || a.soonestDate.localeCompare(b.soonestDate));
  // "Trending" only means something with real spread to compare against — a
  // destination with 2 trips out of only 2 total isn't meaningfully
  // trending, so this stays off unless there's enough variety.
  const hasEnoughSpread = entries.length >= 3;
  return entries.map((e) => ({ ...e, trending: hasEnoughSpread && e.count >= 2 }));
}

export type DateBucket = "any" | "this-month" | "next-3-months" | "later";
export function tripDateBucket(startDateISO: string): Exclude<DateBucket, "any"> {
  const daysOut = (new Date(startDateISO).getTime() - Date.now()) / 86_400_000;
  if (daysOut <= 31) return "this-month";
  if (daysOut <= 92) return "next-3-months";
  return "later";
}

export type SizeBucket = "any" | "small" | "medium" | "large";
export function tripSizeBucket(maxMembers: number): Exclude<SizeBucket, "any"> {
  if (maxMembers <= 4) return "small";
  if (maxMembers <= 8) return "medium";
  return "large";
}
