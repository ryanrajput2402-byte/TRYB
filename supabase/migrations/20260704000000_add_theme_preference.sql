-- Additive only: adds a nullable theme preference to profiles for the
-- seasonal chat theme system (spring/summer/autumn/winter). No existing
-- columns, policies, or data are touched. Existing RLS policies
-- ("Users update own profile") already cover this new column since RLS is
-- row-level, not column-level — no new policy needed.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT NULL;
