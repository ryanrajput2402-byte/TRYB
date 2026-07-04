import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useThemePreference } from "@/lib/use-theme-preference";
import { ThemeContext } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";

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
      .select("onboarding_completed")
      .eq("id", data.user.id)
      .maybeSingle();

    if (
      (!profile || !profile.onboarding_completed) &&
      window.location.pathname !== "/onboarding"
    ) {
      throw redirect({
        to: "/onboarding",
      });
    }

    return {
      user: data.user,
    };
  },

  component: AuthedLayout,
});

function AuthedLayout() {
  const { user } = Route.useRouteContext();
  const theme = useThemePreference(user.id);
  const themeClassName = seasonThemeClassName(theme.preference ?? DEFAULT_SEASON_THEME);
  return (
    <ThemeContext.Provider value={theme}>
      <div className={`${themeClassName} min-h-screen bg-background pb-24`}>
        <Outlet />
      </div>
    </ThemeContext.Provider>
  );
}
