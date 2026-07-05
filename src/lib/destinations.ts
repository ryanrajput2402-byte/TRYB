// Curated destination images (stable Unsplash CDN URLs)
// Used for cover photos, story rings, and discover/feed grids.

export type Destination = {
  slug: string;
  name: string;
  country: string;
  flag: string;
  image: string;
  vibe: "beach" | "mountain" | "city" | "forest" | "desert";
};

export const DESTINATIONS: Destination[] = [
  { slug: "bali", name: "Bali", country: "Indonesia", flag: "🇮🇩", vibe: "beach",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=1200&q=80" },
  { slug: "tokyo", name: "Tokyo", country: "Japan", flag: "🇯🇵", vibe: "city",
    image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=1200&q=80" },
  { slug: "santorini", name: "Santorini", country: "Greece", flag: "🇬🇷", vibe: "beach",
    image: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=1200&q=80" },
  { slug: "patagonia", name: "Patagonia", country: "Argentina", flag: "🇦🇷", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1531219572328-a0171b4448a3?w=1200&q=80" },
  { slug: "marrakech", name: "Marrakech", country: "Morocco", flag: "🇲🇦", vibe: "desert",
    image: "https://images.unsplash.com/photo-1597212720291-c41128b0e1cf?w=1200&q=80" },
  { slug: "iceland", name: "Iceland", country: "Iceland", flag: "🇮🇸", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80" },
  { slug: "lisbon", name: "Lisbon", country: "Portugal", flag: "🇵🇹", vibe: "city",
    image: "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=1200&q=80" },
  { slug: "kyoto", name: "Kyoto", country: "Japan", flag: "🇯🇵", vibe: "forest",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80" },
  { slug: "cape-town", name: "Cape Town", country: "South Africa", flag: "🇿🇦", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1576487248805-cf45f6bcc67f?w=1200&q=80" },
  { slug: "rio", name: "Rio de Janeiro", country: "Brazil", flag: "🇧🇷", vibe: "beach",
    image: "https://images.unsplash.com/photo-1483729558449-99ef09a8c325?w=1200&q=80" },
  { slug: "new-york", name: "New York", country: "USA", flag: "🇺🇸", vibe: "city",
    image: "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1200&q=80" },
  { slug: "ladakh", name: "Ladakh", country: "India", flag: "🇮🇳", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=80" },
  { slug: "phuket", name: "Phuket", country: "Thailand", flag: "🇹🇭", vibe: "beach",
    image: "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=1200&q=80" },
  { slug: "petra", name: "Petra", country: "Jordan", flag: "🇯🇴", vibe: "desert",
    image: "https://images.unsplash.com/photo-1563177682-6c0e9ca42795?w=1200&q=80" },
  { slug: "banff", name: "Banff", country: "Canada", flag: "🇨🇦", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1561134643-668f9057cce4?w=1200&q=80" },
  { slug: "paris", name: "Paris", country: "France", flag: "🇫🇷", vibe: "city",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80" },
  { slug: "queenstown", name: "Queenstown", country: "New Zealand", flag: "🇳🇿", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1200&q=80" },
  { slug: "havana", name: "Havana", country: "Cuba", flag: "🇨🇺", vibe: "city",
    image: "https://images.unsplash.com/photo-1500759285222-a95626b934cb?w=1200&q=80" },
  // TRYB's featured picks (Discover Feature 2) — real destinations we're
  // pointing at deliberately, whether or not a real trip exists yet.
  { slug: "rishikesh", name: "Rishikesh", country: "India", flag: "🇮🇳", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1780997428032-ec11d8ab7210?w=1200&q=80" },
  { slug: "goa", name: "Goa", country: "India", flag: "🇮🇳", vibe: "beach",
    image: "https://images.unsplash.com/photo-1656155318073-5bdd6098e321?w=1200&q=80" },
  { slug: "manali-kasol", name: "Manali & Kasol", country: "India", flag: "🇮🇳", vibe: "mountain",
    image: "https://images.unsplash.com/photo-1675515640267-bae2ae9cc9d2?w=1200&q=80" },
  { slug: "rajasthan-circuit", name: "Rajasthan Circuit", country: "India", flag: "🇮🇳", vibe: "desert",
    image: "https://images.unsplash.com/photo-1578155173088-710a9aef3849?w=1200&q=80" },
  { slug: "hampi-varanasi", name: "Hampi & Varanasi", country: "India", flag: "🇮🇳", vibe: "city",
    image: "https://images.unsplash.com/photo-1561359313-0639aad49ca6?w=1200&q=80" },
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
