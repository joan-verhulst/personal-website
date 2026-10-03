import * as v from "valibot";
import { dimension, mediaPath } from "~/modules/cms/schema/shared";

// Shared by the gallery forms and their actions, so this file can't be
// "use server". Every output is also valid input: the form parses once, the
// action again

export const galleryImageSchema = v.object({
  image: v.pipe(
    v.string(),
    v.nonEmpty("Upload an image first."),
    mediaPath("Upload the image again."),
  ),
  width: dimension("Upload the image again."),
  height: dimension("Upload the image again."),
  // Only photos store these; the actions drop them for artworks
  hue: v.optional(v.number()),
  chroma: v.optional(v.number()),
});

export const galleryDetailsSchema = v.object({
  title: v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty("Give it a title."),
    v.maxLength(200, "Keep the title under 200 characters."),
  ),
  // Optional, stored as null when it's left empty
  description: v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(2000, "Keep the description under 2000 characters."),
  ),
});

export const newGalleryItemSchema = v.object({
  ...galleryDetailsSchema.entries,
  ...galleryImageSchema.entries,
});

export type GalleryImage = v.InferOutput<typeof galleryImageSchema>;
export type GalleryDetails = v.InferOutput<typeof galleryDetailsSchema>;
export type NewGalleryItemValues = v.InferInput<typeof newGalleryItemSchema>;
