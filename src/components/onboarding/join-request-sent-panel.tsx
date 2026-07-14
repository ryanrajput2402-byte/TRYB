import { CheckCircle2 } from "lucide-react";

// Replaces the old bare "Request sent ✓" toast, which was a dead end. Stays
// on the trip page instead of routing elsewhere — the person just asked to
// join this group, so this page is exactly where they want to be next.
export function JoinRequestSentPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-popover p-6 text-center text-foreground shadow-2xl sm:rounded-3xl">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="size-7" />
        </div>
        <h2 className="display mt-4 text-xl font-semibold">Request sent</h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
          The organizer's been notified — you'll get a ping the moment they respond. Somewhere
          out there, this trip is already becoming a memory you haven't made yet.
        </p>
        <button
          onClick={onClose}
          className="mt-6 w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
