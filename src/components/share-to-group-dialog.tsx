import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader as Loader2, Send } from "lucide-react";
import type { FeedPost } from "@/components/post-card";
import { useAppTheme } from "@/lib/theme-context";
import { DEFAULT_SEASON_THEME, seasonThemeClassName } from "@/lib/seasonal-themes";

type TripOption = { id: string; destination: string; title: string; cover_image: string | null };

// Reuses the existing chat message system — a post_reference message_type
// (widened via migration) carrying the shared post's essentials in the
// same `metadata` JSONB column expense/poll messages already use. No new
// realtime wiring needed: it flows through the messages table's existing
// INSERT subscription in GroupChat.
export function ShareToGroupDialog({
  open,
  onOpenChange,
  post,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: FeedPost;
}) {
  const { preference: themePreference } = useAppTheme();
  const themeClassName = seasonThemeClassName(themePreference ?? DEFAULT_SEASON_THEME);
  const [trips, setTrips] = useState<TripOption[] | null>(null);
  const [sharingTripId, setSharingTripId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || trips !== null) return;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: memberships } = await supabase
        .from("trip_members")
        .select("trip_id")
        .eq("user_id", u.user.id)
        .eq("status", "approved");
      const tripIds = (memberships ?? []).map((m: any) => m.trip_id);
      const { data: tripRows } = tripIds.length
        ? await supabase.from("trips").select("id, destination, title, cover_image").in("id", tripIds)
        : { data: [] as TripOption[] };
      setTrips((tripRows ?? []) as TripOption[]);
    })();
  }, [open, trips]);

  async function shareToTrip(trip: TripOption) {
    if (sharingTripId) return;
    setSharingTripId(trip.id);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("messages").insert({
        trip_id: trip.id,
        sender_id: u.user.id,
        message_type: "post_reference",
        content: post.caption || "Shared a post",
        metadata: {
          post_id: post.id,
          poster_name: post.poster?.full_name ?? "Someone",
          image: post.images[0] ?? post.trip?.cover_image ?? null,
          caption: post.caption,
          destination: post.destination,
        },
      });
      if (error) throw error;
      toast.success(`Shared to ${trip.destination}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't share this");
    } finally {
      setSharingTripId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${themeClassName} border-ink/10 bg-sand sm:rounded-3xl`}>
        <DialogHeader>
          <DialogTitle className="fomo-heading text-ink">Share to a group</DialogTitle>
        </DialogHeader>
        {trips === null ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="skeleton-fomo h-14 rounded-2xl" />)}
          </div>
        ) : trips.length === 0 ? (
          <p className="py-4 text-center text-sm text-ink/50">You're not in any trip chats yet.</p>
        ) : (
          <div className="space-y-2">
            {trips.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => shareToTrip(t)}
                disabled={!!sharingTripId}
                className="warm-card flex w-full items-center gap-3 rounded-2xl p-3 text-left transition hover:bg-ink/5 disabled:opacity-60"
              >
                {t.cover_image && <img src={t.cover_image} alt="" className="h-10 w-10 flex-shrink-0 rounded-xl object-cover" />}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{t.title}</p>
                  <p className="truncate text-xs text-ink/50">{t.destination}</p>
                </div>
                {sharingTripId === t.id ? <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-ink/40" /> : <Send className="h-4 w-4 flex-shrink-0 text-ink/40" />}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
