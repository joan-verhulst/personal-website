-- Content for the site and the CMS at /admin. Anyone can read, only admins
-- can write. Run once in the Supabase SQL editor.

-- ── Admins ────────────────────────────────────────────────────────────────────

-- Only users listed here can change content. See the README for adding yourself.
create table public.admins (
  user_id uuid primary key references auth.users on delete cascade
);

alter table public.admins enable row level security;

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins where user_id = (select auth.uid())
  );
$$;

-- ── Site ──────────────────────────────────────────────────────────────────────

-- A single row with the about modal and the contact links
create table public.site (
  id int primary key default 1 check (id = 1),
  about_headline text not null default '',
  about_intro text not null default '',
  -- Storage path in the media bucket
  about_image text,
  currently_name text,
  currently_since text,
  currently_blurb text,
  currently_url text,
  instagram_url text,
  linkedin_url text,
  email text
);

insert into public.site (id) values (1);

-- ── Photography ───────────────────────────────────────────────────────────────

create table public.photos (
  id text primary key,
  title text not null,
  description text,
  image text not null,
  width int not null,
  height int not null,
  -- Hue in degrees, and how colorful the photo is from 0 (black and white) up.
  -- Measured when the photo is uploaded.
  hue real not null default 0,
  chroma real not null default 0,
  sort_order int not null default 0,
  -- Shown on the home page widget
  is_cover boolean not null default false
);

-- ── Digital art ───────────────────────────────────────────────────────────────

create table public.artworks (
  id text primary key,
  title text not null,
  description text,
  image text not null,
  width int not null,
  height int not null,
  sort_order int not null default 0,
  -- Shown on the home page widget
  is_cover boolean not null default false
);

-- ── On rotation ───────────────────────────────────────────────────────────────

create table public.records (
  id text primary key,
  type text not null check (type in ('album', 'song')),
  title text not null,
  artist text not null,
  -- Square artwork
  cover text not null,
  -- The favorite song's Apple Music ID, and its name until the lookup arrives
  apple_id bigint not null,
  favorite_title text not null,
  sort_order int not null default 0
);

-- ── UI/UX ─────────────────────────────────────────────────────────────────────

create table public.wall_tags (
  id text primary key,
  label text not null,
  color text not null,
  -- Single color SVG, tinted to match the tag text
  logo text
);

create table public.wall_items (
  id text primary key,
  title text not null,
  tag_id text not null references public.wall_tags on update cascade,
  media_type text not null check (media_type in ('image', 'video')),
  media text not null,
  width int not null,
  height int not null,
  background text not null check (background in (
    'forest', 'lime', 'mint', 'ocean', 'sky', 'indigo',
    'midnight', 'graphite', 'violet', 'sunset', 'dusk', 'neutral'
  )),
  bare boolean not null default false,
  object_position text,
  zoom real,
  description text,
  link_label text,
  link_href text
);

-- Rows of the wall. A spiral holds four items, a triple three, big to small.
create table public.wall_blocks (
  id uuid primary key default gen_random_uuid(),
  layout text not null check (layout in ('spiral', 'triple')),
  items text[] not null check (
    (layout = 'spiral' and cardinality(items) = 4)
    or (layout = 'triple' and cardinality(items) = 3)
  ),
  sort_order int not null default 0
);

-- Ordered picks from the wall items: the experiments modal, and the two
-- highlights on the home page widget
create table public.wall_lists (
  id text primary key check (id in ('experiments', 'highlights')),
  items text[] not null default '{}'
);

insert into public.wall_lists (id) values ('experiments'), ('highlights');

-- ── Access ────────────────────────────────────────────────────────────────────

do $$
declare
  content_table text;
begin
  foreach content_table in array array[
    'site', 'photos', 'artworks', 'records',
    'wall_tags', 'wall_items', 'wall_blocks', 'wall_lists'
  ]
  loop
    execute format('alter table public.%I enable row level security', content_table);
    execute format('grant select on public.%I to anon, authenticated', content_table);
    execute format('grant insert, update, delete on public.%I to authenticated', content_table);
    execute format(
      'create policy "Anyone can read" on public.%I for select using (true)',
      content_table
    );
    execute format(
      'create policy "Admins can write" on public.%I for all to authenticated
        using ((select public.is_admin())) with check ((select public.is_admin()))',
      content_table
    );
  end loop;
end
$$;

-- ── Media ─────────────────────────────────────────────────────────────────────

-- Public bucket: files are read straight from their URL
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

-- Deleting needs read access through the API as well
create policy "Admins can list media" on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins can upload media" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins can update media" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));

create policy "Admins can delete media" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (select public.is_admin()));
