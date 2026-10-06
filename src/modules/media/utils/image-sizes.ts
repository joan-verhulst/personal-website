import sharp from "sharp";
// biome-ignore lint/style/noRestrictedImports: the import script runs this on Node, which can't resolve ~/
import { IMAGE_WIDTHS, hasSizes, sizedPath } from "./media-types.ts";
// biome-ignore lint/style/noRestrictedImports: the import script runs this on Node, which can't resolve ~/
import { getMedia, putMedia } from "./storage.ts";

/**
 * Makes a file's sized copies and stores them next to it: WebP at each of
 * IMAGE_WIDTHS, turned upright, never wider than the file itself. Pass the
 * bytes when they're at hand, otherwise they're read from the bucket. A file
 * without sizes, like an SVG, needs nothing and succeeds right away.
 */
export const makeImageSizes = async (
  path: string,
  original?: ArrayBuffer | Buffer,
): Promise<{ error: unknown }> => {
  if (!hasSizes(path)) return { error: null };

  let body = original;
  if (!body) {
    const read = await getMedia(path);
    if (!read.body) return { error: read.error };
    body = read.body;
  }
  const source = Buffer.isBuffer(body) ? body : Buffer.from(body);

  try {
    for (const width of IMAGE_WIDTHS) {
      const copy = await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 75 })
        .toBuffer();
      const put = await putMedia(
        sizedPath(path, width),
        new Uint8Array(copy),
        "image/webp",
      );
      if (put.error) return put;
    }
    return { error: null };
  } catch (error) {
    return { error };
  }
};
