import { createFileRoute, Outlet, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useThemePreference } from "@/lib/use-theme-preference";
import { ThemeContext } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";
import { OnboardingIntroCarousel } from "@/components/onboarding-intro-carousel";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,

  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw redirect({
        to: "/auth",
        search: { mode: "login" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed, onboarding_intro_seen")
      .eq("id", data.user.id)
      .maybeSingle();

    if ((!profile || !profile.onboarding_completed) && window.location.pathname !== "/onboarding") {
      throw redirect({
        to: "/onboarding",
      });
    }

    return {
      user: data.user,
      introSeen: profile?.onboarding_intro_seen ?? false,
    };
  },

  component: AuthedLayout,
});

function AuthedLayout() {
  const { user, introSeen } = Route.useRouteContext();
  const navigate = useNavigate();
  const theme = useThemePreference(user.id);
  const themeClassName = seasonThemeClassName(theme.preference ?? DEFAULT_SEASON_THEME);
  // Shown once ever, on whatever authenticated screen the user lands on
  // first after finishing onboarding — not coupled to any one page, so it
  // still appears correctly however the wizard hands off.
  const [showIntro, setShowIntro] = useState(!introSeen);

  async function dismissIntro() {
    setShowIntro(false);
    await supabase.from("profiles").update({ onboarding_intro_seen: true }).eq("id", user.id);
  }

  return (
    <ThemeContext.Provider value={theme}>
      <div className={`${themeClassName} min-h-screen pb-24`}>
        <Outlet />
        {showIntro && (
          <OnboardingIntroCarousel
            onClose={dismissIntro}
            onCreateTrip={() => {
              dismissIntro();
              navigate({ to: "/create" });
            }}
          />
        )}
      </div>
    </ThemeContext.Provider>
  );
}
