import * as v from "valibot";
import {
  dimension,
  link,
  longText,
  mediaPath,
  requiredText,
  shortText,
} from "~/modules/cms/schema/shared";
import { WALL_BACKGROUNDS } from "~/modules/content/types";

// Shared by the forms and their actions, so this file can't be "use server".
// Every output is also valid input: the form parses once, the action again

// One or two of: a side, center, or a percentage. It ends up in an inline
// style on the site, so nothing else gets through
const POSITION =
  /^$|^(?:(?:left|center|right|top|bottom|\d{1,3}(?:\.\d+)?%|0)(?:\s+(?!$)|$)){1,2}$/;

export const wallItemSchema = v.object({
  title: requiredText("Give the item a title."),
  // Empty for no tag
  tagId: v.string(),
  mediaType: v.picklist(["image", "video"]),
  media: v.pipe(
    v.string(),
    v.nonEmpty("Upload an image or video first."),
    mediaPath("Upload the media again."),
  ),
  width: dimension("Upload the media again."),
  height: dimension("Upload the media again."),
  background: v.picklist(WALL_BACKGROUNDS, "Pick a background."),
  bare: v.boolean(),
  position: v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(40, 'Use something like "left top" or "50% 20%".'),
    v.regex(POSITION, 'Use something like "left top" or "50% 20%".'),
  ),
  // Empty means no zoom, which is stored as null
  zoom: v.nullable(
    v.pipe(
      v.number("Zoom has to be a number."),
      v.finite("Zoom has to be a number."),
      v.minValue(1, "Zoom starts at 1, which is the media's own size."),
      v.maxValue(10, "Zoom stops at 10."),
    ),
  ),
  description: longText,
  linkLabel: shortText,
  linkHref: link,
});

export type WallItemValues = v.InferInput<typeof wallItemSchema>;
export type WallItemOutput = v.InferOutput<typeof wallItemSchema>;

export const wallTagSchema = v.object({
  label: requiredText("Give the tag a label."),
  // It ends up in inline styles on the site, so only a plain hex color
  color: v.pipe(
    v.string(),
    v.trim(),
    v.regex(/^#[0-9a-f]{6}$/i, "Use a hex color like #525252."),
  ),
  logo: v.nullable(mediaPath("Upload the logo again.")),
});

export type WallTagValues = v.InferInput<typeof wallTagSchema>;
