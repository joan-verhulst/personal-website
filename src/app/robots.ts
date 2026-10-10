import type { MetadataRoute } from "next";
import { env } from "~/env";

// Everything public may be crawled. The admin isn't named: on the public
// host it's a 404, and its pages say noindex themselves, see admin/layout.tsx
const robots = (): MetadataRoute.Robots => ({
  rules: { userAgent: "*", allow: "/" },
  sitemap: new URL("/sitemap.xml", env.NEXT_PUBLIC_URL).href,
});

export default robots;
