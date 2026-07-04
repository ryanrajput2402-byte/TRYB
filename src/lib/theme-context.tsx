import { createContext, useContext } from "react";
import { SeasonThemeId } from "./seasonal-themes";

export type ThemeContextValue = {
  preference: SeasonThemeId | null;
  loading: boolean;
  choose: (id: SeasonThemeId) => void;
};

// Populated once at the authenticated root layout (one useThemePreference
// call for the whole app) so every screen reads/writes the same state —
// picking a theme in one place (Home's first-login modal, Profile's entry
// point) is instantly reflected everywhere, no reload needed.
export const ThemeContext = createContext<ThemeContextValue | null>(null);

export function useAppTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useAppTheme must be used within the authenticated layout's ThemeContext.Provider");
  return ctx;
}
