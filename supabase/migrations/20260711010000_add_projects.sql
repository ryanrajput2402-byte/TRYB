/*
# Projects (missions — the "0.01% change" social-good feature)

Phase 1 of the MAJOR TRYB OVERHAUL. Browsable/openable like trips
(Phase 4). `face_image` is required — the one identifying photo behind
the project; `images` are optional supporting photos, capped at 5 for
consistency with posts. Creator can update their own project (unlike
posts, which are immutable once shared) since a mission's needs/
contribute info is expected to evolve over time — same shape as
"Organizer updates trip".

No realtime publication entry: browsing projects is a normal
fetch-on-open, the same as trips (which also isn't on the realtime
publication) — add it later if a live projects feed becomes a real
requirement. Additive only.
*/

CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  face_image TEXT NOT NULL,
  images TEXT[] NOT NULL DEFAULT '{}',
  description TEXT NOT NULL DEFAULT '',
  what_solving TEXT NOT NULL DEFAULT '',
  needs TEXT NOT NULL DEFAULT '',
  how_to_contribute TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT projects_images_count_check CHECK (COALESCE(array_length(images, 1), 0) <= 5)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Projects viewable by any authenticated user" ON public.projects
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own projects" ON public.projects
  FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creator updates own project" ON public.projects
  FOR UPDATE TO authenticated USING (creator_id = auth.uid()) WITH CHECK (creator_id = auth.uid());
CREATE POLICY "Creator deletes own project" ON public.projects
  FOR DELETE TO authenticated USING (creator_id = auth.uid());
