import sharp from "sharp";
import { measureColor } from "~/modules/content/utils/measure-color";

/**
 * An image's size as shown and its color, measured on the server, for a file
 * that didn't come through the upload button, like a record's cover. The
 * browser measures uploads the same way, see upload-media.ts.
 */
export const measureImage = async (body: ArrayBuffer | Buffer) => {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const { width = 0, height = 0, orientation } = await sharp(buffer).metadata();
  // EXIF orientations 5 to 8 are turned a quarter, which swaps the sides
  const isQuarterTurned = orientation !== undefined && orientation >= 5;

  // 48px is plenty for an average, like the upload button uses
  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(48, 48, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { hue, chroma } = measureColor(data, info.channels);

  return {
    width: isQuarterTurned ? height : width,
    height: isQuarterTurned ? width : height,
    hue,
    chroma,
  };
};
