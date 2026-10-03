/**
 * The hue of a photo, averaged over colorful pixels only so dark sand or film
 * borders don't drag it to grey, and its chroma: how colorful it is overall.
 * Takes raw pixels of a small copy, 48px is plenty. Shared by the import
 * script (sharp) and the CMS upload (canvas), so both measure alike.
 */
export const measureColor = (
  data: ArrayLike<number>,
  channels: number,
): { hue: number; chroma: number } => {
  let hueX = 0;
  let hueY = 0;
  let chromaSum = 0;
  let pixels = 0;

  for (let index = 0; index < data.length; index += channels) {
    const r = data[index] / 255;
    const g = data[index + 1] / 255;
    const b = data[index + 2] / 255;
    const max = Math.max(r, g, b);
    const chroma = max - Math.min(r, g, b);

    if (chroma > 0) {
      const sector =
        max === r
          ? (g - b) / chroma
          : max === g
            ? (b - r) / chroma + 2
            : (r - g) / chroma + 4;
      const angle = (sector * Math.PI) / 3;
      hueX += Math.cos(angle) * chroma;
      hueY += Math.sin(angle) * chroma;
    }

    chromaSum += chroma;
    pixels++;
  }

  return {
    hue: ((Math.atan2(hueY, hueX) * 180) / Math.PI + 360) % 360,
    chroma: pixels ? chromaSum / pixels : 0,
  };
};
