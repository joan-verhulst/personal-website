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

// Shared by the product forms and their actions, so this file can't be
// "use server". Every output is also valid input: the form parses once, the
// action again

export const productSchema = v.object({
  name: requiredText("Give the product a name."),
  // Null for no logo
  logo: v.nullable(mediaPath("Upload the logo again.")),
  description: longText,
  // Empty says "Try" and the name on the site
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
