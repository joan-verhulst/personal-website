"use server";

import { aboutSchema, contactSchema } from "~/modules/cms/schema/site";
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

// 0001_cms.sql makes the one row these actions save to
const NO_SITE_ROW =
  "The site's row is missing from the database. Run supabase/migrations/0001_cms.sql first.";

export async function saveAbout(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsed = parse(aboutSchema, input);
  if (!parsed.success) return parsed.failure;
  const about = parsed.output;

  // Uploaded here or picked from Media, the photo has to be in the bucket
  if (about.image) {
    const missing = await missingMedia(about.image);
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
      currently_name: orNull(about.currentlyName),
      currently_since: orNull(about.currentlySince),
      currently_blurb: orNull(about.currentlyBlurb),
      currently_url: orNull(about.currentlyUrl),
    },
    "Couldn't save the about page.",
    NO_SITE_ROW,
  );
  // A photo that was replaced or removed stays in Media
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
    },
    "Couldn't save the contact details.",
    NO_SITE_ROW,
  );
  return failure ?? published();
}

/**
 * Clears the site's cache without changing anything, for edits made outside
 * the CMS, like in the Supabase dashboard or by the import script.
 */
export async function refreshSite(): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  return published();
}
