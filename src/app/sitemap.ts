import type { MetadataRoute } from "next";
import { pages } from "~/data/pages";
import { env } from "~/env";

// The pages search engines should know about, see data/pages.ts
const sitemap = (): MetadataRoute.Sitemap =>
  Object.values(pages).map(({ path }) => ({
    url: new URL(path, env.NEXT_PUBLIC_URL).href,
  }));

export default sitemap;
