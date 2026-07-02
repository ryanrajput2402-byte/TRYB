/*
# Enable Realtime on trip_members

`trip_members` was never added to the `supabase_realtime` publication, so
approving/rejecting a join request never reached the requesting user's client
in real time. Purely additive — no column, data, or RLS policy changes.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_members;
