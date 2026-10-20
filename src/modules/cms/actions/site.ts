"use server";

import {
  aboutSchema,
  contactSchema,
  searchSchema,
} from "~/modules/cms/schema/site";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  type ActionResult,
  failed,
  missingMedia,
  orNull,
  parse,
  published,
  updateOne,
} from "~/modules/cms/utils/shared";

const NO_SITE_ROW =
  "The site's row is missing from the database. Run supabase/migrations/0001_cms.sql first.";

export async function saveAbout(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsed = parse(aboutSchema, input);
  if (!parsed.success) return parsed.failure;
  const about = parsed.output;

  for (const image of [about.image, about.modalImage]) {
    if (!image) continue;
    const missing = await missingMedia(image);
    if (missing) return failed(missing);
  }

  const failure = await updateOne(
    supabase,
    "site",
    1,
    {
      about_headline: about.headline,
      about_intro: about.intro,
      about_image: about.image,
      about_modal_image: about.modalImage,
      currently_name: orNull(about.currentlyName),
      currently_since: orNull(about.currentlySince),
      currently_blurb: orNull(about.currentlyBlurb),
      currently_url: orNull(about.currentlyUrl),
    },
    "Couldn't save the about page. Run supabase/migrations/0008_about_modal_image.sql if you haven't yet.",
    NO_SITE_ROW,
  );
  return failure ?? published();
}

export async function saveContact(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parse(contactSchema, input);
  if (!parsed.success) return parsed.failure;
  const contact = parsed.output;

  const failure = await updateOne(
    admin.supabase,
    "site",
    1,
    {
      instagram_url: orNull(contact.instagram),
      linkedin_url: orNull(contact.linkedin),
      email: orNull(contact.email),
      card_ui_ux_title: orNull(contact.uiUxTitle),
      card_ui_ux_text: orNull(contact.uiUxText),
      card_ui_ux_button: orNull(contact.uiUxButton),
      card_ui_ux_url: orNull(contact.uiUxUrl),
      card_photography_title: orNull(contact.photographyTitle),
      card_photography_text: orNull(contact.photographyText),
      card_photography_button: orNull(contact.photographyButton),
      card_digital_art_title: orNull(contact.digitalArtTitle),
      card_digital_art_text: orNull(contact.digitalArtText),
      card_digital_art_button: orNull(contact.digitalArtButton),
    },
    "Couldn't save the contact details. Run supabase/migrations/0009_contact_cards.sql if you haven't yet.",
    NO_SITE_ROW,
  );
  return failure ?? published();
}

export async function saveSearch(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parse(searchSchema, input);
  if (!parsed.success) return parsed.failure;
  const search = parsed.output;

  const failure = await updateOne(
    admin.supabase,
    "site",
    1,
    {
      search_home: orNull(search.home),
      search_ui_ux: orNull(search.uiUx),
      search_digital_art: orNull(search.digitalArt),
      search_photography: orNull(search.photography),
    },
    "Couldn't save the search descriptions. Run supabase/migrations/0007_search_descriptions.sql if you haven't yet.",
    NO_SITE_ROW,
  );
  return failure ?? published();
}

export async function refreshSite(): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  return published();
}
