-- Additive only: three nullable columns for Phase 5's new onboarding
-- questions. No existing columns, policies, or data touched. Existing RLS
-- ("Users update own profile") already covers these (RLS is row-level, not
-- column-level).

-- Backs "Where did you last travel?", surfaced elsewhere as "Raj had his
-- last drift in Spain, 2 months ago" (destination + recency from the date).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_destination TEXT DEFAULT NULL;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_travel_date DATE DEFAULT NULL;

-- Backs "How soon do you want to travel again?" (0-100 day slider, lower =
-- more urgent). Nullable: existing users haven't answered this yet.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS travel_urgency_days INT DEFAULT NULL
  CONSTRAINT profiles_travel_urgency_days_check
  CHECK (travel_urgency_days IS NULL OR (travel_urgency_days >= 0 AND travel_urgency_days <= 100));
