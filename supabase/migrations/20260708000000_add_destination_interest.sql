-- Additive only: new table for the Discover "be the first" empty state —
-- a real, lightweight demand signal (who wants a destination with zero
-- trips yet), separate from actually creating a trip. SELECT is open (like
-- trips/profiles already are) so a real interest count can be shown back
-- to the person who just registered — no other PII exposed.
CREATE TABLE public.destination_interest (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, destination)
);

GRANT SELECT, INSERT ON public.destination_interest TO authenticated;
GRANT ALL ON public.destination_interest TO service_role;
ALTER TABLE public.destination_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users register their own interest" ON public.destination_interest
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Anyone can see interest counts" ON public.destination_interest
  FOR SELECT TO authenticated USING (true);
