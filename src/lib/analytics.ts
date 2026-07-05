import { supabase } from "@/integrations/supabase/client";

// Instrumentation — item 41 (stub) + Group D (real persistence). Every call
// site routes through trackEvent, which does two things: a dev-only console
// line (unchanged from the original stub) and a fire-and-forget insert into
// analytics_events. Inserts never block or throw into the UI — analytics
// failing silently is always better than a broken interaction.
export type AnalyticsEvent =
  | { name: "card_viewed"; tripId: string; destination: string; featured: boolean }
  | { name: "card_tapped"; tripId: string; destination: string }
  | { name: "filter_used"; destination: string | null }
  | { name: "save_tapped"; tripId: string; saved: boolean }
  // Group D, item 1 — every Discover filter interaction, tagged by axis, so
  // usage across destination/date/size/vibe/solo is directly comparable.
  | { name: "discover_filter_used"; filterType: "destination" | "date" | "size" | "vibe" | "solo" | "budget"; value: string }
  // Group E, item 1 — a new user-facing flow step (adding an informal
  // running-spend estimate in chat), tracked the same way as everything else.
  | { name: "spend_estimate_added"; tripId: string; amount: number }
  // Group D, item 2 — isolated from the general filter event above so the
  // solo-traveler hypothesis can be measured on its own, not buried in a
  // filterType breakdown.
  | { name: "solo_filter_toggled"; enabled: boolean }
  // Group D, item 3 — start/cancel/submit around the join-request flow.
  // Abandonment itself is never computed or stored here — it's derived
  // later by comparing "started" rows against "submitted" rows for the same
  // user+trip, real data only, never a guessed live flag.
  | { name: "join_request_started"; tripId: string; isFirstEver: boolean }
  | { name: "join_request_cancelled"; tripId: string }
  | { name: "join_request_submitted"; tripId: string }
  // Group F, item 10 — target type only, never the reason/details (those
  // live solely in the write-only moderation_reports table).
  | { name: "report_submitted"; targetType: "trip" | "user" }
  // Group F, item 14 — a new flow step (organizer picks a template reason
  // when declining), tracked the same way as everything else.
  | { name: "join_request_declined"; reasonTemplate: string }
  // Discover Feature 1 — a real demand signal (destination with zero real
  // trips that someone wants), queryable later to prioritize seeding.
  | { name: "destination_interest_registered"; destination: string };

export function trackEvent(event: AnalyticsEvent) {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:stub]", event.name, event);
  }

  const { name, ...payload } = event;
  supabase.auth.getSession().then(({ data }) => {
    supabase
      .from("analytics_events")
      .insert({ user_id: data.session?.user.id ?? null, name, payload })
      .then(({ error }) => {
        if (error && typeof window !== "undefined" && window.location.hostname === "localhost") {
          // eslint-disable-next-line no-console
          console.debug("[analytics] insert failed", error.message);
        }
      });
  });
}
