-- Additive only: new table for Group F, item 10 — a basic report/flag
-- mechanism, write-only from the client (same pattern as analytics_events).
-- Nobody, including the reporter, can read reports back through the app;
-- review happens via the SQL editor / service role only, so a report is
-- never surfaced back to the reported person (avoids retaliation risk).
CREATE TABLE public.moderation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reported_trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'safety_concern', 'other')),
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT moderation_reports_target_check CHECK (
    (reported_trip_id IS NOT NULL AND reported_user_id IS NULL) OR
    (reported_trip_id IS NULL AND reported_user_id IS NOT NULL)
  )
);

GRANT INSERT ON public.moderation_reports TO authenticated;
GRANT ALL ON public.moderation_reports TO service_role;
ALTER TABLE public.moderation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users file their own reports" ON public.moderation_reports
  FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());
