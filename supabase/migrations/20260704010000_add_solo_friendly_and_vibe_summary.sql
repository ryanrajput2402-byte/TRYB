-- Additive only: two nullable/defaulted columns on trips, no existing
-- columns, policies, or data touched. Existing RLS policies on trips
-- already cover these new columns (RLS is row-level, not column-level).

-- Organizer-set at trip creation; defaults false so every existing row
-- reads as "not flagged solo-friendly" rather than an unknown state.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS solo_friendly BOOLEAN NOT NULL DEFAULT false;

-- Organizer-set short "vibe in 3 words" blurb. Nullable (absent by default,
-- never fabricated for existing trips); capped at 40 chars to keep it a
-- one-line accent on cards/detail rather than a second description field.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS vibe_summary TEXT DEFAULT NULL
  CONSTRAINT trips_vibe_summary_length CHECK (vibe_summary IS NULL OR char_length(vibe_summary) <= 40);
