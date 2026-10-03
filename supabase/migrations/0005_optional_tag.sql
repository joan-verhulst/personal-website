-- Makes the tag on a UI/UX item optional. Run it once in the Supabase SQL
-- editor (or with `supabase db push`) after 0004_two_factor.sql. It's safe
-- to run again.
--
-- An item without a tag shows only its title on the wall, in its modal and
-- in the experiments list. A tag that is set must still exist: the foreign
-- key to wall_tags stays.
--
-- To undo it, give every untagged item a tag first, then run:
--
--   alter table public.wall_items alter column tag_id set not null;

alter table public.wall_items alter column tag_id drop not null;
