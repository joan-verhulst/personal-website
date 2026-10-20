import type { Metadata } from "next";
import { pages } from "~/data/pages";
import { getSections, sectionHint } from "~/data/sections";
import { siteData } from "~/data/site";
import type { Content, PageKey } from "~/modules/content/types";

export const openGraph = {
  type: "website",
  siteName: siteData.metadata.title,
  description: siteData.metadata.description,
  locale: siteData.metadata.locale,
} satisfies Metadata["openGraph"];

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

export const pageMetadata = (key: PageKey, content: Content): Metadata => {
  const { path, title } = pages[key];
  const description =
    content.descriptions[key] ?? fallbackDescription(key, content);
  const isHome = key === "home";

  return {
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
