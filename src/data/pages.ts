import { siteData } from "~/data/site";
import type { PageKey } from "~/modules/content/types";

/** The pages search engines index, in the order the sitemap lists them. */
export const pages: Record<PageKey, { path: string; title: string }> = {
  home: { path: "/", title: siteData.metadata.title },
  uiUx: { path: "/ui-ux", title: "UI/UX" },
  digitalArt: { path: "/digital-art", title: "Digital Art" },
  photography: { path: "/photography", title: "Photography" },
};
