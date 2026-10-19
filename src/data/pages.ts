import { siteData } from "~/data/site";
import type { PageKey } from "~/modules/content/types";

/** The pages whose search descriptions the CMS edits, in the order the sitemap lists them. */
export const pages: Record<PageKey, { path: string; title: string }> = {
  home: { path: "/", title: siteData.metadata.title },
  uiUx: { path: "/ui-ux", title: "UI/UX" },
  digitalArt: { path: "/digital-art", title: "Digital Art" },
  photography: { path: "/photography", title: "Photography" },
};

// Sections whose words live in the code rather than in the CMS: the about
// page is written like a post around its CMS headline, the products page is
// described by its widget, the blog's posts are written by hand
export const ownPages = {
  about: {
    path: "/about",
    title: "About",
    description:
      "About Joan Verhulst: the room, what's on the turntable and the cameras, film and guitars in it.",
  },
  products: {
    path: "/products",
    title: "Products",
    description: "Things Joan Verhulst has made that you can try right now.",
  },
  blog: {
    path: "/blog",
    title: "Blog",
    description:
      "Interactive write-ups by Joan Verhulst on the shaders and details behind this site.",
  },
};

/** The pages that open over the home screen. */
export type SectionKey = Exclude<PageKey, "home"> | keyof typeof ownPages;

const SECTION_PATHS: Record<SectionKey, string> = {
  uiUx: pages.uiUx.path,
  digitalArt: pages.digitalArt.path,
  photography: pages.photography.path,
  products: ownPages.products.path,
  blog: ownPages.blog.path,
  about: ownPages.about.path,
};

/** The section at a path, if it's one. A blog post isn't the blog itself. */
export const sectionAt = (pathname: string) =>
  (Object.keys(SECTION_PATHS) as SectionKey[]).find(
    (key) => SECTION_PATHS[key] === pathname,
  );

/** A link's path without the part of the page it points at, like "/about#gear". */
export const pathOf = (href: string) => href.split("#")[0];
