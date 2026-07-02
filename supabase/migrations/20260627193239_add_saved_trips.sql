/*
# Add saved_trips table

1. New Tables
- `saved_trips`: stores bookmarked trips per user
  - `id` (uuid, primary key)
  - `user_id` (uuid, FK → auth.users, defaults to auth.uid())
  - `trip_id` (uuid, FK → trips ON DELETE CASCADE)
  - `saved_at` (timestamptz, defaults to now())
  - UNIQUE constraint on (user_id, trip_id)

2. Security
- Enable RLS
- Authenticated users can only read, insert, and delete their own saved_trips rows
*/

CREATE TABLE IF NOT EXISTS saved_trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, trip_id)
);

ALTER TABLE saved_trips ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_saved_trips" ON saved_trips;
CREATE POLICY "select_own_saved_trips" ON saved_trips FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_saved_trips" ON saved_trips;
CREATE POLICY "insert_own_saved_trips" ON saved_trips FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_saved_trips" ON saved_trips;
CREATE POLICY "delete_own_saved_trips" ON saved_trips FOR DELETE
TO authenticated USING (auth.uid() = user_id);
