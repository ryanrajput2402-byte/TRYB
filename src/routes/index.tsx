import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Compass, Users, Sparkles, MapPin, ArrowRight } from "lucide-react";
import { DESTINATIONS } from "@/lib/destinations";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRYB — Travel together. Discover more." },
      { name: "description", content: "Social travel platform: find companions, join group trips, plan with AI." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        window.location.replace("/home");
      } else {
        setChecked(true);
      }
    });
  }, []);

  if (!checked) return <div className="min-h-screen bg-background" />;

  const heroImages = DESTINATIONS.slice(0, 6);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="hero-glow pointer-events-none absolute inset-0" />

      {/* Floating destination cards backdrop */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        {heroImages.map((d, i) => (
          <div
            key={d.slug}
            className="animate-float absolute h-40 w-32 overflow-hidden rounded-2xl shadow-2xl md:h-56 md:w-44"
            style={{
              top: `${10 + ((i * 17) % 70)}%`,
              left: `${(i * 19) % 85}%`,
              animationDelay: `${i * 0.7}s`,
              transform: `rotate(${(i % 2 ? 1 : -1) * (5 + i * 2)}deg)`,
            }}
          >
            <img src={d.image} alt={d.name} className="h-full w-full object-cover" loading="lazy" />
          </div>
        ))}
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="glass-card mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          AI-powered social travel
        </div>

        <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
          Travel <span className="text-gradient">together.</span>
          <br /> Discover more.
        </h1>

        <p className="mt-6 max-w-xl text-base text-muted-foreground md:text-lg">
          Find your tribe. Join real trips with real people. Let AI plan the itinerary — you just show up.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-[var(--shadow-glow)] transition hover:scale-[1.03]"
          >
            Join TRYB
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
          </Link>
          <Link
            to="/auth"
            search={{ mode: "login" }}
            className="rounded-full border border-glass-border px-8 py-4 font-medium text-foreground hover:bg-surface"
          >
            I have an account
          </Link>
        </div>

        <div className="mt-20 grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
          <Feature icon={<Compass className="h-5 w-5" />} title="Discover trips" body="Real trips from real travelers." />
          <Feature icon={<Users className="h-5 w-5" />} title="Find your tribe" body="Match by vibe, budget, and style." />
          <Feature icon={<MapPin className="h-5 w-5" />} title="AI plans it" body="Keyo builds your itinerary." />
        </div>
      </main>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="glass-card rounded-2xl p-5 text-left">
      <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">{icon}</div>
      <h3 className="font-display text-base font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
