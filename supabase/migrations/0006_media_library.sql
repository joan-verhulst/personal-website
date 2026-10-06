-- The media library. Run it once in the Supabase SQL editor (or with
-- `supabase db push`) after 0005_optional_tag.sql. It's safe to run again.
--
-- Files live in the media bucket on Cloudflare R2. This table keeps what the
-- CMS knows about each one: the name it was uploaded with, and the size and
-- color it measured then. Picking a file from Media fills a form with these,
-- like an upload does. Only admins read or write it; the site never does.
--
-- A file can also be deleted from the Media page while something shows it.
-- The photo, artwork, record or item stays, without its file, and the site
-- leaves it out until another file is picked. So those columns allow null.
--
-- To undo it, give every row its file back first, then run:
--
--   alter table public.photos alter column image set not null;
--   alter table public.artworks alter column image set not null;
--   alter table public.records alter column cover set not null;
--   alter table public.wall_items alter column media set not null;
--   drop table public.media;

create table if not exists public.media (
  -- The file's path in the bucket, like "library/0k3j...m2.jpg"
  path text primary key,
  -- The name it was uploaded with, without its extension. The bucket names
  -- files at random, so this is what the CMS shows
  name text not null default '',
  kind text not null check (kind in ('image', 'video')),
  -- As shown: an SVG gets a size made up from its viewBox
  width int not null default 0,
  height int not null default 0,
  -- Hue in degrees, and how colorful the image is from 0 up, like photos
  hue real not null default 0,
  chroma real not null default 0,
  created_at timestamptz not null default now()
);

alter table public.media enable row level security;

revoke all on public.media from anon;
grant select, insert, update, delete on public.media to authenticated;

drop policy if exists "Admins can read and write" on public.media;
create policy "Admins can read and write" on public.media
  for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.photos alter column image drop not null;
alter table public.artworks alter column image drop not null;
alter table public.records alter column cover drop not null;
alter table public.wall_items alter column media drop not null;
