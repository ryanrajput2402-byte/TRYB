-- Additive only: three nullable/defaulted columns, no existing columns,
-- policies, or data touched. Existing RLS already covers these (RLS is
-- row-level, not column-level).

-- Group F, item 11 — organizer self-declared response-time expectation.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS response_time_expectation TEXT DEFAULT NULL
  CONSTRAINT profiles_response_time_check CHECK (response_time_expectation IS NULL OR response_time_expectation IN ('fast', 'daily', 'flexible'));

-- Group F, item 12 — real verified-email badge, synced from auth.users
-- (Supabase Auth's own email_confirmed_at), not a separate self-reported
-- flag. profiles is already readable by any authenticated user, so this
-- makes the fact visible on other people's profiles too, not just your own.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;

UPDATE public.profiles p
SET email_verified = (u.email_confirmed_at IS NOT NULL)
FROM auth.users u
WHERE u.id = p.id;

CREATE OR REPLACE FUNCTION public.sync_email_verified()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET email_verified = (NEW.email_confirmed_at IS NOT NULL) WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- Alphabetically after the existing on_auth_user_created trigger, so the
-- profiles row already exists (from handle_new_user) by the time this runs.
CREATE TRIGGER sync_email_verified_on_auth_change
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_email_verified();

-- Group F, item 14 — optional template reason an organizer picks when
-- declining a join request, surfaced back to the requester.
ALTER TABLE public.trip_members
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL;
