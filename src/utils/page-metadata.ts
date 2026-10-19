import type { Metadata } from "next";
import { pages } from "~/data/pages";
import { getSections, sectionHint } from "~/data/sections";
import { siteData } from "~/data/site";
import type { Content, PageKey } from "~/modules/content/types";

// What every page shares with a link preview. A page that sets its own
// openGraph replaces the whole object, so the pages build on this one
export const openGraph = {
  type: "website",
  siteName: siteData.metadata.title,
  description: siteData.metadata.description,
  locale: siteData.metadata.locale,
} satisfies Metadata["openGraph"];

/**
 * What a page says under its title when nothing is written for it in the
 * CMS. Home uses the about headline, a section names itself and counts what
 * it holds.
 */
export const fallbackDescription = (key: PageKey, content: Content) => {
  if (key === "home") {
    return content.about.headline || siteData.metadata.description;
  }
  const { path, title } = pages[key];
  const section = getSections(content).find(({ href }) => href === path);
  const hint = section && sectionHint(section);
  const count = hint ? `: ${hint}` : "";
  return `${title} by ${siteData.owner.name}${count}.`;
};

/**
 * The same for a page described in code rather than in the CMS, like the
 * products or a blog post. A blog post's preview is an article.
 */
export const describedPageMetadata = ({
  path,
  title,
  description,
  isArticle = false,
}: {
  path: string;
  title: string;
  description: string;
  isArticle?: boolean;
}): Metadata => ({
  title,
  description,
  alternates: { canonical: path },
  openGraph: {
    ...openGraph,
    ...(isArticle && { type: "article" }),
    title: siteData.metadata.titleTemplate.replace("%s", title),
    description,
    url: path,
  },
});

/** A page's title, description, address and link preview. */
export const pageMetadata = (key: PageKey, content: Content): Metadata => {
  const { path, title } = pages[key];
  const description =
    content.descriptions[key] ?? fallbackDescription(key, content);
  const isHome = key === "home";

  return {
    // Home keeps the root layout's title, the sections fill its template
    ...(isHome ? {} : { title }),
    description,
    alternates: { canonical: path },
    openGraph: {
      ...openGraph,
      title: isHome
        ? title
        : siteData.metadata.titleTemplate.replace("%s", title),
      description,
      url: path,
    },
  };
};
