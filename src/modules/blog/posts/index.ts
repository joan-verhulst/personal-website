import type { ComponentType } from "react";
import { InkBeforeAfter } from "~/modules/blog/demos/ink-demos";
import CloudShader from "~/modules/blog/posts/cloud-shader";
import DistressedInk from "~/modules/blog/posts/distressed-ink";

// Each post's writing and demos, by its slug in data/posts.ts
export const postBodies: Record<string, ComponentType> = {
  "cloud-shader": CloudShader,
  "distressed-ink": DistressedInk,
};

// At the top of a post in place of its cover, which still shows in the list
// and the home widget
export const postHeroes: Record<string, ComponentType> = {
  "distressed-ink": InkBeforeAfter,
};
