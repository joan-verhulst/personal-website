// A strip of 35 mm colour negative, cut from the roll, drawn as a texture
// for the film hanging to dry, see film-scene.ts: the orange base, the
// frames with the photos as negatives, see negative.ts, the perforations
// down both edges, and the frame numbers and a barcode exposed along the
// edges at the factory. In millimetres, the way film is measured.

import { BASE, drawNegative } from "~/modules/photography/utils/negative";

// Texture pixels to a millimetre of film. The longest strip stays under
// 4096 pixels, the most some GPUs take
const PX_PER_MM = 8;

// The film, and a frame 36 by 24 mm every 8 perforations, in the middle
export const FILM_WIDTH = 35;
const FRAME_ALONG = 36;
const FRAME_ACROSS = 24;
const FRAME_PITCH = 38;
const FRAME_LEFT = (FILM_WIDTH - FRAME_ACROSS) / 2;
const FRAME_GAP = FRAME_PITCH - FRAME_ALONG;

// Film above the first frame, part of it held in the clip, and below the
// last, where it was cut
const LEADER = 16;
const TAIL = 5;

// The perforations: across and along the film, how far apart, and in from
// its edge
const PERF_ACROSS = 2.8;
const PERF_ALONG = 2;
const PERF_PITCH = 4.75;
const PERF_EDGE = 2;
const PERF_RADIUS = 0.45;

// What's printed on the edge was exposed, so it's dense: dark, like
// everything light was on a negative
const EDGE_INK = "rgba(58, 22, 6, 0.78)";
const EDGE_TYPE = 1.5;

export const stripLength = (frames: number) =>
  LEADER + frames * FRAME_PITCH + TAIL;

// Where a frame starts, from the strip's top
const frameTop = (index: number) =>
  LEADER + index * FRAME_PITCH + FRAME_GAP / 2;

// Fills a box centered on the origin and crops the rest, like object-cover
const drawCover = (
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) => {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight,
  );
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  context.drawImage(
    image,
    (image.naturalWidth - cropWidth) / 2,
    (image.naturalHeight - cropHeight) / 2,
    cropWidth,
    cropHeight,
    -width / 2,
    -height / 2,
    width,
    height,
  );
};

// Text along the film, reading down it, centered on a point
const drawAlong = (
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
) => {
  context.save();
  context.translate(x, y);
  context.rotate(Math.PI / 2);
  context.fillText(text, 0, 0);
  context.restore();
};

/** Sizes a canvas for a strip of this many frames. */
export const sizeStrip = (canvas: HTMLCanvasElement, frames: number) => {
  canvas.width = Math.round(FILM_WIDTH * PX_PER_MM);
  canvas.height = Math.round(stripLength(frames) * PX_PER_MM);
};

/**
 * Draws a strip with these photos in its frames, numbered on from
 * `firstNumber` like the roll it was cut from. A frame whose photo isn't
 * in yet is bare film.
 */
export const drawStrip = (
  context: CanvasRenderingContext2D,
  photos: (HTMLImageElement | null)[],
  firstNumber: number,
) => {
  const length = stripLength(photos.length);
  context.setTransform(PX_PER_MM, 0, 0, PX_PER_MM, 0, 0);
  context.globalCompositeOperation = "source-over";
  context.clearRect(0, 0, FILM_WIDTH, length);
  context.fillStyle = BASE;
  context.fillRect(0, 0, FILM_WIDTH, length);
  context.imageSmoothingQuality = "high";

  photos.forEach((photo, index) => {
    if (!photo) return;
    const top = frameTop(index);
    context.save();
    context.beginPath();
    context.roundRect(FRAME_LEFT, top, FRAME_ACROSS, FRAME_ALONG, 0.4);
    context.clip();
    context.save();
    context.translate(FRAME_LEFT + FRAME_ACROSS / 2, top + FRAME_ALONG / 2);
    // Shot level, a landscape lies along the film, so it hangs on its side
    if (photo.naturalWidth > photo.naturalHeight) {
      context.rotate(-Math.PI / 2);
      drawCover(context, photo, FRAME_ALONG, FRAME_ACROSS);
    } else {
      drawCover(context, photo, FRAME_ACROSS, FRAME_ALONG);
    }
    context.restore();
    drawNegative(context, FRAME_LEFT, top, FRAME_ACROSS, FRAME_ALONG);
    context.restore();
  });

  // The frame numbers down one edge, with a half frame's number between
  // them, and the barcode down the other
  context.fillStyle = EDGE_INK;
  context.font = `${EDGE_TYPE}px ui-monospace, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const numbers = FILM_WIDTH - PERF_EDGE / 2;
  photos.forEach((_, index) => {
    const number = firstNumber + index;
    const top = frameTop(index);
    drawAlong(context, String(number), numbers, top + 3);
    drawAlong(context, `▸${number}A`, numbers, top + FRAME_PITCH / 2 + 1);

    // A different code in every frame, the same on every strip
    let bar = top + 6;
    for (let step = 0; step < 14; step++) {
      const width = (number * 7 + step * 5) % 3 === 0 ? 0.5 : 0.25;
      if ((number + step) % 4 !== 1) {
        context.fillRect(0.5, bar, PERF_EDGE - 0.9, width);
      }
      bar += width + 0.3;
    }
  });

  // The perforations, through the film
  context.globalCompositeOperation = "destination-out";
  context.fillStyle = "#000000";
  context.beginPath();
  for (let y = 1.2; y + PERF_ALONG < length - 0.6; y += PERF_PITCH) {
    context.roundRect(PERF_EDGE, y, PERF_ACROSS, PERF_ALONG, PERF_RADIUS);
    context.roundRect(
      FILM_WIDTH - PERF_EDGE - PERF_ACROSS,
      y,
      PERF_ACROSS,
      PERF_ALONG,
      PERF_RADIUS,
    );
  }
  context.fill();
  context.globalCompositeOperation = "source-over";
  context.setTransform(1, 0, 0, 1, 0, 0);
};
