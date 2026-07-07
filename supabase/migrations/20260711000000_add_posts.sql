/*
# Posts (travel stories + trip-announcement posts)

Phase 1 of the MAJOR TRYB OVERHAUL — schema for the new social feed
(Phase 3). One table serves both flows:
  - a travel story a user shares (optionally tied to a trip that just
    wrapped up)
  - a "planning for X" announcement prompted at the end of trip creation

`post_type` distinguishes the two so the feed renders each correctly
without inferring intent from nullable columns alone. `trip_id` is
ON DELETE SET NULL (not CASCADE) — a post is a piece of social content
the user owns; it shouldn't vanish just because the linked trip was later
deleted, it just becomes an orphaned story. `destination` is nullable:
travel-story posts (no trip_id) carry it directly; trip-announcement
posts can fall back to the linked trip's own destination in the app
layer instead of duplicating it.

The images check encodes Phase 3's stated rule (3-5 images for a travel
story) while leaving trip-announcement posts free to have 0-5 (an
announcement doesn't require photos of its own). Additive only — no
existing table, column, or policy is touched.
*/

CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id UUID REFERENCES public.trips(id) ON DELETE SET NULL,
  post_type TEXT NOT NULL DEFAULT 'story' CHECK (post_type IN ('story', 'trip_announcement')),
  images TEXT[] NOT NULL DEFAULT '{}',
  caption TEXT NOT NULL DEFAULT '',
  destination TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT posts_images_count_check CHECK (
    COALESCE(array_length(images, 1), 0) <= 5
    AND (post_type = 'trip_announcement' OR COALESCE(array_length(images, 1), 0) >= 3)
  )
);

GRANT SELECT, INSERT, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts viewable by any authenticated user" ON public.posts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own posts" ON public.posts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users delete own posts" ON public.posts
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Phase 3 requires the feed to update instantly for all viewers — learned
-- the hard way (trip_spend_estimates) that this must be added the moment
-- the table is created, not bolted on later.
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
