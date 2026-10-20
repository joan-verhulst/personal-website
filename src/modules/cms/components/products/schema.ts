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

// Shared with the actions, so not "use server"

export const productSchema = v.object({
  name: requiredText("Give the product a name."),
  logo: v.nullable(mediaPath("Upload the logo again.")),
  description: longText,
  linkLabel: shortText,
  linkHref: link,
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
});

export type ProductValues = v.InferInput<typeof productSchema>;
export type ProductOutput = v.InferOutput<typeof productSchema>;
