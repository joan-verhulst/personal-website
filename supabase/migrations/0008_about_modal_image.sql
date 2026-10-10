-- A photo of its own for the about modal, apart from the one on the About
-- widget. Run it once in the Supabase SQL editor (or with `supabase db push`)
-- after 0007_search_descriptions.sql. It's safe to run again.
--
-- The modal starts out with the widget's photo, so nothing changes on the
-- site until another one is picked. Only the first run copies it: a modal
-- photo that was removed since stays removed.
--
-- To undo it:
--
--   alter table public.site drop column about_modal_image;

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'site'
      and column_name = 'about_modal_image'
  ) then
    -- Storage path in the media bucket
    alter table public.site add column about_modal_image text;
    update public.site set about_modal_image = about_image;
  end if;
end $$;
