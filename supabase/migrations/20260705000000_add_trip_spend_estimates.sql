-- Additive only: new table for Group E, item 1 — a lightweight, informal
-- "estimated so far" running total the group can track together, kept
-- deliberately separate from the real `expenses` table (settled,
-- payer-attributed, split-calculated). Each row is a real entry a real
-- member added; the pinned strip in chat just sums them, nothing fabricated.
CREATE TABLE public.trip_spend_estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.trip_spend_estimates TO authenticated;
GRANT ALL ON public.trip_spend_estimates TO service_role;
ALTER TABLE public.trip_spend_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved members view trip spend estimates" ON public.trip_spend_estimates
  FOR SELECT TO authenticated USING (public.is_trip_approved_member(trip_id, auth.uid()));
CREATE POLICY "Approved members add spend estimates" ON public.trip_spend_estimates
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_trip_approved_member(trip_id, auth.uid()));
