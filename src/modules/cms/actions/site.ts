"use server";

import { aboutSchema, contactSchema } from "~/modules/cms/schema/site";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  type ActionResult,
  dbFailed,
  failed,
  isInFolder,
  orNull,
  parse,
  published,
  removeReplaced,
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

  const { data: before, error: readError } = await supabase
    .from("site")
    .select("about_image")
    .eq("id", 1)
    .maybeSingle();
  // The database's own message means nothing on the form, keep it for the logs
  if (readError) return dbFailed(readError, "Couldn't save the about page.");
  if (!before) return failed(NO_SITE_ROW);

  // A new photo comes from this form's upload button. The one that's there
  // may sit anywhere: the import put it at the top of the bucket
  if (
    about.image &&
    about.image !== before.about_image &&
    !isInFolder(about.image, "about")
  ) {
    return failed("Upload the photo again.");
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
  if (failure) return failure;

  await removeReplaced(supabase, before.about_image, about.image);
  return published();
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
