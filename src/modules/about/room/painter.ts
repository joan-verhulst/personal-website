
import {
  type Painted,
  paintSurface,
  RECIPES,
  SURFACE_NAMES,
  type SurfaceName,
} from "~/modules/about/room/painting";

export interface Painting {
  results: Record<SurfaceName, Promise<Painted>>;
  stop: () => void;
}

const MOST_WORKERS = 3;

const shareOut = (count: number) => {
  const loads = Array.from({ length: count }, () => ({ work: 0, names: [] as SurfaceName[] }));
  const bySize = [...SURFACE_NAMES].sort((a, b) => RECIPES[b].size - RECIPES[a].size);
  for (const name of bySize) {
    const least = loads.reduce((low, load) => (load.work < low.work ? load : low));
    least.names.push(name);
    least.work += RECIPES[name].size ** 2;
  }
  return loads.map(({ names }) => names).filter((names) => names.length > 0);
};

export const startPainting = (): Painting => {
  const settle = {} as Record<SurfaceName, (painted: Painted) => void>;
  const results = {} as Record<SurfaceName, Promise<Painted>>;
  for (const name of SURFACE_NAMES) {
    results[name] = new Promise<Painted>((resolve) => {
      settle[name] = resolve;
    });
  }

  let isStopped = false;
  const left = new Set<SurfaceName>(SURFACE_NAMES);
  const deliver = (painted: Painted) => {
    if (isStopped || !left.has(painted.name)) return;
    left.delete(painted.name);
    settle[painted.name](painted);
  };

  const paintHere = async (names: SurfaceName[]) => {
    for (const name of names) {
      if (isStopped) return;
      if (!left.has(name)) continue;
      await new Promise((next) => setTimeout(next));
      deliver(paintSurface(name));
    }
  };

  const workers = new Set<Worker>();
  const cores = typeof navigator === "undefined" ? 2 : navigator.hardwareConcurrency || 2;
  const shares = shareOut(Math.max(1, Math.min(MOST_WORKERS, cores - 1)));
  for (const names of shares) {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./paint.worker.ts", import.meta.url), { type: "module" });
    } catch {
      paintHere(names);
      continue;
    }
    workers.add(worker);
    let mine = names.length;
    worker.addEventListener("message", ({ data }: MessageEvent<Painted>) => {
      deliver(data);
      mine -= 1;
      if (mine === 0) {
        worker.terminate();
        workers.delete(worker);
      }
    });
    worker.addEventListener("error", () => {
      worker.terminate();
      workers.delete(worker);
      paintHere(names);
    });
    worker.postMessage(names);
  }

  return {
    results,
    stop: () => {
      isStopped = true;
      for (const worker of workers) worker.terminate();
      workers.clear();
    },
  };
};
