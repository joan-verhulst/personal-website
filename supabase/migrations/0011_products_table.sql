-- Products get a table of their own, apart from the UI/UX items: a wall item
-- says what a piece of work shows, a product says what it is and how to try
-- it. Run it once in the Supabase SQL editor (or with `supabase db push`)
-- after 0010_products.sql. It's safe to run again.
--
-- Products already picked in 0010's list are copied over, named after their
-- item's tag (the brand) and with its logo, and that list goes away again.
-- The UI/UX items themselves stay as they are.
--
-- To undo it:
--
--   drop table public.products;
--
-- and run 0003_cms_hardening.sql again for the old save_order.

create table if not exists public.products (
  id text primary key,
  name text not null,
  -- Single color SVG, tinted like the text next to it. Null without one, or
  -- once its file is deleted from Media
  logo text,
  -- What it is and why to try it
  description text,
  link_label text,
  link_href text,
  media_type text not null check (media_type in ('image', 'video')),
  -- Null once its file is deleted from Media: the product stays off the site
  -- until another one is picked
  media text,
  width int not null,
  height int not null,
  background text not null check (background in (
    'forest', 'lime', 'mint', 'ocean', 'sky', 'indigo',
    'midnight', 'graphite', 'violet', 'sunset', 'dusk', 'neutral'
  )),
  bare boolean not null default false,
  sort_order int not null default 0
);

-- ── Access, like the other content tables in 0001_cms.sql ─────────────────────

alter table public.products enable row level security;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

drop policy if exists "Anyone can read" on public.products;
create policy "Anyone can read" on public.products for select using (true);

drop policy if exists "Admins can write" on public.products;
create policy "Admins can write" on public.products for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ── Reordering, now with products ─────────────────────────────────────────────

-- As in 0003_cms_hardening.sql, with products added to the tables it takes
create or replace function public.save_order(table_name text, ids text[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if table_name not in ('photos', 'artworks', 'records', 'products') then
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

-- ── The list from 0010 ────────────────────────────────────────────────────────

do $$
begin
  if exists (select 1 from public.wall_lists where id = 'products') then
    insert into public.products (
      id, name, logo, description, link_label, link_href,
      media_type, media, width, height, background, bare, sort_order
    )
    select
      item.id, coalesce(tag.label, item.title), tag.logo, item.description,
      item.link_label, item.link_href, item.media_type, item.media,
      item.width, item.height, item.background, item.bare, picked.place - 1
    from public.wall_lists list
    cross join lateral unnest(list.items) with ordinality as picked(item_id, place)
    join public.wall_items item on item.id = picked.item_id
    left join public.wall_tags tag on tag.id = item.tag_id
    where list.id = 'products'
    on conflict (id) do nothing;

    delete from public.wall_lists where id = 'products';
  end if;
end
$$;

alter table public.wall_lists drop constraint if exists wall_lists_id_check;
alter table public.wall_lists add constraint wall_lists_id_check
  check (id in ('experiments', 'highlights'));

-- Tells the API about the new table right away
notify pgrst, 'reload schema';
