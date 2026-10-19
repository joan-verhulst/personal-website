// A colour negative, for the film hanging to dry, see film-strip.ts: the
// photo inverted most of the way, then seen through the film's orange mask.
// Worked out in sRGB, the way a canvas blends.

// The orange of the film's base, which every colour on it is seen through
export const MASK = "#e8a070";
const MASK_RGB = [0xe8, 0xa0, 0x70];

// How far the photo is inverted. Not all the way: a negative is flat, and
// its densest parts aren't black
export const INVERT = 0.85;

// Film with nothing on it: the negative of black, so a photo's shadows are
// the same orange as the film between the frames
export const BASE = `rgb(${MASK_RGB.map((channel) => Math.round(channel * INVERT)).join(" ")})`;

/**
 * Turns what's drawn in a box on the canvas into its negative: inverted
 * with a white difference, then the mask multiplied over it. Clip to the
 * photo first: the whole box is covered.
 */
export const drawNegative = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) => {
  context.save();
  context.globalCompositeOperation = "difference";
  context.globalAlpha = INVERT;
  context.fillStyle = "#ffffff";
  context.fillRect(x, y, width, height);
  context.globalCompositeOperation = "multiply";
  context.globalAlpha = 1;
  context.fillStyle = MASK;
  context.fillRect(x, y, width, height);
  context.restore();
};
