import type { MetadataRoute } from "next";
import { env } from "~/env";

const robots = (): MetadataRoute.Robots => ({
  rules: {
    userAgent: "*",
    allow: "/",
    // The record covers are other people's artwork: they shouldn't stand in
    // for a page in search results
    disallow: "/_next/image?url=*on-rotation",
  },
  sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_URL).href,
});

export default robots;
