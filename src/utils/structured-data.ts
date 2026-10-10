import { siteData } from "~/data/site";
import type { Content } from "~/modules/content/types";

/**
 * Who the site is by, for search engines: schema.org's Person and WebSite,
 * from what the about modal and contact links already say.
 */
export const structuredData = (content: Content, url: string) => {
  const { about, contact } = content;
  const person = {
    "@type": "Person",
    "@id": `${url}/#person`,
    name: siteData.owner.name,
    url,
    description: about.headline || undefined,
    image: about.image,
    sameAs: [contact.instagram, contact.linkedin].filter(Boolean),
    worksFor: about.currently && {
      "@type": "Organization",
      name: about.currently.name,
      url: about.currently.url,
    },
  };

  return {
    "@context": "https://schema.org",
    "@graph": [
      person,
      {
        "@type": "WebSite",
        "@id": `${url}/#website`,
        name: siteData.metadata.title,
        url,
        author: { "@id": person["@id"] },
      },
    ],
  };
};

/**
 * JSON for a <script> in the page. A "<" in the CMS text could close the
 * script early, so it's escaped the way JSON allows.
 */
export const toJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\u003c");
