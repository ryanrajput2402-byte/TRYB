import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell } from "lucide-react";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — TRYB" }] }),
  component: NotificationsStub,
});

function NotificationsStub() {
  const navigate = useNavigate();
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  return (
    <div className={`${themeClassName} relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sand px-6 text-center`}>
      <div className="warm-aurora" aria-hidden />
      <button
        onClick={() => navigate({ to: "/home" })}
        className="warm-card shadow-warm absolute left-4 top-[calc(env(safe-area-inset-top)+12px)] grid h-10 w-10 place-items-center rounded-full"
        aria-label="Back"
      >
        <ArrowLeft className="text-ink h-4 w-4" />
      </button>
      <div className="warm-card shadow-warm relative max-w-md rounded-3xl p-8">
        <Bell className="text-primary mx-auto h-10 w-10" />
        <h1 className="fomo-heading text-ink mt-3 text-2xl font-bold">Notifications are coming soon</h1>
        <p className="text-ink/60 mt-2 text-sm">
          Joins, approvals, and likes will show up here. We're still building this one.
        </p>
      </div>
    </div>
  );
}
