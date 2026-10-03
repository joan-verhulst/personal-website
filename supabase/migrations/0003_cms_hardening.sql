-- Makes three CMS saves safer. Run it once in the Supabase SQL editor (or with
-- `supabase db push`) after 0002_wall_double.sql. It's safe to run again.
--
--   1. save_order: reordering photos, artworks or records becomes one
--      statement, so an order is saved whole or not at all.
--   2. delete_wall_item: deleting a UI/UX item takes it off the wall and out
--      of the lists in the same transaction as the delete itself.
--   3. The media bucket gets a size limit and a list of file types, so a
--      wrong or huge file is refused by storage and not only by the browser.
--
-- The CMS works without this file too: until it has been run, reordering and
-- deleting fall back to several separate requests, and only the upload button
-- checks a file's type and size.

-- ── Reordering ────────────────────────────────────────────────────────────────

-- Gives every id its place in the list as sort order. Ids that no longer
-- exist are skipped. It runs as the caller, so row level security still
-- decides who may write.
create or replace function public.save_order(table_name text, ids text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if table_name not in ('photos', 'artworks', 'records') then
    raise exception 'Unknown table';
  end if;

  execute format(
    'update public.%I as t
        set sort_order = o.ord - 1
       from unnest($1) with ordinality as o(id, ord)
      where t.id = o.id',
    table_name
  ) using ids;
end
$$;

revoke execute on function public.save_order(text, text[]) from public, anon;
grant execute on function public.save_order(text, text[]) to authenticated;

-- ── Deleting an item ──────────────────────────────────────────────────────────

-- Empties the item's slots on the wall ('' is an empty slot, see 0002), takes
-- it out of the lists and deletes it. Returns the path of its media, so the
-- CMS can remove the file, or null when there was no such item. It runs as the
-- caller too.
create or replace function public.delete_wall_item(item_id text)
returns text
language sql
security invoker
set search_path = ''
as $$
  update public.wall_blocks
     set items = array_replace(items, item_id, '')
   where items @> array[item_id];

  update public.wall_lists
     set items = array_remove(items, item_id)
   where items @> array[item_id];

  delete from public.wall_items where id = item_id returning media;
$$;

revoke execute on function public.delete_wall_item(text) from public, anon;
grant execute on function public.delete_wall_item(text) to authenticated;

-- ── Media ─────────────────────────────────────────────────────────────────────

-- The same list and limit the upload button checks, see
-- src/modules/cms/utils/upload-media.ts. 40 MB leaves room for the largest
-- video on the wall (27 MB) and stays under Supabase's own 50 MB default.
update storage.buckets
   set file_size_limit = 41943040,
       allowed_mime_types = array[
         'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
         'image/svg+xml', 'video/mp4', 'video/webm'
       ]
 where id = 'media';

-- Tells the API about the new functions right away
notify pgrst, 'reload schema';
