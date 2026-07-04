import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TopBar({ avatarUrl, name }: { avatarUrl?: string | null; name?: string | null }) {
  return (
    <header className="warm-card sticky top-0 z-30 flex items-center justify-between rounded-none border-0 border-b border-ink/8 px-5 pt-[env(safe-area-inset-top)] pb-3">
      <Link to="/home" className="fomo-heading text-ink text-2xl font-bold tracking-tight">
        TRY<span className="text-gradient-earth">B</span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="warm-card text-ink grid h-10 w-10 place-items-center rounded-full"
        >
          <Bell className="h-4.5 w-4.5" />
        </button>
        <Link to="/profile" aria-label="Profile" className="warm-card grid h-10 w-10 place-items-center overflow-hidden rounded-full ring-2 ring-primary/50">
          {avatarUrl ? (
            <img src={avatarUrl} alt={name ?? "You"} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-primary">{(name ?? "?").slice(0, 1).toUpperCase()}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
