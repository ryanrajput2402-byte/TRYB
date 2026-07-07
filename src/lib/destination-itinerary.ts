// Phase 2 destination page — short suggested itinerary + planning insights,
// keyed by vibe (not per-destination invented specifics we can't verify).
// Explicitly framed as "suggested" in the UI, the same footing as Keyo's
// existing canned vibe-based advice (getKeyoResponse/keyoTeaser) elsewhere
// in the app — editorial guidance, not fabricated user/trip data.
export type ItineraryDay = { title: string; detail: string };

const ITINERARY_BY_VIBE: Record<string, ItineraryDay[]> = {
  beach: [
    { title: "Day 1 — Settle in", detail: "Arrive, find your feet, catch the sunset from the shore." },
    { title: "Day 2 — Water & sun", detail: "Snorkeling, a boat trip, or just committing to doing nothing by the water." },
    { title: "Day 3 — Local flavor", detail: "Wander the nearest town, eat where the locals eat, pick up something small to bring home." },
    { title: "Day 4 — One more sunrise", detail: "An early swim or beach walk before the trip back." },
  ],
  mountain: [
    { title: "Day 1 — Arrive & acclimatize", detail: "Take it slow the first day, especially at altitude." },
    { title: "Day 2 — The big hike", detail: "The main trail or viewpoint everyone comes here for." },
    { title: "Day 3 — Slower pace", detail: "A shorter walk, a local village, or a lookout you'd have rushed past otherwise." },
    { title: "Day 4 — Wind down", detail: "Pack out, grab a last hot meal before heading home." },
  ],
  city: [
    { title: "Day 1 — Orient yourself", detail: "Walk the main district, get a feel for the layout." },
    { title: "Day 2 — The must-sees", detail: "Hit the landmarks — book ahead for anything popular." },
    { title: "Day 3 — Go local", detail: "A neighborhood off the main track, food where locals actually eat." },
    { title: "Day 4 — Loose ends", detail: "Whatever you skipped, plus souvenir hunting." },
  ],
  forest: [
    { title: "Day 1 — Arrive & settle", detail: "Get to your base, short orientation walk." },
    { title: "Day 2 — Deeper in", detail: "The longer trail or the spot everyone recommends." },
    { title: "Day 3 — Slow morning", detail: "A quiet walk, wildlife-watching, or just the sound of it." },
    { title: "Day 4 — Head back", detail: "One last short walk before the journey home." },
  ],
  desert: [
    { title: "Day 1 — Arrive before the heat", detail: "Early check-in, rest through the hottest hours." },
    { title: "Day 2 — Golden hour", detail: "The signature sunrise or sunset spot — worth the early alarm." },
    { title: "Day 3 — Go deeper", detail: "A day trip further out, or the historic site everyone mentions." },
    { title: "Day 4 — Ease out", detail: "A slow last morning before the trip back." },
  ],
};

export function getSuggestedItinerary(vibe: string): ItineraryDay[] {
  return ITINERARY_BY_VIBE[vibe] ?? ITINERARY_BY_VIBE.city;
}

const INSIGHT_BY_VIBE: Record<string, string> = {
  beach: "Pack reef-safe sunscreen and a light rain shell — coastal weather turns fast.",
  mountain: "Layer up: mornings and evenings run much colder than midday.",
  city: "Comfortable shoes over anything else — you'll walk more than you expect.",
  forest: "Bug spray is non-negotiable; the quiet is the whole point of this one.",
  desert: "Nights get cold fast even after a scorching day — pack a warm layer.",
};

export function getPlanningInsight(vibe: string): string {
  return INSIGHT_BY_VIBE[vibe] ?? INSIGHT_BY_VIBE.city;
}
