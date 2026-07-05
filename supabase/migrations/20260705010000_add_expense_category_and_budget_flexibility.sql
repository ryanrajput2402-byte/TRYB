-- Additive only: two nullable/defaulted columns, no existing columns,
-- policies, or data touched. Existing RLS on both tables already covers
-- these new columns (RLS is row-level, not column-level).

-- Group E, item 2 — optional category on a logged expense, so a
-- per-category breakdown can be shown once real expenses exist.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT NULL
  CONSTRAINT expenses_category_check CHECK (category IS NULL OR category IN ('stay', 'travel', 'food', 'other'));

-- Group E, item 6 — organizer-set at trip creation, shown as a small tag.
ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS budget_flexibility TEXT DEFAULT NULL
  CONSTRAINT trips_budget_flexibility_check CHECK (budget_flexibility IS NULL OR budget_flexibility IN ('strict', 'flexible'));
