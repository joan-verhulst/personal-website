import { env } from "~/env";

// Public bucket holding every image and video the CMS manages
export const MEDIA_BUCKET = "media";

const PUBLIC_PREFIX = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/`;

/** The public URL of a file in the media bucket. The database stores paths. */
export const mediaUrl = (path: string) =>
  `${PUBLIC_PREFIX}${path.split("/").map(encodeURIComponent).join("/")}`;

export const optionalMediaUrl = (path: string | null | undefined) =>
  path ? mediaUrl(path) : undefined;
