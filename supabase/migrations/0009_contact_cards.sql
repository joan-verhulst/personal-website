-- The three cards in the contact modal, one per section, which also show as a
-- banner in that section's footer. Run it once in the Supabase SQL editor (or
-- with `supabase db push`) after 0008_about_modal_image.sql. It's safe to run
-- again.
--
-- Empty, a card falls back to a line of its own, see data/contact-cards.ts.
-- The UI/UX card links out to where projects start, the other two write an
-- email to the address on the contact page.
--
-- To undo it:
--
--   alter table public.site
--     drop column card_ui_ux_title,
--     drop column card_ui_ux_text,
--     drop column card_ui_ux_button,
--     drop column card_ui_ux_url,
--     drop column card_photography_title,
--     drop column card_photography_text,
--     drop column card_photography_button,
--     drop column card_digital_art_title,
--     drop column card_digital_art_text,
--     drop column card_digital_art_button;

alter table public.site
  add column if not exists card_ui_ux_title text,
  add column if not exists card_ui_ux_text text,
  add column if not exists card_ui_ux_button text,
  add column if not exists card_ui_ux_url text,
  add column if not exists card_photography_title text,
  add column if not exists card_photography_text text,
  add column if not exists card_photography_button text,
  add column if not exists card_digital_art_title text,
  add column if not exists card_digital_art_text text,
  add column if not exists card_digital_art_button text;
