import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallback,
});

function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      // Give Supabase a moment to set the session from URL hash
      await new Promise((r) => setTimeout(r, 150));
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/auth", search: { mode: "login" } });
        return;
      }
      const { data: p } = await supabase.from("profiles").select("onboarding_completed").eq("id", data.user.id).maybeSingle();
      if (p?.onboarding_completed) navigate({ to: "/home" });
      else navigate({ to: "/onboarding" });
    })();
  }, [navigate]);
  return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground">Signing you in…</div>;
}
