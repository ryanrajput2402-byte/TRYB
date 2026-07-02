/*
# Drop orphaned chat_messages table

`chat_messages` existed live in the database but was never captured in a local
migration and isn't referenced by any application code (the app uses `messages`,
extended in 20260702000000_chat_reactions_polls.sql, as the real chat table).
Confirmed empty (0 rows) before dropping.
*/

DROP TABLE IF EXISTS public.chat_messages CASCADE;
