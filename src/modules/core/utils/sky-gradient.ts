/**
 * The sky in the footer as a CSS gradient: a palette for each height of the
 * sun, blended between, with the sun and its glow on top. Drawn where
 * WebGL2 isn't there, and as a variant of its own, see SKY in use-sky.ts.
 */

type Color = [number, number, number];

interface Palette {
  // Degrees of the sun above the horizon
  elevation: number;
  zenith: string;
  middle: string;
  horizon: string;
  // The light around the sun, and how strong it is
  glow: string;
  glowStrength: number;
}

const PALETTES: Palette[] = [
  // Night
  {
    elevation: -18,
    zenith: "#04060d",
    middle: "#070b18",
    horizon: "#0e1528",
    glow: "#0e1528",
    glowStrength: 0,
  },
  // Twilight, the last light low in the sky
  {
    elevation: -10,
    zenith: "#070c22",
    middle: "#111a40",
    horizon: "#26305e",
    glow: "#3a3a70",
    glowStrength: 0.5,
  },
  // Blue hour
  {
    elevation: -5,
    zenith: "#142250",
    middle: "#2e3f80",
    horizon: "#7b6fa6",
    glow: "#c07a90",
    glowStrength: 0.7,
  },
  // Sunrise and sunset
  {
    elevation: -1,
    zenith: "#243f80",
    middle: "#5a6fae",
    horizon: "#e0917a",
    glow: "#ff7a45",
    glowStrength: 0.9,
  },
  // Golden hour
  {
    elevation: 3,
    zenith: "#3360a6",
    middle: "#7f9ccc",
    horizon: "#f2b88a",
    glow: "#ffa860",
    glowStrength: 0.8,
  },
  {
    elevation: 10,
    zenith: "#3a72c2",
    middle: "#86addf",
    horizon: "#e9d6bc",
    glow: "#ffd590",
    glowStrength: 0.6,
  },
  // Day
  {
    elevation: 25,
    zenith: "#2d6ccc",
    middle: "#67a0e4",
    horizon: "#bcd8f2",
    glow: "#fff1d6",
    glowStrength: 0.5,
  },
  {
    elevation: 60,
    zenith: "#2463c8",
    middle: "#5895e2",
    horizon: "#b4d3f2",
    glow: "#ffffff",
    glowStrength: 0.4,
  },
];

const parse = (hex: string): Color => [
  Number.parseInt(hex.slice(1, 3), 16),
  Number.parseInt(hex.slice(3, 5), 16),
  Number.parseInt(hex.slice(5, 7), 16),
];

const mix = (a: Color, b: Color, t: number): Color => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

const css = ([r, g, b]: Color, alpha = 1) =>
  `rgb(${Math.round(r)} ${Math.round(g)} ${Math.round(b)} / ${alpha})`;

const WHITE: Color = [255, 255, 255];

// The sun's radius, in pixels
const SUN_SIZE = 22;

// Cloud greys the sky: a color pulled toward a grey as bright as itself, by
// how much of the sky is covered
const grey = (color: Color, cover: number): Color => {
  const light = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2];
  return mix(color, [light, light, light], cover * 0.85);
};

/**
 * The background for a sun at an elevation and across the width (0 to 1),
 * over `span` degrees of sky from the bottom edge up, under this much cloud
 * (0 to 1).
 */
export const skyGradient = (
  elevation: number,
  sunX: number,
  span: number,
  cover = 0,
) => {
  const next = PALETTES.findIndex((palette) => palette.elevation > elevation);
  const from = PALETTES[Math.max(0, (next === -1 ? PALETTES.length : next) - 1)];
  const to = PALETTES[next === -1 ? PALETTES.length - 1 : next];
  const share =
    from === to
      ? 0
      : (elevation - from.elevation) / (to.elevation - from.elevation);
  const t = share * share * (3 - 2 * share);

  const blend = (key: "zenith" | "middle" | "horizon" | "glow") =>
    grey(mix(parse(from[key]), parse(to[key]), t), cover);
  const glow = blend("glow");
  const glowStrength =
    (from.glowStrength + (to.glowStrength - from.glowStrength) * t) *
    (1 - cover);

  const x = `${(sunX * 100).toFixed(2)}%`;
  const y = `${(100 - (elevation / span) * 100).toFixed(2)}%`;
  const layers = [];

  // The sun shows through little cloud
  if (elevation > -1 && cover < 0.5) {
    layers.push(
      `radial-gradient(circle ${SUN_SIZE}px at ${x} ${y}, ${css(mix(glow, WHITE, 0.6))} 90%, transparent)`,
    );
  }
  layers.push(
    `radial-gradient(ellipse 70% 90% at ${x} ${y}, ${css(glow, glowStrength)}, transparent)`,
    `linear-gradient(to top, ${css(blend("horizon"))}, ${css(blend("middle"))} 45%, ${css(blend("zenith"))})`,
  );
  return layers.join(", ");
};
