import { useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

const REPORT_REASONS: { id: string; label: string }[] = [
  { id: "spam", label: "Spam" },
  { id: "inappropriate", label: "Inappropriate content" },
  { id: "safety_concern", label: "Safety concern" },
  { id: "other", label: "Other" },
];

// Group F, item 10 — shared by trip detail (reports the trip/organizer) and
// the other-user profile page (reports the user). Write-only: nothing
// submitted here is ever read back through the app.
export function ReportModal({
  open,
  onClose,
  targetType,
  targetId,
}: {
  open: boolean;
  onClose: () => void;
  targetType: "trip" | "user";
  targetId: string;
}) {
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("moderation_reports").insert({
        reporter_id: u.user.id,
        reported_trip_id: targetType === "trip" ? targetId : null,
        reported_user_id: targetType === "user" ? targetId : null,
        reason,
        details: details.trim() || null,
      });
      if (error) throw error;
      trackEvent({ name: "report_submitted", targetType });
      toast.success("Report submitted — our team will review it");
      setReason(null);
      setDetails("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't submit report");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="warm-card text-ink relative z-10 w-full max-w-md rounded-t-3xl p-6 shadow-2xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="fomo-heading text-xl font-bold">Report this {targetType === "trip" ? "trip" : "user"}</h2>
          <button onClick={onClose} className="hover:text-ink grid h-9 w-9 place-items-center rounded-full bg-ink/5 text-ink/50 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-ink/50">
          Reports are reviewed by our team and never shared with the person you're reporting.
        </p>
        <div className="flex flex-wrap gap-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                reason === r.id ? "bg-primary text-primary-foreground" : "warm-card text-ink/60"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          className="ipt mt-3 min-h-20 w-full"
          placeholder="Anything else we should know? (optional)"
          value={details}
          onChange={(e) => setDetails(e.target.value)}
        />
        <button
          onClick={submit}
          disabled={!reason || submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-3 font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit report"}
        </button>
      </div>
    </div>
  );
}
