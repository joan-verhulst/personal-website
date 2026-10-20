
import { InstancedMesh, Mesh, type Object3D, type WebGLRenderer } from "three";

const WINDOW = 60;
const REPORT_EVERY = 500;
const MAX_PENDING = 120;

export interface PerfStage {
  name: string;
  ms: number;
  max: number;
  calls: number;
  triangles: number;
}

export interface PerfPart {
  name: string;
  triangles: number;
  meshes: number;
  outlines: number;
  shadows: number;
}

export interface PerfReport {
  state: string;
  isGpuTimed: boolean;
  stages: PerfStage[];
  gpu: number;
  gpuMax: number;
  cpu: number;
  cpuMax: number;
  drawn: number;
  busy: number;
  calls: number;
  triangles: number;
  programs: number;
  textures: number;
  geometries: number;
  width: number;
  height: number;
  byState: { state: string; gpu: number; cpu: number; frames: number }[];
  parts: PerfPart[];
  meshes: PerfPart[];
  peak: { state: string; triangles: number; gpu: number; ago: number; stages: PerfStage[] } | null;
}

interface Segment {
  label: string;
  query: WebGLQuery | null;
  calls: number;
  triangles: number;
}

interface Frame {
  state: string;
  at: number;
  cpu: number;
  segments: Segment[];
  hasWork: boolean;
  calls: number;
  triangles: number;
}

interface Measured {
  stages: Map<string, { ms: number; calls: number; triangles: number }>;
  gpu: number;
  cpu: number;
  at: number;
  state: string;
  triangles: number;
}

const PEAK_WITHIN = 15_000;
const ANSWER_LAG = 100;

const LISTED = 12;

const trianglesOf = (mesh: Mesh) => {
  const { index, attributes, drawRange } = mesh.geometry;
  const count = index ? index.count : (attributes.position?.count ?? 0);
  const drawn = Math.min(count - drawRange.start, drawRange.count);
  const instances = mesh instanceof InstancedMesh ? mesh.count : 1;
  return (Math.max(0, drawn) / 3) * instances;
};

const isShown = (object: Object3D) => {
  for (let node: Object3D | null = object; node; node = node.parent) if (!node.visible) return false;
  return true;
};

const countParts = (scene: Object3D, things: Record<string, Object3D>) => {
  const owners = new Map<Object3D, string>();
  for (const [name, thing] of Object.entries(things)) owners.set(thing, name);
  const parts = new Map<string, PerfPart>();
  const meshes: PerfPart[] = [];
  const named = new Map<string, number>();
  scene.traverse((child) => {
    if (!(child instanceof Mesh) || !isShown(child)) return;
    let owner = "other";
    for (let node: Object3D | null = child; node; node = node.parent) {
      const name = owners.get(node);
      if (name) {
        owner = name;
        break;
      }
    }
    const triangles = trianglesOf(child);
    const isOutline = child.userData.isOutline === true;
    const outlines = isOutline ? triangles : 0;
    const shadows = child.castShadow ? triangles : 0;
    const part = parts.get(owner) ?? { name: owner, triangles: 0, meshes: 0, outlines: 0, shadows: 0 };
    part.triangles += triangles;
    part.meshes += 1;
    part.outlines += outlines;
    part.shadows += shadows;
    parts.set(owner, part);
    const shape = child.name || child.geometry.name || child.geometry.type;
    const name = `${owner} · ${shape}${isOutline ? " (outline)" : ""}`;
    const seen = (named.get(name) ?? 0) + 1;
    named.set(name, seen);
    meshes.push({
      name: seen > 1 ? `${name} #${seen}` : name,
      triangles,
      meshes: 1,
      outlines,
      shadows,
    });
  });
  const byMost = (a: PerfPart, b: PerfPart) => b.triangles - a.triangles;
  return {
    parts: [...parts.values()].sort(byMost),
    meshes: meshes.sort(byMost).slice(0, LISTED),
  };
};

interface TimerQuery {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

export type Profiler = ReturnType<typeof createProfiler>;

export const createProfiler = (renderer: WebGLRenderer, onReport: (report: PerfReport) => void) => {
  const gl = renderer.getContext() as WebGL2RenderingContext;
  const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2") as TimerQuery | null;
  renderer.info.autoReset = false;

  const pool: WebGLQuery[] = [];
  const stack: string[] = [];
  let open: Segment | null = null;
  let current: Frame | null = null;
  let latest: Frame | null = null;
  const pending: Frame[] = [];
  const windows = new Map<string, Measured[]>();
  const counts = new Map<string, number>();
  const drawnAt: number[] = [];
  const recent: Measured[] = [];

  let watched: { scene: Object3D; things: Record<string, Object3D> } | null = null;

  const begin = (label: string) => {
    if (!current) return;
    let query: WebGLQuery | null = null;
    if (timer) {
      query = pool.pop() ?? gl.createQuery();
      if (query) gl.beginQuery(timer.TIME_ELAPSED_EXT, query);
    }
    const { render } = renderer.info;
    open = { label, query, calls: render.calls, triangles: render.triangles };
  };
  const end = () => {
    if (!open) return;
    if (open.query && timer) gl.endQuery(timer.TIME_ELAPSED_EXT);
    const { render } = renderer.info;
    open.calls = render.calls - open.calls;
    open.triangles = render.triangles - open.triangles;
    current?.segments.push(open);
    open = null;
  };
  const push = (label: string) => {
    end();
    stack.push(label);
    if (current) current.hasWork = true;
    begin(label);
  };
  const pop = () => {
    end();
    stack.pop();
    const outer = stack.at(-1);
    if (outer) begin(outer);
  };

  const release = (frame: Frame) => {
    for (const { query } of frame.segments) if (query) pool.push(query);
  };

  const poll = () => {
    if (timer && gl.getParameter(timer.GPU_DISJOINT_EXT)) {
      for (const frame of pending) release(frame);
      pending.length = 0;
      return;
    }
    while (pending.length > 0) {
      const frame = pending[0];
      const last = frame.segments.at(-1)?.query;
      if (last && !gl.getQueryParameter(last, gl.QUERY_RESULT_AVAILABLE)) break;
      pending.shift();
      const stages: Measured["stages"] = new Map();
      let gpu = 0;
      for (const { label, query, calls, triangles } of frame.segments) {
        const ms = query ? gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6 : 0;
        const stage = stages.get(label) ?? { ms: 0, calls: 0, triangles: 0 };
        stage.ms += ms;
        stage.calls += calls;
        stage.triangles += triangles;
        stages.set(label, stage);
        gpu += ms;
        if (query) pool.push(query);
      }
      const measured = windows.get(frame.state) ?? [];
      windows.set(frame.state, measured);
      const done: Measured = {
        stages,
        gpu,
        cpu: frame.cpu,
        at: frame.at,
        state: frame.state,
        triangles: frame.triangles,
      };
      measured.push(done);
      recent.push(done);
      if (measured.length > WINDOW) measured.shift();
      counts.set(frame.state, (counts.get(frame.state) ?? 0) + 1);
    }
  };

  const average = (values: number[]) =>
    values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  const report = () => {
    poll();
    const now = performance.now();
    while (drawnAt.length > 0 && drawnAt[0] < now - 1000) drawnAt.shift();
    while (recent.length > 0 && recent[0].at < now - PEAK_WITHIN) recent.shift();
    if (!latest) return;
    const heaviest = recent.reduce<Measured | null>(
      (most, frame) => (!most || frame.triangles > most.triangles ? frame : most),
      null,
    );
    const peak = heaviest && {
      state: heaviest.state,
      triangles: heaviest.triangles,
      gpu: heaviest.gpu,
      ago: (now - heaviest.at) / 1000,
      stages: [...heaviest.stages]
        .map(([name, stage]) => ({ name, ...stage, max: stage.ms }))
        .sort((a, b) => b.triangles - a.triangles),
    };
    const state = latest.state;
    const measured = windows.get(state) ?? [];
    const labels = new Set<string>();
    for (const frame of measured) for (const label of frame.stages.keys()) labels.add(label);
    const stages = [...labels]
      .map((name) => {
        const each = measured.map((frame) => frame.stages.get(name));
        const ms = each.map((stage) => stage?.ms ?? 0);
        return {
          name,
          ms: average(ms),
          max: Math.max(...ms),
          calls: average(each.map((stage) => stage?.calls ?? 0)),
          triangles: average(each.map((stage) => stage?.triangles ?? 0)),
        };
      })
      .sort((a, b) => b.ms - a.ms);
    const gpus = measured.map((frame) => frame.gpu);
    const cpus = measured.map((frame) => frame.cpu);
    const { memory } = renderer.info;
    onReport({
      state,
      isGpuTimed: timer !== null,
      stages,
      gpu: average(gpus),
      gpuMax: gpus.length > 0 ? Math.max(...gpus) : 0,
      cpu: average(cpus),
      cpuMax: cpus.length > 0 ? Math.max(...cpus) : 0,
      drawn: drawnAt.length,
      busy: recent
        .filter((frame) => frame.at > now - 1000 - ANSWER_LAG)
        .reduce((sum, frame) => sum + frame.gpu, 0),
      calls: latest.calls,
      triangles: latest.triangles,
      programs: renderer.info.programs?.length ?? 0,
      textures: memory.textures,
      geometries: memory.geometries,
      width: gl.drawingBufferWidth,
      height: gl.drawingBufferHeight,
      byState: [...windows].map(([name, frames]) => ({
        state: name,
        gpu: average(frames.map((frame) => frame.gpu)),
        cpu: average(frames.map((frame) => frame.cpu)),
        frames: counts.get(name) ?? 0,
      })),
      ...(watched ? countParts(watched.scene, watched.things) : { parts: [], meshes: [] }),
      peak,
    });
  };
  const reporting = setInterval(report, REPORT_EVERY);

  const shadowMap = renderer.shadowMap as unknown as Record<string, (...args: unknown[]) => unknown>;

  const profiler = {
    watch: (scene: Object3D, things: Record<string, Object3D>) => {
      watched = { scene, things };
    },
    wrap: <T extends object>(target: T, method: string, label: string, isTopOnly = false) => {
      const methods = target as unknown as Record<string, (...args: unknown[]) => unknown>;
      const original = methods[method];
      methods[method] = function (this: unknown, ...args: unknown[]) {
        if (isTopOnly && stack.length > 0) return original.apply(this, args);
        push(label);
        try {
          return original.apply(this, args);
        } finally {
          pop();
        }
      };
    },
    frame: (draw: () => void, stateOf: () => string) => {
      current = { state: "", at: 0, cpu: 0, segments: [], hasWork: false, calls: 0, triangles: 0 };
      renderer.info.reset();
      const started = performance.now();
      try {
        draw();
      } finally {
        end();
        stack.length = 0;
        const done = current;
        current = null;
        if (done.hasWork) {
          done.at = started;
          done.cpu = performance.now() - started;
          done.state = stateOf();
          done.calls = renderer.info.render.calls;
          done.triangles = renderer.info.render.triangles;
          latest = done;
          drawnAt.push(started);
          pending.push(done);
          if (pending.length > MAX_PENDING) {
            const dropped = pending.shift();
            if (dropped) release(dropped);
          }
        }
        poll();
      }
    },
    dispose: () => {
      clearInterval(reporting);
      for (const frame of pending) release(frame);
      pending.length = 0;
      for (const query of pool) gl.deleteQuery(query);
      pool.length = 0;
    },
  };

  profiler.wrap(renderer, "render", "scene", true);
  profiler.wrap(shadowMap, "render", "shadows");
  return profiler;
};
