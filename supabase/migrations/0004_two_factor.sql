-- Makes the database ask for two-factor sign-in too. Run it once in the
-- Supabase SQL editor (or with `supabase db push`) after
-- 0003_cms_hardening.sql. It's safe to run again.
--
-- Run it AFTER you've set up your authenticator at /admin/two-factor and
-- signed in with a code once. That way you know the code step works before
-- the database starts to depend on it.
--
-- What it does: is_admin() now also wants a session that entered a code from
-- an authenticator app. Supabase marks such a session with "aal": "aal2" in
-- its token; a session with only a password has "aal1". So with a stolen
-- password alone, nothing can be written, not even by calling Supabase
-- directly and skipping the CMS.
--
-- One function is enough, because every write goes through it:
--   - the "Admins can write" policy on each content table (0001),
--   - the four policies on the media bucket (0001),
--   - save_order and delete_wall_item (0003), which run as the caller and so
--     fall under those same table policies,
--   - public.admins, which has row level security and no policy at all, so
--     the API can't touch it.
-- Reading content stays open to everyone, as before. If you ever add a
-- policy that doesn't call is_admin(), give it the same check:
--   (select auth.jwt() ->> 'aal') = 'aal2'
--
-- The CMS works without this file too: the proxy, the screens and the
-- actions already ask for the code. Until it has been run, only the database
-- itself still accepts a session with just a password. The Security page in
-- the CMS shows a warning for as long as that's the case: it looks for the
-- two_factor_enforced() function at the bottom of this file.
--
-- To undo it, run the original function from 0001_cms.sql again, and drop
-- the marker so the Security page shows its warning again:
--
--   drop function if exists public.two_factor_enforced();
--   notify pgrst, 'reload schema';
--
--   create or replace function public.is_admin()
--   returns boolean
--   language sql
--   stable
--   security definer
--   set search_path = ''
--   as $$
--     select exists (
--       select 1 from public.admins where user_id = (select auth.uid())
--     );
--   $$;

-- Same name, arguments and settings as in 0001, so the policies that call it
-- keep working without being touched
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    -- No token, or a token without the claim, is a plain no
    coalesce((select auth.jwt() ->> 'aal') = 'aal2', false)
    and exists (
      select 1 from public.admins where user_id = (select auth.uid())
    );
$$;

-- A marker for the CMS: the Security page calls it to see whether this file
-- has been run, and warns when the function isn't there. It checks nothing
-- itself, is_admin() above does the work
create or replace function public.two_factor_enforced()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

revoke execute on function public.two_factor_enforced() from public, anon;
grant execute on function public.two_factor_enforced() to authenticated;

-- Tells the API about the new function right away
notify pgrst, 'reload schema';
