-- Additive only: new column gating the first-login onboarding intro
-- carousel, sequenced before the existing theme picker.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_intro_seen BOOLEAN NOT NULL DEFAULT false;

-- Backfill: existing users have already been through onboarding once —
-- this is what prevents the new carousel from double-firing for them.
-- Only rows created after this migration (genuinely new signups) keep the
-- real default of false, which is what triggers the carousel for them.
UPDATE public.profiles SET onboarding_intro_seen = true;
