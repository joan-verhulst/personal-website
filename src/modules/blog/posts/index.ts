import type { ComponentType } from "react";
import { InkBeforeAfter } from "~/modules/blog/demos/ink-demos";
import CloudShader from "~/modules/blog/posts/cloud-shader";
import DistressedInk from "~/modules/blog/posts/distressed-ink";

export const postBodies: Record<string, ComponentType> = {
  "cloud-shader": CloudShader,
  "distressed-ink": DistressedInk,
};

export const postHeroes: Record<string, ComponentType> = {
  "distressed-ink": InkBeforeAfter,
};
