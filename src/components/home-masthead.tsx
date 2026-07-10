import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";

// Real NASA "Black Marble" Earth-at-night photograph (2016 color composite,
// 3600x1800, public domain U.S. government work) — direct-linked from NASA's
// own official download page:
// https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps
const NIGHT_EARTH_URL =
  "https://assets.science.nasa.gov/content/dam/science/esd/eo/images/imagerecords/144000/144898/BlackMarble_2016_01deg.jpg";

// Full-bleed night-earth hero — a single real photograph, not a CSS-built
// map. Earlier attempts to fake this look (flat vector map + layered
// gradients/vignette/cloud-noise/shimmer) were confirmed as unfixable: no
// amount of CSS on a 2-color political outline produces real photographic
// depth. The Black Marble photo already has genuine land/water contrast and
// real city lights baked in, so it needs no decoration on top — just sizing
// to fill the hero. Deliberately fixed regardless of the user's chosen
// seasonal theme (season theming applies to everything below the hero, not
// this). TopBar is not rendered on Home at all; the wordmark and the
// bell/profile icons that would normally live there are overlaid directly on
// this hero instead.
export function HomeMasthead({
  avatarUrl,
  name,
}: {
  avatarUrl?: string | null;
  name?: string | null;
}) {
  return (
    <section className="relative h-screen w-full overflow-hidden bg-[#03060c] text-center">
      <img
        src={NIGHT_EARTH_URL}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: "55% 38%" }}
      />

      <div className="absolute inset-x-0 top-0 flex items-start justify-end p-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:p-8">
        <div className="flex items-center gap-2">
          {/* Radial scrim behind each icon so they stay legible over the
              brighter city-light clusters in the photo, not just its darker
              regions — a plain drop-shadow alone washes out over a bright
              cluster. */}
          <button
            aria-label="Notifications"
            className="text-cream grid h-10 w-10 place-items-center rounded-full"
            style={{ background: "radial-gradient(circle, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0) 100%)" }}
          >
            <Bell className="h-4.5 w-4.5 drop-shadow" />
          </button>
          <Link
            to="/profile"
            aria-label="Profile"
            className="grid h-10 w-10 place-items-center overflow-hidden rounded-full ring-2 ring-cream/60"
            style={{ background: "radial-gradient(circle, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0) 100%)" }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={name ?? "You"} className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-semibold text-cream drop-shadow">{(name ?? "?").slice(0, 1).toUpperCase()}</span>
            )}
          </Link>
        </div>
      </div>

      {/* Logo, static header, and the two primary CTAs — one centered
          composition, fixed regardless of season theme. Not wrapped in a
          reading-width container — this hero's content is meant to float
          freely over the full-width photo. Wordmark is the dominant element
          here: sized at 1.1x the subheader below it at every breakpoint
          (2.475rem/3.3rem/4.125rem vs. the subheader's 2.25rem/3rem/3.75rem),
          not a small mark above a bigger headline. No tagline underneath it.
          Manrope 200 (not the app's default fomo-heading/Space Grotesk bold)
          on purpose — an explicit, hero-only design call for something
          lighter/more spacious/editorial than the rest of the app's bold
          display treatment; dropped the tight tracking that suited the bold
          weight, since it reads cramped against this thin one. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6">
        <Link to="/home" className="block">
          <p
            className="text-[2.475rem] leading-tight text-cream drop-shadow sm:text-[3.3rem] lg:text-[4.125rem]"
            style={{ fontFamily: '"Manrope", sans-serif', fontWeight: 200 }}
          >
            TRY<span className="text-gradient-earth">B</span>
          </p>
        </Link>

        <h1
          className="mx-auto max-w-xl text-4xl leading-[1.05] text-cream drop-shadow-lg sm:text-5xl lg:text-6xl"
          style={{ fontFamily: '"Manrope", sans-serif', fontWeight: 200 }}
        >
          Real People.
          <br />
          Real Trips.
        </h1>

        {/* Matte/opaque on purpose — the photo behind them has real, varied
            brightness, so these need a fully solid fill to stay legible
            everywhere and read as "the one tappable thing." Fixed colors,
            not the season-driven --primary/--primary-foreground tokens, so
            the hero's two CTAs look the same regardless of the visitor's
            chosen seasonal theme, matching the rest of this deliberately
            season-fixed hero. */}
        <div className="mt-1 flex items-center gap-3">
          <Link
            to="/create"
            className="rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.03]"
            style={{ backgroundColor: "#F2A93B", color: "#1a1206" }}
          >
            Create a TRYP
          </Link>
          <Link
            to="/discover"
            className="rounded-full px-6 py-3 text-sm font-semibold shadow-lg transition hover:scale-[1.03]"
            style={{ backgroundColor: "#FBF8F2", color: "#1a1206" }}
          >
            Join a TRYP
          </Link>
        </div>
      </div>
    </section>
  );
}
