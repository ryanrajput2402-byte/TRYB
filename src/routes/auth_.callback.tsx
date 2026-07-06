import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";

export const Route = createFileRoute("/auth_/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    let settled = false;

    async function finish(userId: string | null) {
      if (settled) return;
      settled = true;
      if (!userId) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      const { data: p } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", userId)
        .maybeSingle();
      if (p?.onboarding_completed) navigate({ to: "/home" });
      else navigate({ to: "/onboarding" });
    }

    // supabase-js parses the OAuth tokens out of the URL hash as part of client
    // initialization and fires this once it knows the resulting session state —
    // more reliable than guessing a fixed delay before calling getUser().
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
        finish(session?.user?.id ?? null);
      }
    });

    // Failsafe in case no auth event ever fires for some reason.
    const timeout = setTimeout(() => finish(null), 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [navigate]);
  return (
    <div className={`${seasonThemeClassName(DEFAULT_SEASON_THEME)} text-ink/60 grid min-h-screen place-items-center bg-sand`}>
      Signing you in…
    </div>
  );
}
