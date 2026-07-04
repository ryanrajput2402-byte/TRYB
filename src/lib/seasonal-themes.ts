// Shared seasonal theme registry — single source of truth for the theme id,
// display label, one-line mood, and CSS class for each season. Each
// className is a scoped CSS class defined in styles.css that redeclares the
// same role-slot variables (--sand-bg/--cream/--pine/--clay/--warm-ink/etc.),
// so any screen can opt into theming by wrapping itself in the matching
// className — GroupChat.tsx is the first consumer, not the only one.
export type SeasonThemeId = "spring" | "summer" | "autumn" | "winter";

export type SeasonTheme = {
  id: SeasonThemeId;
  label: string;
  mood: string;
  className: string;
};

export const SEASON_THEMES: SeasonTheme[] = [
  { id: "spring", label: "Spring", mood: "fresh starts", className: "spring-theme" },
  { id: "summer", label: "Summer", mood: "golden energy", className: "summer-theme" },
  { id: "autumn", label: "Autumn", mood: "warm and grounded", className: "autumn-theme" },
  { id: "winter", label: "Winter", mood: "calm and open", className: "winter-theme" },
];

// Applied when a user dismisses the picker without choosing, or before their
// preference has loaded. Autumn was the first/most-tested palette and reads
// as a safe year-round default rather than a specific-season statement.
export const DEFAULT_SEASON_THEME: SeasonThemeId = "autumn";

export function seasonThemeClassName(id: SeasonThemeId): string {
  return SEASON_THEMES.find((t) => t.id === id)?.className ?? SEASON_THEMES[0].className;
}

// Session-only "don't nag me again" flag for the first-login picker (Home).
// Deliberately sessionStorage, not localStorage/DB: dismissing just defers
// the choice, it isn't a real preference — a fresh session should ask again.
export const THEME_PICKER_DISMISSED_KEY = "tryb-theme-picker-dismissed";
