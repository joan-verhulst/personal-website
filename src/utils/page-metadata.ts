import type { Metadata } from "next";
import { siteData } from "~/data/site";

// What every page shares with a link preview. A page that sets its own
// openGraph replaces the whole object, so the sections build on this one
export const openGraph = {
  type: "website",
  siteName: siteData.metadata.title,
  description: siteData.metadata.description,
  locale: siteData.metadata.locale,
} satisfies Metadata["openGraph"];

/** A section's title, in the tab and in its link preview. */
export const sectionMetadata = (title: string, path: string): Metadata => ({
  title,
  openGraph: {
    ...openGraph,
    title: siteData.metadata.titleTemplate.replace("%s", title),
    url: path,
  },
});
