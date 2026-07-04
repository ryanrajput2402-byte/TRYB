/*
# Public approved trip_members visibility

The existing SELECT policy on trip_members only allows a user to see rows
where they're the organizer, an approved member, or the row is their own.
That's correct for privacy (pending requests, private trips), but it means
the home feed's "going" counts, member faces, urgency ordering, and the
"someone just joined" realtime toast all silently read as empty for any
trip the viewer hasn't joined — which is the entire point of a discovery
feed. Confirmed directly: an unrelated authenticated user saw 0 of 11 real
trip_members rows before this policy.

Purely additive: the existing policy is untouched. This only adds a second
allowed read path — approved rows on public trips, visible to any signed-in
user. Pending join requests stay private; private-trip membership stays
fully hidden.
*/

CREATE POLICY "Public approved memberships are visible to any authenticated user"
ON public.trip_members
FOR SELECT TO authenticated
USING (
  status = 'approved'
  AND EXISTS (SELECT 1 FROM public.trips WHERE trips.id = trip_members.trip_id AND trips.privacy = 'public')
);
