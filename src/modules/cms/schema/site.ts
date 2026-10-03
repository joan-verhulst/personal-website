import * as v from "valibot";
import {
  link,
  longText,
  mediaPath,
  requiredText,
  shortText,
} from "~/modules/cms/schema/shared";

// Shared by the forms and their actions, so this file can't be "use server".
// Every output is also valid input: the form parses once, the action again

export const aboutSchema = v.object({
  // A headline runs longer than a title, the current one is 160 characters
  headline: requiredText("Add a headline.", 300),
  intro: longText,
  image: v.nullable(mediaPath("Upload the photo again.")),
  currentlyName: shortText,
  currentlySince: shortText,
  currentlyBlurb: longText,
  currentlyUrl: link,
});

export type AboutValues = v.InferInput<typeof aboutSchema>;

export const contactSchema = v.object({
  instagram: link,
  linkedin: link,
  email: v.pipe(
    v.string(),
    v.trim(),
    // People paste the mailto: link as often as the address
    v.transform((value) => value.replace(/^mailto:/i, "")),
    v.check(
      (value) => !value || v.EMAIL_REGEX.test(value),
      "That doesn't look like an email address.",
    ),
  ),
});

export type ContactValues = v.InferInput<typeof contactSchema>;
