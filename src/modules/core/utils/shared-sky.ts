import {
  createSkyRenderer,
  SKY_DEFAULTS,
  type SkyFrame,
  type SkyRenderer,
} from "~/modules/core/utils/sky-shader";

/** One renderer for the whole site: compiling shaders per footer stalled every navigation. */

export interface SkyHost {
  element: HTMLElement;
  onReady: () => void;
  onInvalidate: () => void;
  onLost: () => void;
}

const MAX_REBUILDS = 3;

let canvas: HTMLCanvasElement | null = null;
let renderer: SkyRenderer | null | undefined;
let rebuilds = 0;
const hosts: SkyHost[] = [];
let holder: SkyHost | null = null;
const readyListeners = new Set<() => void>();

const topHost = () => hosts[hosts.length - 1] as SkyHost | undefined;

const lose = () => {
  renderer?.destroy();
  renderer = null;
  canvas?.remove();
  canvas = null;
  holder = null;
  for (const host of hosts) host.onLost();
  if (rebuilds < MAX_REBUILDS) {
    rebuilds += 1;
    renderer = undefined;
  }
};

const ready = () => {
  for (const listener of readyListeners) listener();
  for (const host of hosts) host.onReady();
};

const setUp = () => {
  if (renderer !== undefined) return;
  canvas = document.createElement("canvas");
  canvas.className = "block size-full";
  canvas.setAttribute("aria-hidden", "true");
  renderer = createSkyRenderer(canvas, lose, ready);
  if (!renderer) canvas = null;
};

export const hasSky = () => {
  setUp();
  return renderer !== null && renderer !== undefined;
};

/** Whether the shaders have compiled, so the sky can be drawn. */
export const isSkyReady = () => renderer?.isReady() === true;

export const registerSkyHost = (host: SkyHost) => {
  hosts.push(host);
  setUp();
};

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
 * Hands the renderer to the host on top only; the others draw again once on top.
 * Nothing while shaders compile: the canvas would cover the gradient with nothing.
 * Says whether the canvas was cleared, so the whole sky must be redrawn.
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

export const onSkyReady = (listener: () => void) => {
  readyListeners.add(listener);
  return () => {
    readyListeners.delete(listener);
  };
};
