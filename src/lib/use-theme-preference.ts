import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SeasonThemeId } from "./seasonal-themes";

const CACHE_PREFIX = "tryb-theme-preference-";

function isSeasonThemeId(value: unknown): value is SeasonThemeId {
  return value === "spring" || value === "summer" || value === "autumn" || value === "winter";
}

// Reads/writes profiles.theme_preference. Reusable beyond chat — any screen
// can call this with the current user's id.
//
// `theme_preference` isn't in the generated Supabase types yet (the
// migration that adds it hasn't been applied — see
// supabase/migrations/20260704000000_add_theme_preference.sql, flagged for
// approval). The select/update below are written defensively so the whole
// feature keeps working off the localStorage cache even before that column
// exists in the real database; once it's applied, persistence starts
// working with no code change needed here.
export function useThemePreference(userId: string | null) {
  const [preference, setPreference] = useState<SeasonThemeId | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const cached = window.localStorage.getItem(CACHE_PREFIX + userId);
    if (isSeasonThemeId(cached)) setPreference(cached);

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("theme_preference" as any)
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      const remote = (data as any)?.theme_preference;
      if (!error && isSeasonThemeId(remote)) {
        setPreference(remote);
        window.localStorage.setItem(CACHE_PREFIX + userId, remote);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function choose(id: SeasonThemeId) {
    setPreference(id);
    if (!userId) return;
    window.localStorage.setItem(CACHE_PREFIX + userId, id);
    const { error } = await supabase
      .from("profiles")
      .update({ theme_preference: id } as any)
      .eq("id", userId);
    if (error) {
      // Expected until the flagged migration is applied — the choice still
      // works for this session/browser via the localStorage cache above.
      console.warn("theme_preference not persisted (migration pending?):", error.message);
    }
  }

  return { preference, loading, choose };
}
