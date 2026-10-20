import sharp from "sharp";
import { measureColor } from "~/modules/content/utils/measure-color";

export const measureImage = async (body: ArrayBuffer | Buffer) => {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const { width = 0, height = 0, orientation } = await sharp(buffer).metadata();
  const isQuarterTurned = orientation !== undefined && orientation >= 5;

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
