import { Bell } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function TopBar({ avatarUrl, name }: { avatarUrl?: string | null; name?: string | null }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between bg-background/70 px-5 pt-[env(safe-area-inset-top)] pb-3 backdrop-blur-xl">
      <Link to="/home" className="font-display text-2xl font-bold tracking-tight">
        TRY<span className="text-gradient">B</span>
      </Link>
      <div className="flex items-center gap-2">
        <button
          aria-label="Notifications"
          className="grid h-10 w-10 place-items-center rounded-full bg-surface text-foreground hover:bg-surface-elevated"
        >
          <Bell className="h-4.5 w-4.5" />
        </button>
        <Link to="/profile" aria-label="Profile" className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-surface ring-2 ring-primary/50">
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
