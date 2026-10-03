import * as v from "valibot";
import { mediaPath, requiredText, shortText } from "~/modules/cms/schema/shared";

// Shared by the record forms and their actions, so this file can't be
// "use server". Every output is also valid input: the form parses once, the
// action again

export const recordSchema = v.object({
  type: v.picklist(["album", "song"], "Pick album or song."),
  title: requiredText("Give the record a title."),
  artist: requiredText("Add the artist."),
  // The turntable plays this song's preview, so a record can't do without it
  appleId: v.pipe(
    v.number("Add the Apple Music song ID."),
    v.integer("Use the numbers of the song ID only."),
    v.minValue(1, "Add the Apple Music song ID."),
  ),
  favoriteTitle: shortText,
});

export type RecordValues = v.InferInput<typeof recordSchema>;

/** A path in the media bucket, as the upload button hands it over. */
export const coverSchema = mediaPath("Upload the cover again.");

/**
 * Turns typed or pasted text into an Apple Music song ID. A pasted song link
 * carries it in ?i=, otherwise only the digits count.
 */
export const toAppleId = (value: unknown) => {
  const text = String(value ?? "");
  const digits = text.match(/[?&]i=(\d+)/)?.[1] ?? text.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
};
