import {
  createSkyRenderer,
  SKY_DEFAULTS,
  type SkyFrame,
  type SkyRenderer,
} from "~/modules/core/utils/sky-shader";

/**
 * One sky renderer for the whole site. Its shaders take a while to compile,
 * and every page has a footer with the sky in it, while home keeps its own
 * under an open section: compiling for each of them stalled every
 * navigation. So the renderer is made once, with one canvas, and the
 * footers take turns with it. The footer on the page that's open draws, and
 * the canvas goes to it. The one under it draws again once it's back on
 * top. The blog's sky cover borrows the renderer, and copies what it drew.
 */

/** A footer that draws the sky, see useSky. */
export interface SkyHost {
  // Where the canvas goes while this host draws
  element: HTMLElement;
  // The shaders are ready, after compiling in the background
  onReady: () => void;
  // What the canvas holds is no longer this host's: another host took it,
  // this host is back on top without it, or a borrower drew in it. Drawn
  // again when it's next needed
  onInvalidate: () => void;
  // The GPU dropped the canvas, or a shader didn't compile: no sky until a
  // new one is ready, see onReady
  onLost: () => void;
}

// After the GPU dropped the sky, it's made again at most this many times a
// visit, so a GPU that keeps refusing isn't asked over and over
const MAX_REBUILDS = 3;

let canvas: HTMLCanvasElement | null = null;
// Undefined until the first host or borrower asks, and again once the GPU
// dropped it, until it's next asked for. Null where there's no WebGL2, the
// shaders didn't compile, or it was dropped too often
let renderer: SkyRenderer | null | undefined;
let rebuilds = 0;
// The hosts on the page, in the order they came: the last is on top
const hosts: SkyHost[] = [];
// The host the canvas is in
let holder: SkyHost | null = null;
// Borrowers waiting for the shaders
const readyListeners = new Set<() => void>();

const topHost = () => hosts[hosts.length - 1] as SkyHost | undefined;

const lose = () => {
  // Nothing more from the one that's gone
  renderer?.destroy();
  renderer = null;
  canvas?.remove();
  canvas = null;
  holder = null;
  for (const host of hosts) host.onLost();
  // Made again, on a canvas of its own, the next time a host or a borrower
  // asks for the sky. The hosts get onReady once it has compiled
  if (rebuilds < MAX_REBUILDS) {
    rebuilds += 1;
    renderer = undefined;
  }
};

const ready = () => {
  // Borrowers first: the host that draws after them keeps the canvas
  for (const listener of readyListeners) listener();
  for (const host of hosts) host.onReady();
};

// The canvas and the renderer, the first time they're asked for, and the
// first time after they were lost. Where the browser compiles in the
// foreground, the renderer comes back ready, and whoever asked sees that for
// itself
const setUp = () => {
  if (renderer !== undefined) return;
  canvas = document.createElement("canvas");
  canvas.className = "block size-full";
  canvas.setAttribute("aria-hidden", "true");
  renderer = createSkyRenderer(canvas, lose, ready);
  if (!renderer) canvas = null;
};

/** Whether there's a sky to draw: a renderer, ready or still compiling. */
export const hasSky = () => {
  setUp();
  return renderer !== null && renderer !== undefined;
};

/** Whether the shaders have compiled, so the sky can be drawn. */
export const isSkyReady = () => renderer?.isReady() === true;

/** A host is on the page. The newest is on top, and the only one that draws. */
export const registerSkyHost = (host: SkyHost) => {
  hosts.push(host);
  setUp();
};

/** A host is leaving. The one under it is back on top. */
export const unregisterSkyHost = (host: SkyHost) => {
  const wasTop = topHost() === host;
  const index = hosts.indexOf(host);
  if (index !== -1) hosts.splice(index, 1);
  if (holder === host) {
    holder = null;
    canvas?.remove();
  }
  if (wasTop) topHost()?.onInvalidate();
};

/**
 * Hands a host the renderer to draw with, and puts the canvas in its
 * element at this size. Says whether the canvas was cleared on the way, by
 * moving or resizing: then the whole sky has to be drawn again. Only the
 * host on top draws. The others get nothing, and draw again once they're
 * back on top. Nothing either while the shaders compile, after the sky was
 * lost: the canvas would cover the gradient before it has anything to show.
 */
export const claimSky = (host: SkyHost, width: number, height: number) => {
  setUp();
  if (!renderer?.isReady() || !canvas || topHost() !== host) {
    return { renderer: null, isCleared: false };
  }

  let isCleared = false;
  if (holder !== host) {
    const previous = holder;
    holder = host;
    host.element.appendChild(canvas);
    isCleared = true;
    previous?.onInvalidate();
  }
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    isCleared = true;
  }
  return { renderer, isCleared };
};

/**
 * Draws a frame of the sky into a canvas of its own, for the blog's cover:
 * drawn on the shared canvas at that size, then copied. False until the
 * shaders are ready, see onSkyReady. The host that has the canvas draws
 * its own sky again afterwards, if that shows.
 */
export const paintSky = (
  context: CanvasRenderingContext2D,
  frame: SkyFrame,
) => {
  setUp();
  const { width, height } = context.canvas;
  if (!renderer?.isReady() || !canvas || width === 0 || height === 0) {
    return false;
  }

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  if (!renderer.draw(frame, [], SKY_DEFAULTS, { clouds: true })) return false;
  context.drawImage(canvas, 0, 0);
  holder?.onInvalidate();
  return true;
};

/**
 * Calls back once the shaders are ready, for borrowers. Returns a way to
 * stop listening.
 */
export const onSkyReady = (listener: () => void) => {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
};
