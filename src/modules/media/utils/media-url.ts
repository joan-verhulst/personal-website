import { env } from "~/env";
import { displayPath, hasDisplayCopy } from "~/modules/media/utils/media-types";

// Every image and video the CMS manages is in the media bucket on Cloudflare
// R2, served from a domain of its own. A trailing slash in the variable is
// forgiven
const PUBLIC_PREFIX = `${env.NEXT_PUBLIC_MEDIA_URL.replace(/\/+$/, "")}/`;

/** The public URL of a file in the media bucket. The database stores paths. */
export const mediaUrl = (path: string) =>
  `${PUBLIC_PREFIX}${path.split("/").map(encodeURIComponent).join("/")}`;

export const optionalMediaUrl = (path: string | null | undefined) =>
  path ? mediaUrl(path) : undefined;

/**
 * The URL of a file's display copy: the size the site shows it at, see
 * DISPLAY_SIZE. A file without one, like an SVG or a video, is its own.
 */
export const displayUrl = (path: string) =>
  mediaUrl(hasDisplayCopy(path) ? displayPath(path) : path);

export const optionalDisplayUrl = (path: string | null | undefined) =>
  path ? displayUrl(path) : undefined;

/**
 * Whether a URL is a file from the media bucket. Those come in the size the
 * site needs, so next/image passes them on with unoptimized instead of
 * having Vercel resize them.
 */
export const isMediaUrl = (src: string | undefined) =>
  Boolean(src?.startsWith(PUBLIC_PREFIX));
