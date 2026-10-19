// The room, built and drawn off the page: the page hands its canvas over,
// see room-client.ts, so nothing the room does, building, compiling, drawing,
// ever holds up the page's scrolling or its animations

import type { FromRoom, ToRoom } from "~/modules/about/room/handle";
import { type Painted, SURFACE_NAMES, type SurfaceName } from "~/modules/about/room/painting";
import { createRoom, type Room, type RoomView } from "~/modules/about/room/room-scene";

const tell = (message: FromRoom) => self.postMessage(message);

// The surfaces are painted by the page's own painters, and arrive here one
// by one
const settle = {} as Record<SurfaceName, (painted: Painted) => void>;
const results = {} as Record<SurfaceName, Promise<Painted>>;
for (const name of SURFACE_NAMES) {
  results[name] = new Promise<Painted>((resolve) => {
    settle[name] = resolve;
  });
}

// What the page has said so far, for the room once it's built
let room: Room | null = null;
let isGone = false;
let view: RoomView = { width: 0, height: 0, devicePixelRatio: 1 };
let isShown = false;
let offset = 0;

self.addEventListener("message", async ({ data }: MessageEvent<ToRoom>) => {
  switch (data.type) {
    case "init": {
      view = data.view;
      try {
        const made = await createRoom(data.canvas, {
          onStatus: (label) => tell({ type: "status", label }),
          onProgress: (share) => tell({ type: "progress", share }),
          onReady: () => tell({ type: "ready" }),
          layout: data.layout,
          pictures: data.pictures,
          sleeve: data.sleeve,
          reducedMotion: data.reducedMotion,
          painting: { results, stop: () => {} },
        });
        if (isGone) {
          made.destroy();
          self.close();
          return;
        }
        room = made;
        room.resize(view);
        room.setOffset(offset);
        room.setVisible(isShown);
      } catch {
        tell({ type: "failed" });
      }
      return;
    }
    case "painted":
      settle[data.painted.name]?.(data.painted);
      return;
    case "view":
      view = data.view;
      room?.resize(view);
      return;
    case "visible":
      isShown = data.isShown;
      room?.setVisible(isShown);
      return;
    case "offset":
      offset = data.ms;
      room?.setOffset(offset);
      return;
    case "hover":
      tell({ type: "answer", id: data.id, hotspot: room ? room.hover(data.point) : null });
      return;
    case "pick":
      tell({ type: "answer", id: data.id, hotspot: room ? room.pick(data.x, data.y) : null });
      return;
    case "destroy":
      isGone = true;
      room?.destroy();
      room = null;
      self.close();
      return;
  }
});
