import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GroupChat } from "@/components/chat/GroupChat";

export const Route = createFileRoute("/_authenticated/trip/$tripId_/chat")({
  head: () => ({ meta: [{ title: "Group chat — TRYB" }] }),
  component: ChatPage,
});

function ChatPage() {
  const { tripId } = Route.useParams();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">("checking");
  const themeClassName = "tryb-theme";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("trip_members")
        .select("status")
        .eq("trip_id", tripId)
        .eq("user_id", userData.user.id)
        .maybeSingle();
      if (!cancelled) setStatus(data?.status === "approved" ? "allowed" : "denied");
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId]);

  if (status === "checking") return <div className={`${themeClassName} min-h-screen bg-sand`} />;

  if (status === "denied") {
    return (
      <div className={`${themeClassName} relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-sand px-6 text-center`}>
        <div className="warm-aurora" aria-hidden />
        <div className="warm-card shadow-warm relative max-w-md rounded-3xl p-8">
          <h1 className="fomo-heading text-ink text-2xl font-bold">You're not in this trip yet</h1>
          <p className="mt-2 text-sm text-ink/60">
            Join the trip and get approved by the organizer to see the group chat.
          </p>
          <Link
            to="/trip/$tripId"
            params={{ tripId }}
            className="bg-primary text-cream mt-6 inline-block rounded-full px-6 py-2.5 font-semibold"
          >
            ← Back to trip
          </Link>
        </div>
      </div>
    );
  }

  return <GroupChat tripId={tripId} />;
}
