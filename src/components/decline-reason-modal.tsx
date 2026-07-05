import { useState } from "react";
import { X } from "lucide-react";

const DECLINE_REASONS = ["Trip is full", "Doesn't match the vibe", "Timing doesn't work", "Other"];

// Group F, item 14 — optional template reason, surfaced back to the
// requester. Declining without picking a reason is still allowed (the
// reason is a nicety, never a gate on the action itself).
export function DeclineReasonModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="warm-card text-ink relative z-10 w-full max-w-md rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="fomo-heading text-xl font-bold">Decline this request</h2>
          <button onClick={onClose} className="hover:text-ink grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-ink/50 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-ink/50">
          Optional — letting them know why helps more than a silent decline.
        </p>
        <div className="flex flex-wrap gap-2">
          {DECLINE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                reason === r ? "bg-primary text-primary-foreground" : "warm-card text-ink/60"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="mt-5 flex gap-3">
          <button onClick={() => onConfirm(null)} className="hover:bg-ink/5 flex-1 rounded-full border border-ink/10 py-3 text-sm font-medium text-ink transition">
            Skip
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={!reason}
            className="bg-primary text-primary-foreground flex-1 rounded-full py-3 text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
          >
            Decline with reason
          </button>
        </div>
      </div>
    </div>
  );
}
