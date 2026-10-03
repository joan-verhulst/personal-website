import type { Print } from "~/modules/content/types";

export type { Print };

export interface Placement {
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
}

export interface TableLayout {
  width: number;
  height: number;
  placements: Placement[];
}

export interface Size {
  width: number;
  height: number;
}

// Below this chroma a photo counts as black and white
const GREY_CHROMA = 0.05;

// White border around the photo, and the strip below it that holds the caption
export const PAPER_BORDER = 6;
export const PAPER_LABEL = 24;

/**
 * A faint wash of the photo's hue, a little stronger the more colorful the
 * photo is. Averaging the pixels instead gives mud.
 */
export const getPrintTint = ({ hue, chroma }: Pick<Print, "hue" | "chroma">) => {
  if (chroma < GREY_CHROMA) return "hsl(0 0% 95%)";
  const saturation = Math.min(35, 8 + chroma * 150);
  return `hsl(${Math.round(hue)} ${Math.round(saturation)}% 95%)`;
};

// A print's size is set by a base length: 40% of the screen's short side, within limits
const BASE_SCALE = 0.4;
const MIN_BASE = 190;
const MAX_BASE = 440;
// Photo area as a share of base², the same for every print
const PHOTO_AREA = 0.55;

export const getPrintBase = ({ width, height }: Size) =>
  Math.min(MAX_BASE, Math.max(MIN_BASE, Math.min(width, height) * BASE_SCALE));

// Photo width relative to the base, from the aspect ratio
const getWidthFactor = (print: Print) =>
  Math.sqrt(PHOTO_AREA * (print.width / print.height));

// Every print gets the same photo area, so portraits and landscapes weigh the same
const getPaperSize = (print: Print, base: number): Size => {
  const photoWidth = getWidthFactor(print) * base;
  const photoHeight = photoWidth / (print.width / print.height);

  return {
    width: Math.round(photoWidth + PAPER_BORDER * 2),
    height: Math.round(photoHeight + PAPER_BORDER + PAPER_LABEL),
  };
};

/**
 * The photo's width on the table as a CSS length, for the image's sizes
 * attribute. Plain CSS, so it's right from the server render on, before
 * the table is measured.
 */
export const getTableImageSizes = (print: Print) =>
  `calc(clamp(${MIN_BASE}px, ${BASE_SCALE * 100}vmin, ${MAX_BASE}px) * ${getWidthFactor(print).toFixed(3)})`;

// Seeded, so a layout stays put across resizes until the next shuffle
const createRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * A loose pile: prints land in random cells of a grid shaped like the
 * screen, nudged and turned a little so the grid doesn't show.
 */
export const scatterLayout = (
  prints: Print[],
  base: number,
  viewport: Size,
  seed: number,
): TableLayout => {
  const random = createRandom(seed);
  const cell = base * 1.1;
  const padding = base * 0.4;
  const columns = Math.max(
    2,
    Math.round(
      Math.sqrt(prints.length * (viewport.width / viewport.height)) * 1.05,
    ),
  );
  const rows = Math.ceil(prints.length / columns);

  // Fisher-Yates over the cells, so which photo lands where is random too
  const cells = Array.from({ length: columns * rows }, (_, index) => index);
  for (let index = cells.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [cells[index], cells[swap]] = [cells[swap], cells[index]];
  }

  const placements = prints.map((print, index) => {
    const size = getPaperSize(print, base);
    const column = cells[index] % columns;
    const row = Math.floor(cells[index] / columns);
    const centerX = padding + (column + 0.5 + (random() - 0.5) * 0.5) * cell;
    const centerY = padding + (row + 0.5 + (random() - 0.5) * 0.5) * cell;

    return {
      x: centerX - size.width / 2,
      y: centerY - size.height / 2,
      rotation: (random() - 0.5) * 14,
      ...size,
    };
  });

  return {
    width: columns * cell + padding * 2,
    height: rows * cell + padding * 2,
    placements,
  };
};

export interface DragBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * How far the table can be dragged inside its frame. An axis that already
 * fits is locked, centered.
 */
export const getDragBounds = (layout: TableLayout, frame: Size): DragBounds => {
  const fitsX = layout.width <= frame.width;
  const fitsY = layout.height <= frame.height;
  const centerX = (frame.width - layout.width) / 2;
  const centerY = (frame.height - layout.height) / 2;

  return {
    minX: fitsX ? centerX : frame.width - layout.width,
    maxX: fitsX ? centerX : 0,
    minY: fitsY ? centerY : frame.height - layout.height,
    maxY: fitsY ? centerY : 0,
  };
};
