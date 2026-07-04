import { X } from "lucide-react";
import { SEASON_THEMES, SeasonThemeId } from "@/lib/seasonal-themes";

// First-login theme picker. Each postcard wraps itself in its own season's
// CSS theme class (e.g. spring-theme), so bg-sand/bg-cream/bg-clay/shadow-warm
// inside it resolve to that season's real values — a genuine live preview
// with zero duplicated color literals in JS. Entrance/hover motion relies on
// the global prefers-reduced-motion CSS rule in styles.css (collapses
// animation/transition durations to ~0), so no extra JS gating needed here.
export function ThemePickerModal({
  onChoose,
  onDismiss,
}: {
  onChoose: (id: SeasonThemeId) => void;
  onDismiss: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Choose your chat theme"
    >
      <div
        className="autumn-theme animate-scale-in relative w-full max-w-md rounded-3xl bg-sand p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Skip for now"
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full text-ink/40 hover:bg-ink/5 hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>

        <h2 className="fomo-heading pr-8 text-center text-xl font-bold text-ink">Pick your vibe</h2>
        <p className="mt-1 text-center text-sm text-ink/50">
          Every trip has a season. Which one feels like you right now?
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {SEASON_THEMES.map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onChoose(theme.id)}
              aria-label={`Choose ${theme.label} — ${theme.mood}`}
              className={`${theme.className} shadow-warm rounded-2xl bg-sand p-3 text-left transition hover:-translate-y-0.5 active:scale-[0.98]`}
            >
              <div className="space-y-1.5 rounded-xl bg-cream p-2">
                <div className="shadow-warm-sm w-3/4 rounded-full bg-cream px-2 py-1 text-[9px] text-ink/70">
                  hey! so hyped
                </div>
                <div className="bg-clay ml-auto w-3/4 rounded-full px-2 py-1 text-right text-[9px] text-white">
                  same, let's go
                </div>
              </div>
              <p className="fomo-heading mt-2 text-sm font-bold text-ink">{theme.label}</p>
              <p className="text-[11px] text-ink/50">{theme.mood}</p>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-ink/40">Change your vibe anytime from your profile.</p>
      </div>
    </div>
  );
}
