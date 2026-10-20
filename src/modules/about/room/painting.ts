
export const random = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const PERM = (() => {
  const next = random(3);
  const table = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [table[i], table[j]] = [table[j], table[i]];
  }
  return [...table, ...table];
})();

const lattice = (x: number, y: number) => PERM[(PERM[x & 255] + y) & 255] / 255;
const smooth = (t: number) => t * t * (3 - 2 * t);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const noise = (x: number, y: number) => {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const u = smooth(x - xi);
  const v = smooth(y - yi);
  return lerp(
    lerp(lattice(xi, yi), lattice(xi + 1, yi), u),
    lerp(lattice(xi, yi + 1), lattice(xi + 1, yi + 1), u),
    v,
  );
};

export const fbm = (x: number, y: number, period: number, octaves: number) => {
  let sum = 0;
  let amplitude = 1;
  let frequency = period;
  let total = 0;
  for (let octave = 0; octave < octaves; octave++) {
    sum += amplitude * noise(x * frequency, y * frequency);
    total += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / total;
};

export const ridged = (x: number, y: number, period: number, octaves: number) =>
  1 - Math.abs(2 * fbm(x, y, period, octaves) - 1);

export type RGB = [number, number, number];

export const hex = (color: string): RGB => [
  Number.parseInt(color.slice(1, 3), 16),
  Number.parseInt(color.slice(3, 5), 16),
  Number.parseInt(color.slice(5, 7), 16),
];

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

const grey = (tone: number): RGB => {
  const value = Math.round(Math.max(0, Math.min(1, tone)) * 255);
  return [value, value, value];
};

export type SurfaceName =
  | "plaster"
  | "fabric"
  | "linen"
  | "leather"
  | "walnut"
  | "planks"
  | "spruce"
  | "sunburst"
  | "rug";

interface Pixel {
  color: RGB;
  bump: number;
}

interface Recipe {
  size: number;
  flat: string;
  pixel: () => (u: number, v: number) => Pixel;
}

const plaster: Recipe = {
  size: 1024,
  flat: "#f0f0f0",
  pixel: () => (u, v) => {
    const cloud = fbm(u, v, 4, 5);
    const streak = fbm(u, v * 12, 2, 3);
    return {
      color: grey(0.94 + 0.2 * (cloud - 0.5) + 0.1 * (streak - 0.5)),
      bump: 0.5 + 0.35 * (cloud - 0.5) + 0.2 * (streak - 0.5),
    };
  },
};

const walnut: Recipe = {
  size: 1024,
  flat: "#6a4325",
  pixel: () => {
    const a = hex("#4a2c16");
    const b = hex("#8a5a33");
    return (u, v) => {
      const wobble = fbm(u, v, 2, 3) * 5 + fbm(u, v, 16, 2) * 0.8;
      const grain = 0.5 + 0.5 * Math.sin((v * 26 + wobble) * Math.PI * 2);
      const sharp = grain ** 2.2;
      const fine = fbm(u, v, 64, 2);
      const tone = sharp * 0.75 + fine * 0.25;
      return {
        color: mix(a, b, tone),
        bump: 0.5 + 0.3 * (tone - 0.5),
      };
    };
  },
};

const planks: Recipe = {
  size: 1024,
  flat: "#5c3820",
  pixel: () => {
    const next = random(7);
    const plankWidth = 0.065;
    const plankLength = 0.55;
    const shifts = Array.from({ length: Math.ceil(1 / plankWidth) + 1 }, () => next() * plankLength);
    const tones = Array.from({ length: 64 }, () => 0.75 + next() * 0.5);
    const dark = hex("#3a2214");
    const light = hex("#7d4e2c");
    return (u, v) => {
      const column = Math.floor(u / plankWidth);
      const along = (v + shifts[column]) / plankLength;
      const row = Math.floor(along);
      const plank = tones[(column * 7 + row * 13) % tones.length];
      const acrossPlank = (u / plankWidth) % 1;
      const alongPlank = along % 1;
      const gap = acrossPlank < 0.03 || acrossPlank > 0.97 || alongPlank < 0.006 || alongPlank > 0.994;
      const wobble = fbm(u + row * 0.37, v, 4, 3) * 4;
      const grain = 0.5 + 0.5 * Math.sin((acrossPlank * 9 + wobble) * Math.PI * 2);
      const tone = gap ? 0 : plank * (0.65 + 0.35 * grain ** 1.6) * 0.8;
      return {
        color: mix(dark, light, Math.min(1, tone)),
        bump: gap ? 0.2 : 0.5 + 0.2 * (grain - 0.5),
      };
    };
  },
};

const spruce: Recipe = {
  size: 512,
  flat: "#d6ac62",
  pixel: () => {
    const a = hex("#c89a52");
    const b = hex("#e8c278");
    return (u, v) => {
      const wobble = fbm(u, v, 2, 2) * 1.5;
      const grain = 0.5 + 0.5 * Math.sin((u * 90 + wobble) * Math.PI * 2);
      const shade = 1 - 0.25 * Math.hypot(u - 0.5, v - 0.5) * 2;
      return {
        color: mix(a, b, grain * 0.6 + 0.2).map((c) => c * shade) as RGB,
        bump: 0.5 + 0.15 * (grain - 0.5),
      };
    };
  },
};

const sunburst: Recipe = {
  size: 512,
  flat: "#a85a24",
  pixel: () => {
    const middle = hex("#d4913c");
    const ring = hex("#9a4a1c");
    const edge = hex("#3a1a0c");
    return (u, v) => {
      const d = Math.hypot((u - 0.5) * 1.1, (v - 0.5) * 0.9) * 2;
      const burst = d < 0.55 ? mix(middle, ring, d / 0.55) : mix(ring, edge, Math.min(1, (d - 0.55) / 0.4));
      const grain = 0.5 + 0.5 * Math.sin((u * 80 + fbm(u, v, 2, 2) * 2) * Math.PI * 2);
      return {
        color: burst.map((c) => c * (0.92 + 0.12 * grain)) as RGB,
        bump: 0.5 + 0.1 * (grain - 0.5),
      };
    };
  },
};

const fabric: Recipe = {
  size: 1024,
  flat: "#f2f2f2",
  pixel: () => (u, v) => {
    const drift = fbm(u, v, 4, 3);
    const fibre = fbm(u, v, 64, 2);
    return {
      color: grey(0.95 + 0.08 * (drift - 0.5) + 0.05 * (fibre - 0.5)),
      bump: 0.5 + 0.1 * (drift - 0.5) + 0.12 * (fibre - 0.5),
    };
  },
};

const rug: Recipe = {
  size: 1024,
  flat: "#3d5a46",
  pixel: () => {
    const a = hex("#2f4a3a");
    const b = hex("#4b6a52");
    const c = hex("#b9a37a");
    return (u, v) => {
      const dx = u - 0.5;
      const dy = v - 0.5;
      const d = Math.hypot(dx, dy) * 2;
      const angle = Math.atan2(dy, dx);
      const rings = Math.floor(d * 16) % 2;
      const woven = Math.sin(u * 160) * Math.sin(v * 160) > 0.3 ? 1 : 0;
      const fibre = fbm(u, v, 128, 2);
      const fringe = d > 0.92 ? 0.5 + 0.5 * Math.sin(angle * 160) : 0;
      const tone = rings * 0.7 + woven * 0.2 + (fibre - 0.5) * 0.4;
      const weave = mix(a, b, Math.max(0, Math.min(1, tone)));
      return {
        color: d > 0.92 ? mix(weave, c, 0.5 + 0.5 * fringe) : weave,
        bump: 0.5 + 0.25 * (fibre - 0.5) + 0.1 * woven + 0.15 * fringe,
      };
    };
  },
};

const leather: Recipe = {
  size: 512,
  flat: "#cccccc",
  pixel: () => (u, v) => {
    const pebble = fbm(u, v, 48, 3);
    return {
      color: grey(0.6 + 0.4 * pebble),
      bump: 0.5 + 0.4 * (pebble - 0.5),
    };
  },
};

const linen: Recipe = {
  size: 512,
  flat: "#fafafa",
  pixel: () => (u, v) => {
    const crease = ridged(u, v, 2, 3) ** 4;
    const fibre = fbm(u, v, 64, 2);
    return {
      color: grey(1 - 0.08 * crease - 0.03 * (fibre - 0.5)),
      bump: 0.5 + 0.2 * (crease - 0.3) + 0.08 * (fibre - 0.5),
    };
  },
};

export const RECIPES: Record<SurfaceName, Recipe> = {
  plaster,
  fabric,
  linen,
  leather,
  walnut,
  planks,
  spruce,
  sunburst,
  rug,
};

export const SURFACE_NAMES = Object.keys(RECIPES) as SurfaceName[];

export interface Painted {
  name: SurfaceName;
  color: Uint8ClampedArray<ArrayBuffer>;
  bump: Uint8ClampedArray<ArrayBuffer>;
}

export const paintSurface = (name: SurfaceName): Painted => {
  const { size, pixel } = RECIPES[name];
  const paint = pixel();
  const color = new Uint8ClampedArray(size * size * 4);
  const bump = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const at = (y * size + x) * 4;
      const result = paint(x / size, y / size);
      color[at] = result.color[0];
      color[at + 1] = result.color[1];
      color[at + 2] = result.color[2];
      color[at + 3] = 255;
      const relief = Math.max(0, Math.min(255, Math.round(result.bump * 255)));
      bump[at] = relief;
      bump[at + 1] = relief;
      bump[at + 2] = relief;
      bump[at + 3] = 255;
    }
  }
  return { name, color, bump };
};
