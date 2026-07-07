// Curated destination images (stable Unsplash CDN URLs)
// Used for cover photos, story rings, and discover/feed grids.

export type Destination = {
  slug: string;
  name: string;
  country: string;
  flag: string;
  image: string;
  vibe: "beach" | "mountain" | "city" | "forest" | "desert";
  // Real, well-established peak-season months (1-12) for this destination —
  // e.g. Goa's Nov-Feb dry season, Kyoto's spring bloom/autumn foliage
  // windows. Curated editorial fact, same footing as the image/country
  // fields above — not fabricated per-user data. Backs Phase 2's
  // "time-relevant destinations right now" masonry grid.
  bestMonths: number[];
  whyNow: string;
};

export const DESTINATIONS: Destination[] = [
  { slug: "bali", name: "Bali", country: "Indonesia", flag: "🇮🇩", vibe: "beach",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80",
    bestMonths: [4,5,6,7,8,9,10], whyNow: "Dry season · lowest rainfall" },
  { slug: "tokyo", name: "Tokyo", country: "Japan", flag: "🇯🇵", vibe: "city",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80",
    bestMonths: [3,4,5,10,11], whyNow: "Cherry blossom & autumn colour" },
  { slug: "santorini", name: "Santorini", country: "Greece", flag: "🇬🇷", vibe: "beach",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80",
    bestMonths: [5,6,7,8,9,10], whyNow: "Warm Aegean summer" },
  { slug: "patagonia", name: "Patagonia", country: "Argentina", flag: "🇦🇷", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1531219572328-a0171b4448a3?w=1200&q=80",
    bestMonths: [11,12,1,2,3], whyNow: "Southern summer · trails open" },
  { slug: "marrakech", name: "Marrakech", country: "Morocco", flag: "🇲🇦", vibe: "desert",
    image: "https://images.unsplash.com/photo-1597212720291-c41128b0e1cf?w=1200&q=80",
    bestMonths: [3,4,5,9,10,11], whyNow: "Before/after the desert heat" },
  { slug: "iceland", name: "Iceland", country: "Iceland", flag: "🇮🇸", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
    bestMonths: [6,7,8,9], whyNow: "Midnight sun, mildest weather" },
  { slug: "lisbon", name: "Lisbon", country: "Portugal", flag: "🇵🇹", vibe: "city",
    image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80",
    bestMonths: [4,5,6,7,8,9,10], whyNow: "Warm, dry, coastal breeze" },
  { slug: "kyoto", name: "Kyoto", country: "Japan", flag: "🇯🇵", vibe: "forest",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80",
    bestMonths: [3,4,5,10,11], whyNow: "Cherry blossom & autumn colour" },
  { slug: "cape-town", name: "Cape Town", country: "South Africa", flag: "🇿🇦", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?w=1200&q=80",
    bestMonths: [11,12,1,2,3], whyNow: "Southern summer, clear skies" },
  { slug: "rio", name: "Rio de Janeiro", country: "Brazil", flag: "🇧🇷", vibe: "beach",
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&q=80",
    bestMonths: [12,1,2,3], whyNow: "Southern summer · Carnival season" },
  { slug: "new-york", name: "New York", country: "USA", flag: "🇺🇸", vibe: "city",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80",
    bestMonths: [4,5,6,9,10,11], whyNow: "Spring bloom or fall foliage" },
  { slug: "ladakh", name: "Ladakh", country: "India", flag: "🇮🇳", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80",
    bestMonths: [6,7,8,9], whyNow: "Mountain passes open & snow-free" },
  { slug: "phuket", name: "Phuket", country: "Thailand", flag: "🇹🇭", vibe: "beach",
    image: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1200&q=80",
    bestMonths: [11,12,1,2,3], whyNow: "Dry season, calm seas" },
  { slug: "petra", name: "Petra", country: "Jordan", flag: "🇯🇴", vibe: "desert",
    image: "https://images.unsplash.com/photo-1563177682-6c0e9ca42795?w=1200&q=80",
    bestMonths: [3,4,5,9,10,11], whyNow: "Before/after the desert heat" },
  { slug: "banff", name: "Banff", country: "Canada", flag: "🇨🇦", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1561134643-668f9057cce4?w=1200&q=80",
    bestMonths: [6,7,8,12,1,2], whyNow: "Summer hiking or ski season" },
  { slug: "paris", name: "Paris", country: "France", flag: "🇫🇷", vibe: "city",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80",
    bestMonths: [4,5,6,9,10], whyNow: "Mild spring or golden autumn" },
  { slug: "queenstown", name: "Queenstown", country: "New Zealand", flag: "🇳🇿", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80",
    bestMonths: [12,1,2,6,7,8], whyNow: "Southern summer or ski season" },
  { slug: "havana", name: "Havana", country: "Cuba", flag: "🇨🇺", vibe: "city",
    image: "https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=1200&q=80",
    bestMonths: [11,12,1,2,3,4], whyNow: "Dry season, least humid" },
  // TRYB's featured picks (Discover Feature 2) — real destinations we're
  // pointing at deliberately, whether or not a real trip exists yet.
  { slug: "rishikesh", name: "Rishikesh", country: "India", flag: "🇮🇳", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1780997428032-ec11d8ab7210?w=1200&q=80",
    bestMonths: [2,3,4,9,10,11], whyNow: "Clear river, comfortable trekking" },
  { slug: "goa", name: "Goa", country: "India", flag: "🇮🇳", vibe: "beach",
    image: "https://images.unsplash.com/photo-1656155318073-5bdd6098e321?w=1200&q=80",
    bestMonths: [11,12,1,2], whyNow: "Cool, dry beach season" },
  { slug: "manali-kasol", name: "Manali & Kasol", country: "India", flag: "🇮🇳", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1675515640267-bae2ae9cc9d2?w=1200&q=80",
    bestMonths: [3,4,5,6,9,10,11], whyNow: "Open roads, clear valley views" },
  { slug: "rajasthan-circuit", name: "Rajasthan Circuit", country: "India", flag: "🇮🇳", vibe: "desert",
    image: "https://images.unsplash.com/photo-1578155173088-710a9aef3849?w=1200&q=80",
    bestMonths: [10,11,12,1,2,3], whyNow: "Desert heat has broken" },
  { slug: "hampi-varanasi", name: "Hampi & Varanasi", country: "India", flag: "🇮🇳", vibe: "city",
    image: "https://images.unsplash.com/photo-1561359313-0639aad49ca6?w=1200&q=80",
    bestMonths: [10,11,12,1,2,3], whyNow: "Cool enough to explore all day" },
];

// Discover Feature 2 — "where TRYB has a point of view," a fixed editorial
// list (not derived from real trips like destinationOptions elsewhere).
// Real trip/going counts are still looked up per-destination at render
// time — never fabricated, just not the basis for which 5 appear here.
export const FEATURED_DESTINATION_SLUGS = [
  "rishikesh",
  "goa",
  "manali-kasol",
  "rajasthan-circuit",
  "hampi-varanasi",
];

export function findDestination(query: string): Destination | undefined {
  const q = query.toLowerCase().trim();
  return DESTINATIONS.find(
    (d) => d.name.toLowerCase() === q || d.slug === q || d.name.toLowerCase().includes(q),
  );
}

export function destinationImage(query: string, fallbackIdx = 0): string {
  return findDestination(query)?.image ?? DESTINATIONS[fallbackIdx % DESTINATIONS.length].image;
}

// Circular distance between two calendar months (1-12), e.g. Dec→Jan is 1
// month apart, not 11. Used to gracefully fall back when too few
// destinations are in-season for the grid to feel populated.
function monthDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 12 - diff);
}

// Phase 2 Home masonry grid — "which places suit travel right now."
// Prefers destinations whose real best-season window includes the current
// month; if too few qualify (e.g. an odd month with a sparse match), widens
// to the closest-season destinations rather than showing an empty grid.
export function getTimeRelevantDestinations(now: Date = new Date(), minCount = 8): Destination[] {
  const month = now.getMonth() + 1;
  const inSeason = DESTINATIONS.filter((d) => d.bestMonths.includes(month));
  if (inSeason.length >= minCount) return inSeason;

  const rest = DESTINATIONS.filter((d) => !inSeason.includes(d))
    .map((d) => ({ d, dist: Math.min(...d.bestMonths.map((m) => monthDistance(m, month))) }))
    .sort((a, b) => a.dist - b.dist)
    .map((x) => x.d);
  return [...inSeason, ...rest].slice(0, Math.max(minCount, inSeason.length));
}

export function vibeTint(vibe?: string): string {
  switch (vibe) {
    case "beach": return "from-cyan-500/20 to-teal-500/10";
    case "mountain": return "from-slate-500/20 to-indigo-500/10";
    case "city": return "from-amber-500/20 to-orange-500/10";
    case "forest": return "from-emerald-500/20 to-green-500/10";
    case "desert": return "from-orange-500/20 to-red-500/10";
    default: return "from-primary/20 to-coral/10";
  }
}

export const INTEREST_TAGS = [
  { id: "beaches", label: "Beaches", emoji: "🏖️" },
  { id: "mountains", label: "Mountains", emoji: "⛰️" },
  { id: "food", label: "Food", emoji: "🍜" },
  { id: "nightlife", label: "Nightlife", emoji: "🎉" },
  { id: "photography", label: "Photography", emoji: "📸" },
  { id: "hiking", label: "Hiking", emoji: "🥾" },
  { id: "culture", label: "Culture", emoji: "🏛️" },
  { id: "wellness", label: "Wellness", emoji: "🧘" },
  { id: "road-trips", label: "Road Trips", emoji: "🚐" },
  { id: "wildlife", label: "Wildlife", emoji: "🦒" },
];
