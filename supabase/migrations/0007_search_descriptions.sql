-- What search engines and link previews show under each page's title. Run it
-- once in the Supabase SQL editor (or with `supabase db push`) after
-- 0006_media_library.sql. It's safe to run again.
--
-- Empty, a page falls back to a line of its own, see utils/page-metadata.ts.
-- The home page uses the about headline.
--
-- To undo it:
--
--   alter table public.site
--     drop column search_home,
--     drop column search_ui_ux,
--     drop column search_digital_art,
--     drop column search_photography;

alter table public.site
  add column if not exists search_home text,
  add column if not exists search_ui_ux text,
  add column if not exists search_digital_art text,
  add column if not exists search_photography text;
