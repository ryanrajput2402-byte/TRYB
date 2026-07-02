/*
# Extend chat schema: reactions, polls, expense settlement

1. Changes to existing tables
- `messages`: add `metadata` (jsonb, for poll/expense summary data), `reply_to` (self-FK),
  `edited_at`, `deleted_at`. Widen `message_type` check to add 'expense' and 'poll'.
- `expenses`: add `settled_by` (uuid[], users who've paid their share) alongside the
  existing `settled` boolean.

2. New tables
- `message_reactions`: one row per (message, user, emoji). Unique on the triple so a
  user can't double-react with the same emoji.
- `polls` / `poll_options` / `poll_votes`: a poll is always attached to a chat message
  via `polls.message_id`. `poll_votes` is unique per (poll, user) — voting again moves
  the vote rather than stacking.

3. Security
- All new tables enable RLS, scoped to approved members of the message's trip via the
  existing `is_trip_approved_member` helper (reached through a message_id/poll_id join,
  wrapped in SECURITY DEFINER helpers to avoid recursive RLS).
- All new tables added to the `supabase_realtime` publication so reactions/votes update
  live, matching `messages` which already has Realtime enabled.
*/

-- ============ messages: extend ============
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_message_type_check;
ALTER TABLE public.messages ADD CONSTRAINT messages_message_type_check
  CHECK (message_type IN ('text', 'keyo', 'expense', 'poll', 'system'));

-- ============ expenses: extend ============
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS settled_by UUID[] NOT NULL DEFAULT '{}';

-- ============ helper: trip membership via a message ============
CREATE OR REPLACE FUNCTION public.is_message_trip_member(_message_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_trip_approved_member(m.trip_id, _user_id)
  FROM public.messages m WHERE m.id = _message_id;
$$;

REVOKE EXECUTE ON FUNCTION public.is_message_trip_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_message_trip_member(UUID, UUID) TO authenticated;

-- ============ message_reactions ============
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);

GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members view reactions" ON public.message_reactions
  FOR SELECT TO authenticated USING (public.is_message_trip_member(message_id, auth.uid()));
CREATE POLICY "Trip members add own reactions" ON public.message_reactions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_message_trip_member(message_id, auth.uid()));
CREATE POLICY "Users remove own reactions" ON public.message_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ polls ============
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  locked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members view polls" ON public.polls
  FOR SELECT TO authenticated USING (public.is_message_trip_member(message_id, auth.uid()));
CREATE POLICY "Trip members create polls" ON public.polls
  FOR INSERT TO authenticated WITH CHECK (public.is_message_trip_member(message_id, auth.uid()));
CREATE POLICY "Trip members lock polls" ON public.polls
  FOR UPDATE TO authenticated USING (public.is_message_trip_member(message_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.is_poll_trip_member(_poll_id UUID, _user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_message_trip_member(p.message_id, _user_id)
  FROM public.polls p WHERE p.id = _poll_id;
$$;

REVOKE EXECUTE ON FUNCTION public.is_poll_trip_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_poll_trip_member(UUID, UUID) TO authenticated;

-- ============ poll_options ============
CREATE TABLE IF NOT EXISTS public.poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members view poll options" ON public.poll_options
  FOR SELECT TO authenticated USING (public.is_poll_trip_member(poll_id, auth.uid()));
CREATE POLICY "Trip members create poll options" ON public.poll_options
  FOR INSERT TO authenticated WITH CHECK (public.is_poll_trip_member(poll_id, auth.uid()));

-- ============ poll_votes ============
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trip members view poll votes" ON public.poll_votes
  FOR SELECT TO authenticated USING (public.is_poll_trip_member(poll_id, auth.uid()));
CREATE POLICY "Trip members cast own vote" ON public.poll_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_poll_trip_member(poll_id, auth.uid()));
CREATE POLICY "Users change own vote" ON public.poll_votes
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users retract own vote" ON public.poll_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ realtime ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.expenses;

-- ============ indexes ============
CREATE INDEX IF NOT EXISTS messages_reply_to_idx ON public.messages(reply_to);
CREATE INDEX IF NOT EXISTS message_reactions_message_idx ON public.message_reactions(message_id);
CREATE INDEX IF NOT EXISTS polls_message_idx ON public.polls(message_id);
CREATE INDEX IF NOT EXISTS poll_options_poll_idx ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS poll_votes_poll_idx ON public.poll_votes(poll_id);
