// Paints the room's surfaces off the main thread, one after another, and
// hands each back as it's done. Started from textures.ts

import { paintSurface, type SurfaceName } from "~/modules/about/room/painting";

self.addEventListener("message", ({ data }: MessageEvent<SurfaceName[]>) => {
  for (const name of data) {
    const painted = paintSurface(name);
    self.postMessage(painted, { transfer: [painted.color.buffer, painted.bump.buffer] });
  }
});
