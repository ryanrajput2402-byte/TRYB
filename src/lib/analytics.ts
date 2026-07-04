// Instrumentation stubs — item 41. No analytics provider is wired into this
// app yet, so these are intentionally no-ops beyond a dev-only console line.
// Every call site already routes through here, so connecting a real provider
// (PostHog, Amplitude, GA, etc.) later is a one-file change: replace the body
// of trackEvent, leave every call site untouched.
export type AnalyticsEvent =
  | { name: "card_viewed"; tripId: string; destination: string; featured: boolean }
  | { name: "card_tapped"; tripId: string; destination: string }
  | { name: "filter_used"; destination: string | null }
  | { name: "save_tapped"; tripId: string; saved: boolean };

export function trackEvent(event: AnalyticsEvent) {
  if (typeof window !== "undefined" && window.location.hostname === "localhost") {
    // eslint-disable-next-line no-console
    console.debug("[analytics:stub]", event.name, event);
  }
  // LATER: forward to a real analytics provider here once one exists.
}
