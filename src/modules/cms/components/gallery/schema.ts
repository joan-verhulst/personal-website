import * as v from "valibot";
import { dimension, mediaPath } from "~/modules/cms/schema/shared";

// Shared with the actions, so not "use server"

export const galleryImageSchema = v.object({
  image: v.pipe(
    v.string(),
    v.nonEmpty("Upload an image first."),
    mediaPath("Upload the image again."),
  ),
  width: dimension("Upload the image again."),
  height: dimension("Upload the image again."),
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
