import sharp from "sharp";
// biome-ignore lint/style/noRestrictedImports: the import script runs this on Node, which can't resolve ~/
import { DISPLAY_SIZE, displayPath, hasDisplayCopy } from "./media-types.ts";
// biome-ignore lint/style/noRestrictedImports: the import script runs this on Node, which can't resolve ~/
import { getMedia, putMedia } from "./storage.ts";

/**
 * Makes a file's display copy and stores it next to the file: WebP, at most
 * DISPLAY_SIZE on its long side, turned upright. Pass the bytes when they're
 * at hand, otherwise they're read from the bucket. A file that doesn't get a
 * copy, like an SVG, needs nothing and succeeds right away.
 */
export const makeDisplayCopy = async (
  path: string,
  original?: ArrayBuffer | Buffer,
): Promise<{ error: unknown }> => {
  if (!hasDisplayCopy(path)) return { error: null };

  let body = original;
  if (!body) {
    const read = await getMedia(path);
    if (!read.body) return { error: read.error };
    body = read.body;
  }

  try {
    const copy = await sharp(Buffer.isBuffer(body) ? body : Buffer.from(body))
      .rotate()
      .resize(DISPLAY_SIZE, DISPLAY_SIZE, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    return await putMedia(displayPath(path), new Uint8Array(copy), "image/webp");
  } catch (error) {
    return { error };
  }
};
