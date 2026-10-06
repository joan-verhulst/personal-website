import { env } from "~/env";

// Every image and video the CMS manages is in the media bucket on Cloudflare
// R2, served from a domain of its own. A trailing slash in the variable is
// forgiven
const PUBLIC_PREFIX = `${env.NEXT_PUBLIC_MEDIA_URL.replace(/\/+$/, "")}/`;

/** The public URL of a file in the media bucket. The database stores paths. */
export const mediaUrl = (path: string) =>
  `${PUBLIC_PREFIX}${path.split("/").map(encodeURIComponent).join("/")}`;

export const optionalMediaUrl = (path: string | null | undefined) =>
  path ? mediaUrl(path) : undefined;
