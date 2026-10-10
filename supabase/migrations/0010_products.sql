-- A third home list next to the experiments and highlights: the products
-- people can try, shown in the products modal and on the home widget that
-- took the contact widget's place. Run it once in the Supabase SQL editor (or
-- with `supabase db push`) after 0009_contact_cards.sql. It's safe to run
-- again.
--
-- Until the list has an item, the home page keeps the contact widget.
--
-- To undo it:
--
--   delete from public.wall_lists where id = 'products';
--   alter table public.wall_lists drop constraint wall_lists_id_check;
--   alter table public.wall_lists add constraint wall_lists_id_check
--     check (id in ('experiments', 'highlights'));

alter table public.wall_lists drop constraint if exists wall_lists_id_check;
alter table public.wall_lists add constraint wall_lists_id_check
  check (id in ('experiments', 'highlights', 'products'));

insert into public.wall_lists (id) values ('products') on conflict (id) do nothing;
