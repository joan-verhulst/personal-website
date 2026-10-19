import type { MetadataRoute } from "next";
import { ownPages, pages } from "~/data/pages";
import { posts } from "~/data/posts";
import { env } from "~/env";

// The pages search engines should know about, see data/pages.ts, then the
// blog's posts
const sitemap = (): MetadataRoute.Sitemap =>
  [
    ...Object.values(pages).map(({ path }) => ({ path })),
    ...Object.values(ownPages).map(({ path }) => ({ path })),
    ...posts.map(({ slug, date }) => ({
      path: `${ownPages.blog.path}/${slug}`,
      lastModified: date,
    })),
  ].map(({ path, ...entry }) => ({
    url: new URL(path, env.NEXT_PUBLIC_URL).href,
    ...entry,
  }));

export default sitemap;
