import type { ImageLoaderProps } from "next/image";
import { env } from "~/env";
import {
  hasSizes,
  IMAGE_WIDTHS,
  sizedPath,
} from "~/modules/media/utils/media-types";

// Every image and video the CMS manages is in the media bucket on Cloudflare
// R2, served from a domain of its own. A trailing slash in the variable is
// forgiven
const PUBLIC_PREFIX = `${env.NEXT_PUBLIC_MEDIA_URL.replace(/\/+$/, "")}/`;

/** The public URL of a file in the media bucket. The database stores paths. */
export const mediaUrl = (path: string) =>
  `${PUBLIC_PREFIX}${path.split("/").map(encodeURIComponent).join("/")}`;

export const optionalMediaUrl = (path: string | null | undefined) =>
  path ? mediaUrl(path) : undefined;

/** Whether a URL is a file from the media bucket. */
export const isMediaUrl = (src: string | undefined): src is string =>
  Boolean(src?.startsWith(PUBLIC_PREFIX));

/**
 * next/image's loader for a file from the bucket: the stored width that
 * fits, straight from R2, see IMAGE_WIDTHS. Wider than the widest, the
 * widest it is.
 */
const mediaLoader = ({ src, width }: ImageLoaderProps) =>
  sizedPath(
    src,
    IMAGE_WIDTHS.find((size) => size >= width) ??
      IMAGE_WIDTHS[IMAGE_WIDTHS.length - 1],
  );

/**
 * What an <Image> of this URL needs to load straight from R2: the loader that
 * picks a stored width, or unoptimized for a file without sizes, like an SVG.
 * Anything not from the bucket is left to next/image as it is.
 *
 * @example
 * <Image src={print.image} {...mediaImageProps(print.image)} fill sizes="300px" alt="" />
 */
export const mediaImageProps = (src: string | undefined) => {
  if (!isMediaUrl(src)) return {};
  return hasSizes(src) ? { loader: mediaLoader } : { unoptimized: true };
};

/**
 * The src of a file in the bucket and what <Image> needs to load it from R2,
 * for code that has the file's path, like the CMS.
 *
 * @example
 * <Image {...mediaImage(row.cover)} alt="" fill sizes="240px" />
 */
export const mediaImage = (path: string) => {
  const src = mediaUrl(path);
  return { src, ...mediaImageProps(src) };
};
