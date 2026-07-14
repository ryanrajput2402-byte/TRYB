import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { CinematicMontage } from "@/components/onboarding/cinematic-montage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TRYB — Travel together. Discover more." },
      {
        name: "description",
        content:
          "Social travel platform: find companions, join real group trips, split costs and plans right in the chat.",
      },
    ],
  }),
  component: Landing,
});

// Cinematic Opener entry point — Step 1 of the 5-step first-run flow.
// A session redirects straight to /home (returning users never see this).
// No session means Step 1 shows; Step 2 (the lamp-pull login) is next —
// until that's wired in, completing or skipping the montage hands off to
// the existing /auth signup screen as an interim landing spot.
function Landing() {
  const navigate = useNavigate();
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

  const themeClassName = seasonThemeClassName(DEFAULT_SEASON_THEME);

  if (!checked) return <div className={`${themeClassName} min-h-screen bg-sand`} />;

  function advanceToLogin() {
    navigate({ to: "/auth", search: { mode: "signup" } });
  }

  return <CinematicMontage onComplete={advanceToLogin} onSkip={advanceToLogin} />;
}
