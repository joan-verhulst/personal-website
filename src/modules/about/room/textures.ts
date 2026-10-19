// Pictures for the room's surfaces, as textures: the painted ones from
// painting.ts, which a worker paints while the room is built, and the ones
// drawn here with the canvas itself, a leaf and what's on the screens

import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { type Painting, startPainting } from "~/modules/about/room/painter";
import {
  hex,
  mix,
  type Painted,
  random,
  RECIPES,
  SURFACE_NAMES,
  type SurfaceName,
} from "~/modules/about/room/painting";

// ── Canvases ────────────────────────────────────────────────────────────────

type Canvas2D = HTMLCanvasElement | OffscreenCanvas;
type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// A canvas to paint on: one on the page, or, in a worker, where there's no
// page, one of its own
const canvasOf = (width: number, height: number) => {
  let canvas: Canvas2D;
  if (typeof document === "undefined") {
    canvas = new OffscreenCanvas(width, height);
  } else {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
  }
  const ctx = canvas.getContext("2d") as Context2D | null;
  if (!ctx) throw new Error("No 2D canvas");
  return { canvas, ctx };
};

const texture = (canvas: Canvas2D, isColor: boolean, repeats = true) => {
  const made = new CanvasTexture(canvas);
  if (isColor) made.colorSpace = SRGBColorSpace;
  if (repeats) {
    made.wrapS = RepeatWrapping;
    made.wrapT = RepeatWrapping;
  }
  made.anisotropy = 8;
  return made;
};

export interface Surface {
  color: CanvasTexture<Canvas2D>;
  bump: CanvasTexture<Canvas2D>;
  // Copies of either, at their own repeats, see `painted` in parts.ts: told
  // along with the originals when the painting comes in
  copies: CanvasTexture<Canvas2D>[];
}

// Brush strokes over a picture: short, soft, mostly along one direction
const strokes = (
  ctx: Context2D,
  size: number,
  count: number,
  angle: number,
  spread: number,
  colors: string[],
  alpha: number,
  seed: number,
) => {
  const next = random(seed);
  ctx.lineCap = "round";
  for (let stroke = 0; stroke < count; stroke++) {
    const x = next() * size;
    const y = next() * size;
    const length = size * (0.06 + next() * 0.2);
    const turn = angle + (next() - 0.5) * spread;
    ctx.strokeStyle = colors[Math.floor(next() * colors.length)];
    ctx.globalAlpha = alpha * (0.5 + next());
    ctx.lineWidth = size * (0.008 + next() * 0.03);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(turn) * length, y + Math.sin(turn) * length);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

// ── The painted surfaces ────────────────────────────────────────────────────

// Whole pictures of one thing, not tiles
const WHOLE = new Set<SurfaceName>(["spruce", "sunburst", "rug"]);

export interface Surfaces {
  surfaces: Record<SurfaceName, Surface>;
  // Settles once every surface is painted
  painted: Promise<void>;
  // Stops the painting, when the room goes before it's done
  stop: () => void;
}

/**
 * Every painted surface, each a flat colour at first, filled in as its
 * paint comes from `painting`, started earlier, see painter.ts. Each
 * surface filled in is told, with how many there are.
 */
export const createSurfaces = (
  painting: Painting = startPainting(),
  onPainted?: (done: number, total: number) => void,
): Surfaces => {
  const canvases = {} as Record<SurfaceName, ReturnType<typeof blank>>;
  const surfaces = {} as Record<SurfaceName, Surface>;
  for (const name of SURFACE_NAMES) {
    const made = blank(name);
    canvases[name] = made;
    surfaces[name] = {
      color: texture(made.color.canvas, true, !WHOLE.has(name)),
      bump: texture(made.bump.canvas, false, !WHOLE.has(name)),
      copies: [],
    };
    // Sent up as painted, not turned over: turning a picture over on its
    // way up is done pixel by pixel, in Firefox on the same thread as
    // every canvas's drawing. Noise and grain look the same either way up
    surfaces[name].color.flipY = false;
    surfaces[name].bump.flipY = false;
  }

  let isStopped = false;
  let done = 0;
  const fill = ({ name, color, bump }: Painted) => {
    if (isStopped) return;
    const { size } = RECIPES[name];
    const made = canvases[name];
    made.color.ctx.putImageData(new ImageData(color, size, size), 0, 0);
    made.bump.ctx.putImageData(new ImageData(bump, size, size), 0, 0);
    if (name === "plaster") {
      strokes(made.color.ctx, size, 700, 0, 0.5, ["#ffffff", "#d0d0d0", "#e8e8e8", "#dadada"], 0.09, 21);
      strokes(made.bump.ctx, size, 700, 0, 0.5, ["#9a9a9a", "#666666"], 0.12, 21);
    }
    // Every texture of the canvas is sent up again, copies too: each keeps
    // its own count of changes
    const { color: colorTexture, bump: bumpTexture, copies } = surfaces[name];
    for (const made of [colorTexture, bumpTexture, ...copies]) made.needsUpdate = true;
    done += 1;
    onPainted?.(done, SURFACE_NAMES.length);
  };

  const painted = Promise.all(
    SURFACE_NAMES.map((name) => painting.results[name].then(fill)),
  ).then(() => undefined);

  return {
    surfaces,
    painted,
    stop: () => {
      isStopped = true;
      painting.stop();
    },
  };
};

// A surface's canvases, in its flat colour, with flat bumps
const blank = (name: SurfaceName) => {
  const { size, flat } = RECIPES[name];
  const color = canvasOf(size, size);
  color.ctx.fillStyle = flat;
  color.ctx.fillRect(0, 0, size, size);
  const bump = canvasOf(size, size);
  bump.ctx.fillStyle = "#808080";
  bump.ctx.fillRect(0, 0, size, size);
  return { color, bump };
};

// ── Drawn with the canvas ───────────────────────────────────────────────────

/** A leaf, pointed at both ends, with its veins, on a transparent ground. */
export const leafTexture = () => {
  const width = 256;
  const height = 512;
  const { canvas, ctx } = canvasOf(width, height);
  const image = ctx.createImageData(width, height);
  const dark = hex("#2f6630");
  const light = hex("#6aa553");
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / width - 0.5;
      const v = y / height;
      const half = 0.42 * Math.sin(Math.PI * v) ** 0.75;
      const at = (y * width + x) * 4;
      if (Math.abs(u) > half) continue;
      // Lighter toward the tip and the edges, a vein down the middle and
      // side veins leaning up toward the tip
      const toEdge = Math.abs(u) / half;
      const midVein = Math.abs(u) < 0.015 ? 1 : 0;
      const sideVein = Math.abs(((Math.abs(u) * 3 + v) * 9) % 1 - 0.5) < 0.04 ? 0.6 : 0;
      const tone = 0.35 + 0.4 * (1 - v) + 0.25 * toEdge + 0.3 * midVein + 0.2 * sideVein;
      const color = mix(dark, light, Math.min(1, tone));
      image.data[at] = color[0];
      image.data[at + 1] = color[1];
      image.data[at + 2] = color[2];
      image.data[at + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return texture(canvas, true, false);
};

/** What's on the monitor: a desktop, a window of text over a sea and a sky. */
export const screenTexture = () => {
  const width = 512;
  const height = 288;
  const { canvas, ctx } = canvasOf(width, height);

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#5f98df");
  sky.addColorStop(0.5, "#bcd8f0");
  sky.addColorStop(0.52, "#4f8fc6");
  sky.addColorStop(1, "#1f4f8a");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#2f4a3a";
  ctx.beginPath();
  ctx.moveTo(width * 0.36, height * 0.5);
  ctx.quadraticCurveTo(width * 0.5, height * 0.4, width * 0.64, height * 0.5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgb(255 255 255 / 0.92)";
  ctx.fillRect(width * 0.06, height * 0.12, width * 0.42, height * 0.52);
  ctx.fillStyle = "rgb(0 0 0 / 0.08)";
  for (let line = 0; line < 9; line++) {
    ctx.fillRect(width * 0.09, height * (0.2 + line * 0.045), width * (0.2 + (line % 3) * 0.06), height * 0.015);
  }
  ctx.fillStyle = "rgb(20 30 40 / 0.5)";
  ctx.fillRect(width * 0.3, height * 0.82, width * 0.4, height * 0.09);

  const made = new CanvasTexture(canvas);
  made.colorSpace = SRGBColorSpace;
  return made;
};
