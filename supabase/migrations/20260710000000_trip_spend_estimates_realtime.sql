/*
# Enable Realtime on trip_spend_estimates

`trip_spend_estimates` was never added to the `supabase_realtime`
publication (unlike every other table GroupChat's realtime channel
subscribes to). Because that channel bundles postgres_changes listeners
for messages, message_reactions, polls, poll_options, poll_votes,
expenses, and trip_spend_estimates into a single subscription, Supabase
rejected the *entire combined channel* over the missing table — silently
breaking realtime delivery for messages, reactions, polls, and expenses
too, not just spend estimates. Confirmed directly: with this table
included in the channel, a plain message INSERT was never delivered even
though the client reported "SUBSCRIBED"; removing only this one handler
restored delivery immediately.

Same root cause and fix shape as 20260702020000_trip_members_realtime.sql.
Purely additive — no column, data, or RLS policy changes.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_spend_estimates;
