-- Additive only: new table, no existing schema touched.
-- Write-only from the client: authenticated users can insert their own
-- events (user_id must match auth.uid()), nobody can read/update/delete via
-- the anon/authenticated role. Analysis happens via the service role
-- (SQL editor), not the app itself.
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT INSERT ON public.analytics_events TO authenticated;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own events" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
