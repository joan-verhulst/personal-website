-- Adds the double row to the wall: two equal 4:3 halves. Run it once in the
-- Supabase SQL editor (or with `supabase db push`) after 0001_cms.sql.
--
-- Rows can also be saved half filled now. An empty slot is stored as an empty
-- string, never as null, so every row still has one entry per slot; the site
-- leaves a row out until all its slots are filled.

-- 0001 created the checks inline, so their names come from Postgres. Drop
-- every check on the table by looking them up, then add named replacements.
-- Safe to run again: the second run drops and re-adds the named ones.
do $$
declare
  check_name text;
begin
  for check_name in
    select conname
    from pg_constraint
    where conrelid = 'public.wall_blocks'::regclass
      and contype = 'c'
  loop
    execute format('alter table public.wall_blocks drop constraint %I', check_name);
  end loop;
end
$$;

alter table public.wall_blocks
  add constraint wall_blocks_layout_check
    check (layout in ('spiral', 'triple', 'double')),
  add constraint wall_blocks_items_check check (
    (
      (layout = 'spiral' and cardinality(items) = 4)
      or (layout = 'triple' and cardinality(items) = 3)
      or (layout = 'double' and cardinality(items) = 2)
    )
    -- '' marks an empty slot, so a null can only be a mistake
    and array_position(items, null) is null
  );
