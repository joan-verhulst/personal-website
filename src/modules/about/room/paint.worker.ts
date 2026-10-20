
import { paintSurface, type SurfaceName } from "~/modules/about/room/painting";

self.addEventListener("message", ({ data }: MessageEvent<SurfaceName[]>) => {
  for (const name of data) {
    const painted = paintSurface(name);
    self.postMessage(painted, { transfer: [painted.color.buffer, painted.bump.buffer] });
  }
});
