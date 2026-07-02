import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

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
  return (
    <div className="min-h-screen bg-background pb-24">
      <Outlet />
    </div>
  );
}
