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
  modalImage: v.nullable(mediaPath("Upload the photo again.")),
  currentlyName: shortText,
  currentlySince: shortText,
  currentlyBlurb: longText,
  currentlyUrl: link,
});

export type AboutValues = v.InferInput<typeof aboutSchema>;

// A card's lines. Empty, the site uses a line of its own, see
// data/contact-cards.ts. Short, since a card is small and its button smaller
const cardLine = (max: number) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(max, `Keep it under ${max} characters.`),
  );
const cardTitle = cardLine(80);
const cardText = cardLine(240);
const cardButton = cardLine(40);

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
  uiUxTitle: cardTitle,
  uiUxText: cardText,
  uiUxButton: cardButton,
  uiUxUrl: link,
  photographyTitle: cardTitle,
  photographyText: cardText,
  photographyButton: cardButton,
  digitalArtTitle: cardTitle,
  digitalArtText: cardText,
  digitalArtButton: cardButton,
});

export type ContactValues = v.InferInput<typeof contactSchema>;

// Search results cut a description off at about 155 characters, link
// previews a little sooner. Longer than this is a paragraph, not a snippet
const description = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(300, "Keep it under 300 characters."),
);

export const searchSchema = v.object({
  home: description,
  uiUx: description,
  digitalArt: description,
  photography: description,
});

export type SearchValues = v.InferInput<typeof searchSchema>;
