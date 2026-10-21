import type { ComponentType } from "react";
import { SystemCover } from "~/modules/blog/demos/design-system-demos";
import { InkBeforeAfter } from "~/modules/blog/demos/ink-demos";
import CloudShader from "~/modules/blog/posts/cloud-shader";
import DesignSystem from "~/modules/blog/posts/design-system";
import DistressedInk from "~/modules/blog/posts/distressed-ink";
import GridSystems from "~/modules/blog/posts/grid-systems";

export const postBodies: Record<string, ComponentType> = {
  "cloud-shader": CloudShader,
  "design-system": DesignSystem,
  "distressed-ink": DistressedInk,
  "grid-systems": GridSystems,
};

export const postHeroes: Record<string, ComponentType> = {
  "design-system": SystemCover,
  "distressed-ink": InkBeforeAfter,
};
