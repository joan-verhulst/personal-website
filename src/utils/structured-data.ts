import { siteData } from "~/data/site";
import type { Content } from "~/modules/content/types";

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

export const toJsonLd = (data: unknown) =>
  JSON.stringify(data).replace(/</g, "\u003c");
