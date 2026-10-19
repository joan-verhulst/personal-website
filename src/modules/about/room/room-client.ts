// The page's side of the room drawn in a worker, see room.worker.ts: hands
// the canvas over, passes on the painted surfaces as they come, the room's
// size, whether it shows, the played day and the pointer, and hears back
// what the room is doing

import type { FromRoom, RoomHandle, ToRoom } from "~/modules/about/room/handle";
import type { RoomLayout } from "~/modules/about/room/layout";
import type { Painting } from "~/modules/about/room/painter";
import { SURFACE_NAMES } from "~/modules/about/room/painting";
import type { Hotspot } from "~/modules/about/room/parts";
import type { RoomCallbacks, RoomView } from "~/modules/about/room/room-scene";

// After it's asked to go, the worker gets this long, in ms, to let go of
// what it holds before it's stopped regardless
const GONE_WITHIN = 10_000;

/** Whether this browser can draw the room in a worker. */
export const canDrawInWorker = (canvas: HTMLCanvasElement) =>
  typeof canvas.transferControlToOffscreen === "function" && typeof Worker !== "undefined";

/** Hands `canvas` to a worker that builds and draws the room on it. */
export const startRoomWorker = (
  canvas: HTMLCanvasElement,
  options: {
    view: RoomView;
    layout: RoomLayout;
    pictures: string[];
    sleeve?: string;
    reducedMotion: boolean;
    painting: Painting;
  },
  callbacks: RoomCallbacks & { onFailed: () => void },
): RoomHandle => {
  const { painting, ...settings } = options;
  const offscreen = canvas.transferControlToOffscreen();
  const worker = new Worker(new URL("./room.worker.ts", import.meta.url), { type: "module" });
  let isGone = false;

  const send = (message: ToRoom, transfer: Transferable[] = []) => {
    if (!isGone) worker.postMessage(message, transfer);
  };

  // Questions about the pointer, waiting for their answers
  const waiting = new Map<number, (hotspot: Hotspot | null) => void>();
  let nextId = 0;
  const ask = (question: (id: number) => ToRoom) =>
    new Promise<Hotspot | null>((resolve) => {
      if (isGone) {
        resolve(null);
        return;
      }
      const id = nextId++;
      waiting.set(id, resolve);
      send(question(id));
    });

  worker.addEventListener("message", ({ data }: MessageEvent<FromRoom>) => {
    if (isGone) return;
    switch (data.type) {
      case "status":
        callbacks.onStatus(data.label);
        return;
      case "progress":
        callbacks.onProgress?.(data.share);
        return;
      case "ready":
        callbacks.onReady?.();
        return;
      case "answer":
        waiting.get(data.id)?.(data.hotspot);
        waiting.delete(data.id);
        return;
      case "failed":
        callbacks.onFailed();
        return;
    }
  });
  // Its code didn't load, or it broke
  worker.addEventListener("error", () => {
    if (!isGone) callbacks.onFailed();
  });

  // Addresses in full: a worker may be started from an address of its own,
  // a blob's, from which one that starts with a slash leads nowhere
  const absolute = (address: string) => new URL(address, location.href).href;
  send(
    {
      type: "init",
      canvas: offscreen,
      ...settings,
      pictures: settings.pictures.map(absolute),
      sleeve: settings.sleeve && absolute(settings.sleeve),
    },
    [offscreen],
  );
  // Each surface on to the worker as it's painted, handed over, not copied
  for (const name of SURFACE_NAMES) {
    painting.results[name].then((painted) => {
      send({ type: "painted", painted }, [painted.color.buffer, painted.bump.buffer]);
    });
  }

  return {
    resize: (view) => send({ type: "view", view }),
    setVisible: (isShown) => send({ type: "visible", isShown }),
    setOffset: (ms) => send({ type: "offset", ms }),
    hover: (point) => ask((id) => ({ type: "hover", id, point })),
    pick: (x, y) => ask((id) => ({ type: "pick", id, x, y })),
    destroy: () => {
      send({ type: "destroy" });
      isGone = true;
      painting.stop();
      for (const resolve of waiting.values()) resolve(null);
      waiting.clear();
      setTimeout(() => worker.terminate(), GONE_WITHIN);
    },
  };
};
