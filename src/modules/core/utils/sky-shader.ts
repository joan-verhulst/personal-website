import {
  buildProgram,
  checkProgram,
  deleteProgram,
  releaseLater,
  whenLinked,
} from "~/modules/core/utils/gl-program";
import { sunTransmittance } from "~/modules/core/utils/sky-light";
import type { CloudLook, SkyWeather } from "~/modules/core/utils/weather";

/**
 * The sky in the footer as a shader: sunlight scattered through the
 * atmosphere, after Maxime Heckel's "On Rendering the Sky, Sunsets, and
 * Planets". Each pixel marches its view ray through the air and, from each
 * step, a ray toward the sun. Blue scatters most, so a long way through the
 * air at sunrise and sunset leaves the reds. Haze (Mie) makes the glow
 * around the sun, ozone the purple of the blue hour. Below the horizon the
 * light fades into a night sky with stars. The sun itself isn't drawn, only
 * its light.
 *
 * The clouds are one layer of noise on a shell around the planet, at the
 * height of the weather's clouds, lit by that same sunlight: what comes
 * down through them, white where they're thin and grey where they're
 * thick; the skylight that bounces onto their undersides; and a low sun
 * reaching under them, only through gaps. So an unbroken deck at sunset
 * stays grey, and broken cumulus glow orange underneath. At night the
 * city lights them from below. Toward the horizon the noise averages out
 * through the texture's own mip levels and the clouds merge into the haze,
 * instead of crowding into a band. Over everything a veil of high cloud
 * can hang, which the sun reaches first in the morning and last at night.
 *
 * Three passes a frame, at most. The scattering is costly and soft, so it's
 * drawn small and scaled up, and only again when the sun moves. The clouds
 * are drawn at a middling size as often as they drift. The stars, rain,
 * snow, lightning and glass are sharp, so they're drawn on top at the
 * screen's own resolution, with the other two scaled up under them.
 *
 * WebGL2 rather than WebGPU like the ink shader: it's in every browser, and
 * the sky has nothing it would gain from WebGPU.
 */

// Where lightning struck, for the flash that lights the cloud from inside
// and the bolt that sometimes shows under it
export interface Bolt {
  // Across the canvas, 0 to 1, and how high up it starts, 0 to 1
  x: number;
  top: number;
  // Picks the bolt's shape
  seed: number;
  // Whether the bolt itself shows, or only the flash in the cloud
  isVisible: boolean;
}

export interface SkyFrame {
  // Degrees above the horizon, negative below it
  sunElevation: number;
  // Where the sun stands across the width, 0 to 1
  sunX: number;
  // Degrees of sky from the bottom edge, the horizon, to the top
  span: number;
  // How far the stars have turned, in degrees
  starTurn: number;
  // Which sky, see utils/weather.ts
  weather: SkyWeather;
  // How far the wind has carried the clouds, in kilometers
  drift: [number, number];
  // Seconds the weather has been moving, for the rain, the snow and the
  // stars' twinkle
  time: number;
  // How bright a flash of lightning is now, 0 to 1, and where it struck
  flash: number;
  bolt: Bolt | null;
  // Canvas pixels to a CSS pixel
  pixelRatio: number;
}

// A rounded rectangle of glass over the sky, in canvas pixels from the
// bottom left corner
export interface GlassShape {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
  radius: number;
}

// How the clouds and the glass look. Which clouds there are comes from the
// weather. Lengths are in CSS pixels
export interface SkyParams {
  // The look of each sky, in the order of SKY_STATES in utils/weather.ts:
  // clear, partly cloudy, cloudy, rain, storm
  clouds: CloudLook[];

  // How far in from the glass's edge the rim slopes, and how thick it is
  rim: number;
  thickness: number;
  // How steep the rim is at the very edge, and how much the top bulges, so
  // the middle bends a little too
  slope: number;
  dome: number;
  // How strongly it bends light, and how far that pulls the colors apart.
  // Far more than real glass, which only shows it against sharp detail
  ior: number;
  dispersion: number;
  // How far apart the colors of the rim's reflection fall
  chroma: number;
  // The sky reflected toward the edge, the highlight from the top left and
  // how tight it is, and the light caught in the glass
  reflection: number;
  highlight: number;
  shine: number;
  milk: number;
}

export const SKY_DEFAULTS: SkyParams = {
  clouds: [
    // Clear: nothing but the veil, when there's high cloud
    {
      coverage: 0,
      scale: 1,
      height: 1,
      thickness: 4,
      billow: 0,
      ragged: 0,
      softness: 0.15,
      murk: 0,
      veil: 0.35,
      fall: 0,
    },
    // Partly cloudy: a high, thin, slightly heaped layer with sky between
    {
      coverage: 0.45,
      scale: 1,
      height: 2,
      thickness: 5,
      billow: 0.3,
      ragged: 0.5,
      softness: 0.15,
      murk: 0,
      veil: 0.3,
      fall: 0,
    },
    // Cloudy: a soft deck of stratus. The weather sets its coverage, see
    // skyWeather, this is for when there's none
    {
      coverage: 0.78,
      scale: 1,
      height: 0.8,
      thickness: 7,
      billow: 0,
      ragged: 0,
      softness: 0.2,
      murk: 0.1,
      veil: 0.4,
      fall: 0,
    },
    // Rain: a darker, lower deck closing the sky
    {
      coverage: 0.97,
      scale: 0.85,
      height: 0.6,
      thickness: 15,
      billow: 0,
      ragged: 0.4,
      softness: 0.15,
      murk: 0.5,
      veil: 0,
      fall: 0.6,
    },
    // Storm: the heaviest deck, low and churning
    {
      coverage: 1,
      scale: 0.8,
      height: 0.5,
      thickness: 30,
      billow: 0.2,
      ragged: 0.8,
      softness: 0.12,
      murk: 0.6,
      veil: 0,
      fall: 0.85,
    },
  ],
  rim: 5,
  thickness: 200,
  slope: 0.45,
  dome: 0.22,
  ior: 2.4,
  dispersion: 3,
  chroma: 0.5,
  reflection: 1.5,
  highlight: 0.7,
  shine: 64,
  milk: 0.04,
};

export interface DrawOptions {
  // Whether to draw the clouds again, or leave them as they are while only
  // the rain, the snow, the lightning or the glass moves
  clouds: boolean;
}

export interface SkyRenderer {
  /** Whether the shaders have compiled. Drawing before that does nothing. */
  isReady: () => boolean;
  /**
   * Draws the sky with clouds, rain or snow and glass over it. The costly
   * scattering is only drawn again when the sun or the size changed, so
   * everything else moving is cheap. True when it drew.
   */
  draw: (
    frame: SkyFrame,
    glass: GlassShape[],
    params: SkyParams,
    options: DrawOptions,
  ) => boolean;
  destroy: () => void;
}

const GLASS_UNIFORMS: Record<Exclude<keyof SkyParams, "clouds">, string> = {
  rim: "uRim",
  thickness: "uThickness",
  slope: "uSlope",
  dome: "uDome",
  ior: "uIor",
  dispersion: "uDispersion",
  chroma: "uChroma",
  reflection: "uReflection",
  highlight: "uHighlight",
  shine: "uShine",
  milk: "uMilk",
};

const LOOK_UNIFORMS: Record<keyof CloudLook, string> = {
  coverage: "uCoverage",
  scale: "uScale",
  height: "uHeight",
  thickness: "uDepth",
  billow: "uBillow",
  ragged: "uRagged",
  softness: "uSoftness",
  murk: "uMurk",
  veil: "uVeil",
  fall: "uFall",
};

// The glass shapes the shader takes, more are left out
export const MAX_GLASS = 4;

// How many pixels the scattering and the clouds draw at most
const SKY_BUDGET = 300_000;
const CLOUD_BUDGET = 800_000;

// The noise the clouds are shaped from is drawn once, this large, and tiles
const NOISE_SIZE = 512;

// How high the veil of thin cloud hangs, in kilometers
const VEIL_HEIGHT = 7;

// One triangle that covers the canvas, without any buffers
const VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const HASH = /* glsl */ `
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`;

/**
 * The noise the clouds are shaped from, drawn once into a texture that
 * tiles, so a cloud costs a few texture reads rather than dozens of hashes.
 * Red is a soft sheet of noise, green round heaps for cumulus, blue fine
 * detail and alpha small heaps with that detail, for cauliflower edges.
 * Each grid wraps at the tile's edge, so the texture repeats seamlessly.
 */
const NOISE_PASS = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uResolution;
out vec4 outColor;
${HASH}
// A cell of a grid with n cells across the tile, wrapped
float cellHash(vec2 cell, float n, float seed) {
  return hash(mod(cell, n) + vec2(seed, seed * 1.7));
}

float valueNoise(vec2 uv, float n, float seed) {
  vec2 p = uv * n;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(cellHash(cell, n, seed), cellHash(cell + vec2(1.0, 0.0), n, seed), u.x),
    mix(cellHash(cell + vec2(0.0, 1.0), n, seed), cellHash(cell + vec2(1.0, 1.0), n, seed), u.x),
    u.y
  );
}

// Layers of noise, each twice as fine and half as strong, scaled to 0 to 1
float fbm(vec2 uv, float n, int octaves, float seed) {
  float sum = 0.0;
  float amplitude = 0.5;
  float total = 0.0;
  for (int i = 0; i < octaves; i++) {
    sum += amplitude * valueNoise(uv, n, seed + float(i) * 7.1);
    total += amplitude;
    n *= 2.0;
    amplitude *= 0.5;
  }
  return sum / total;
}

// How far a point is from the nearest of a scatter of points, one in each
// cell of a grid with n cells across the tile
float worley(vec2 uv, float n, float seed) {
  vec2 p = uv * n;
  vec2 cell = floor(p);
  vec2 f = fract(p);
  float nearest = 2.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offset = vec2(float(x), float(y));
      vec2 point = vec2(
        cellHash(cell + offset, n, seed),
        cellHash(cell + offset, n, seed + 19.19)
      );
      nearest = min(nearest, length(offset + point - f));
    }
  }
  return nearest;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  float detail = fbm(uv, 32.0, 3, 11.0);
  outColor = vec4(
    fbm(uv, 4.0, 5, 0.0),
    1.0 - smoothstep(0.0, 0.95, worley(uv, 6.0, 3.3)),
    detail,
    0.6 * (1.0 - smoothstep(0.0, 0.9, worley(uv, 16.0, 5.5))) + 0.4 * detail
  );
}`;

// What every pass shares: where a pixel looks, and the air
const COMMON = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uRadiansPerPixel;
uniform float uSunElevation;
uniform float uSunX;
out vec4 outColor;

const float PI = 3.14159265;

// Kilometers. The viewer stands a little above the ground
const float EARTH = 6360.0;
const float ATMOSPHERE = 6460.0;
const float ALTITUDE = 0.5;

// Scattering per kilometer at sea level, and how fast the air thins out
const vec3 RAYLEIGH = vec3(0.0058, 0.0135, 0.0331);
const float RAYLEIGH_HEIGHT = 8.0;
const float MIE = 0.004;
const float MIE_EXTINCTION = 0.00444;
const float MIE_HEIGHT = 1.2;
const float MIE_G = 0.8;
// Ozone only absorbs, in a layer around 25km up
const vec3 OZONE = vec3(0.00065, 0.00188, 0.00008);

const float SUN_INTENSITY = 20.0;
const float EXPOSURE = 1.0;

// Where a ray from o along d meets a sphere around the planet's center, near
// and far. Both -1 when it misses
vec2 sphere(vec3 o, vec3 d, float radius) {
  float b = dot(o, d);
  float c = dot(o, o) - radius * radius;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

// Air, haze and ozone at a height
vec3 density(float height) {
  return vec3(
    exp(-height / RAYLEIGH_HEIGHT),
    exp(-height / MIE_HEIGHT),
    max(0.0, 1.0 - abs(height - 25.0) / 15.0)
  );
}

vec3 extinction(vec3 depth) {
  return RAYLEIGH * depth.x + MIE_EXTINCTION * depth.y + OZONE * depth.z;
}

// How much of a ray of light from a point toward the sun makes it through
vec3 sunlight(vec3 point, vec3 sun) {
  // In the planet's shadow
  if (sphere(point, sun, EARTH).x > 0.0) return vec3(0.0);
  float stride = sphere(point, sun, ATMOSPHERE).y / 6.0;
  vec3 depth = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    vec3 along = point + sun * (float(i) + 0.5) * stride;
    depth += density(length(along) - EARTH) * stride;
  }
  return exp(-extinction(depth));
}

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// Brighter as the sun goes down, the way eyes adjust, so the blue hour
// doesn't sink straight into black
float exposure() {
  return EXPOSURE * (1.0 + 3.0 * (1.0 - smoothstep(-0.1, 0.07, uSunElevation)));
}

// Light to the screen's colors
vec3 develop(vec3 light) {
  return pow(aces(light * exposure()), vec3(1.0 / 2.2));
}

// Where a point on the canvas looks. The bottom edge is the horizon, and
// sideways the sun stands at uSunX
float elevationAt(vec2 position) {
  return position.y * uRadiansPerPixel;
}

vec3 viewDirection(vec2 position) {
  float up = elevationAt(position);
  float around = (position.x - uSunX * uResolution.x) * uRadiansPerPixel;
  return vec3(cos(up) * sin(around), sin(up), cos(up) * cos(around));
}

vec3 sunDirection() {
  return vec3(0.0, sin(uSunElevation), cos(uSunElevation));
}
${HASH}`;

// The scattered light, drawn small
const SKY_PASS = /* glsl */ `${COMMON}
void main() {
  vec3 view = viewDirection(gl_FragCoord.xy);
  vec3 sun = sunDirection();
  vec3 origin = vec3(0.0, EARTH + ALTITUDE, 0.0);
  float far = sphere(origin, view, ATMOSPHERE).y;
  float ground = sphere(origin, view, EARTH).x;
  if (ground > 0.0) far = ground;

  float stride = far / 16.0;
  vec3 depth = vec3(0.0);
  vec3 rayleigh = vec3(0.0);
  vec3 mie = vec3(0.0);
  for (int i = 0; i < 16; i++) {
    vec3 point = origin + view * (float(i) + 0.5) * stride;
    vec3 local = density(length(point) - EARTH) * stride;
    depth += local;
    vec3 light = sunlight(point, sun) * exp(-extinction(depth));
    rayleigh += light * local.x;
    mie += light * local.y;
  }

  float mu = dot(view, sun);
  float rayleighPhase = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  float g2 = MIE_G * MIE_G;
  float miePhase = 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + mu * mu)) /
    ((2.0 + g2) * pow(1.0 + g2 - 2.0 * MIE_G * mu, 1.5));

  vec3 light = SUN_INTENSITY * (rayleigh * RAYLEIGH * rayleighPhase + mie * MIE * miePhase);
  outColor = vec4(develop(light), 1.0);
}`;

// What the passes after the scattering share: the night under it all, and
// the scattered light scaled up
const NIGHT = /* glsl */ `
uniform sampler2D uSky;

// How far into the night it is, set first thing in main
float night;

// The sky's smooth light at a point: the scattered light, and the night,
// lighter and a little warmer toward the horizon, where the city's glow is
vec3 skyAt(vec2 position) {
  vec3 color = texture(uSky, position / uResolution).rgb;
  if (night > 0.0) {
    color += night * mix(
      vec3(0.08, 0.09, 0.16),
      vec3(0.025, 0.035, 0.08),
      smoothstep(0.0, 0.7, position.y / uResolution.y)
    );
  }
  return color;
}

float nightAt(float sunElevation) {
  return 1.0 - smoothstep(-0.21, -0.05, sunElevation);
}
`;

/**
 * The clouds: a layer of noise on a shell at the weather's height, and the
 * veil of high cloud behind it. The noise's shape is cut at a threshold for
 * the coverage, with the noise's spread measured so the coverage comes out
 * as the share of the sky it says. Each pixel's thickness, from the shape,
 * sets how much light comes through and how much it hides. Its color is
 * premultiplied by how much it hides, so it scales up without dark edges.
 */
const CLOUD_PASS = /* glsl */ `${COMMON}${NIGHT}
uniform sampler2D uNoise;
// How far the wind has carried the clouds, in kilometers, and which way it
// blows, as a unit vector
uniform vec2 uDrift;
uniform vec2 uWind;
// The look, see CloudLook in utils/weather.ts
uniform float uCoverage;
uniform float uScale;
uniform float uHeight;
uniform float uDepth;
uniform float uBillow;
uniform float uRagged;
uniform float uSoftness;
uniform float uMurk;
uniform float uVeil;
// The sunlight that reaches the clouds' height and the veil's, see
// utils/sky-light.ts
uniform vec3 uSunT;
uniform vec3 uSunTVeil;

// Kilometers across one repeat of the noise at scale 1, for the clouds and
// for the veil's long streaks, and how high the veil hangs
const float TILE = 30.0;
// Where the viewer stands in the clouds' noise before the wind has carried
// them, in kilometers. The deck is measured against the patch it's under,
// see main, so any spot gives the coverage asked for: this is where the
// looks were tuned
const vec2 START = vec2(5.0, 16.0);
const float VEIL_TILE = 60.0;
const float VEIL_HEIGHT = ${VEIL_HEIGHT.toFixed(1)};

// Kilometers of air over which clouds merge into the haze
const float HAZE = 35.0;
const float VEIL_HAZE = 150.0;

// What the shapes' noise averages and how far it spreads, measured, for the
// sheet, the heaps and the veil, so a coverage can be turned into a threshold
const vec2 SHEET_STATS = vec2(0.563, 0.089);
const vec2 HEAPS_STATS = vec2(0.553, 0.135);
const vec2 VEIL_STATS = vec2(0.545, 0.1);

// The light. How fast the sun's light dies out with a cloud's thickness,
// the share of what comes through that reaches the eye, and the sky's own
// light on the layer's top, as a multiple of the zenith's
const float THROUGH = 0.2;
const float DOWN = 0.092;
const float SKY_TOP = 8.0;
// The skylight bounced onto the undersides, from the horizon and from
// above, how much a full cover dims it and greys it
const float AMBIENT_HORIZON = 0.25;
const float AMBIENT_UP = 0.7;
const float AMBIENT_DIM = 0.85;
const float AMBIENT_GREY = 0.6;
// A low sun reaching under the clouds through gaps, and onto the flanks of
// heaps, and the warm horizon glow near it
const float UNDER = 0.08;
const float SIDE = 0.15;
const float HORIZON_GLOW = 0.12;
// Forward scattering through thin cloud near the sun, and how fast it goes
// with thickness
const float LINING = 0.04;
const float LINING_DEPTH = 0.35;
// The towns' glow on the undersides at night
const vec3 CITY = vec3(0.02, 0.015, 0.01);

// The scattered light back to light, the way develop went
vec3 undevelop(vec3 color) {
  vec3 y = min(pow(color, vec3(2.2)), 0.98);
  vec3 a = 2.51 - 2.43 * y;
  vec3 b = 0.03 - 0.59 * y;
  vec3 c = -0.14 * y;
  return (-b + sqrt(max(b * b - 4.0 * a * c, 0.0))) / (2.0 * a) / exposure();
}

vec3 skyLight(vec2 uv) {
  return undevelop(texture(uSky, uv).rgb);
}

// The sky's light from above, from the horizon all round and from the
// horizon toward the sun
struct Lights {
  vec3 up;
  vec3 horizon;
  vec3 sunward;
};

/**
 * The light from a cloud's underside, for a thickness, which way its flank
 * faces (0.5 for flat), how open the sky is toward the sun (0 to 1), how
 * much of the sky the layer covers, how heaped it is, the sunlight at its
 * height, and the cosine between the view and the sun.
 */
vec3 cloudLight(
  float tau, float facing, float gap, float cover, float billow,
  vec3 sunT, float mu, Lights sky
) {
  float sinE = sin(uSunElevation);
  float cosE = cos(uSunElevation);
  float thin = exp(-THROUGH * tau);

  // The sun and the sky on the top, diffused down through the cloud. The
  // sun on a heap's flank brightens the side it faces
  vec3 top = sunT * SUN_INTENSITY * max(sinE, 0.0) + sky.up * SKY_TOP;
  vec3 down = top * thin * DOWN * mix(1.0 - 0.3 * billow, 1.0 + 0.3 * billow, facing);

  // Skylight bounced onto the base. Under a full cover there's little of
  // it, and it's grey: the warm horizon is behind the cloud. Thick bases
  // sit in their own shadow
  vec3 ambient = (sky.horizon * AMBIENT_HORIZON + sky.up * AMBIENT_UP)
    * (1.0 - cover * AMBIENT_DIM)
    * (1.0 - thin * 0.5)
    * (1.0 - 0.5 * smoothstep(10.0, 30.0, tau));
  float grey = dot(ambient, vec3(0.2126, 0.7152, 0.0722));
  ambient = mix(ambient, grey * vec3(0.9, 0.97, 1.1), cover * AMBIENT_GREY);

  // A low sun under the clouds, through gaps toward it, and on the flanks
  float underlit = 1.0 - smoothstep(-0.03, 0.17, sinE);
  vec3 under = sunT * SUN_INTENSITY * underlit * gap * UNDER
    * mix(0.6, 1.4, facing) * (1.0 - thin * 0.5);
  vec3 side = sunT * SUN_INTENSITY * max(cosE, 0.0) * sqrt(max(sinE, 0.0))
    * max(facing - 0.5, 0.0) * 2.0 * billow * SIDE * (1.0 - thin) * gap;
  vec3 glow = sky.sunward * HORIZON_GLOW * gap * (1.0 - thin * 0.5);

  // The sun through thin cloud, brightest looking toward it
  float g = 0.7;
  float g2 = g * g;
  float phase = 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + mu * mu))
    / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
  vec3 lining = sunT * SUN_INTENSITY * phase * exp(-tau * LINING_DEPTH) * LINING;

  // The city, from dusk on
  float dusk = 1.0 - smoothstep(-0.14, -0.02, uSunElevation);
  vec3 city = CITY * dusk * (1.0 - thin);

  return down + ambient + under + side + glow + lining + city;
}

// The amount above which a shape covers this much of the sky. The noise is
// near enough to a bell curve, so this is that curve turned around
float threshold(float coverage, vec2 stats) {
  float share = clamp(coverage, 0.02, 0.98);
  return stats.x + stats.y * log((1.0 - share) / share) / 1.7;
}

// How far ahead of the viewer the middle of the view lies, in kilometers,
// and the level of the noise's mips that averages it over about as much
// around that: what the deck's density is measured against, see main
const float AHEAD = 1.0;
const float LOCAL_LOD = 6.0;

// A read of the noise: as the pixel sees it, with a level below zero, or
// from the level of its mips that averages it over a wide area, for the
// mean around a point
vec4 noiseAt(vec2 t, float lod) {
  return lod < 0.0 ? texture(uNoise, t) : textureLod(uNoise, t, lod);
}

// The level for a read at this many times the scale, so it averages over
// the same area
float finer(float lod, float times) {
  return lod < 0.0 ? lod : lod + log2(times);
}

// The shapes, at a point in tiles. A soft sheet of two scales of noise, the
// way stratus hangs, and heaps gathered in groups for cumulus
float sheetAt(vec2 t, float lod) {
  vec2 r = mat2(0.8, 0.6, -0.6, 0.8) * t * 5.0 + vec2(0.37, 0.71);
  return noiseAt(t, lod).r * 0.6 + noiseAt(r, finer(lod, 5.0)).r * 0.4;
}

float heapsAt(vec2 t, float lod) {
  return noiseAt(t * 0.6, finer(lod, 0.6)).r * 0.45
    + noiseAt(t * 3.0, finer(lod, 3.0)).g * 0.45
    + noiseAt(t * 6.0, finer(lod, 6.0)).a * 0.1;
}

float shapeAt(vec2 t, float lod) {
  float shape = sheetAt(t, lod);
  if (uBillow > 0.0) shape = mix(shape, heapsAt(t, lod), uBillow);
  if (uRagged > 0.0) {
    shape += uRagged * 0.25 * (noiseAt(t * 4.0 + 0.5, finer(lod, 4.0)).b - 0.5);
  }
  return shape;
}

// Near enough to the shape, cheaper, for looking toward the sun
float quickShapeAt(vec2 t) {
  float shape = texture(uNoise, t).r * 0.6 + 0.4 * SHEET_STATS.x;
  if (uBillow > 0.0) {
    float heaps = texture(uNoise, t * 0.6).r * 0.45
      + texture(uNoise, t * 3.0).g * 0.45
      + 0.1 * 0.52;
    shape = mix(shape, heaps, uBillow);
  }
  return shape;
}

// How open the sky is at a point of the layer
float gapAt(vec2 t, float edge, float soft) {
  return 1.0 - smoothstep(edge - soft, edge + soft, quickShapeAt(t));
}

void main() {
  vec2 position = gl_FragCoord.xy;
  night = nightAt(uSunElevation);
  outColor = vec4(0.0);
  if (uCoverage <= 0.0 && uVeil <= 0.0) return;

  Lights sky;
  sky.up = skyLight(vec2(0.5, 0.95));
  sky.horizon = 0.5 * (skyLight(vec2(0.08, 0.04)) + skyLight(vec2(0.92, 0.04)));
  sky.sunward = skyLight(vec2(uSunX, 0.04));

  // Where this pixel looks, straight ahead being south, and toward the sun
  // from there
  float up = max(elevationAt(position), 0.0005);
  float around = (position.x - 0.5 * uResolution.x) * uRadiansPerPixel;
  vec3 dir = vec3(cos(up) * sin(around), sin(up), cos(up) * cos(around));
  vec3 origin = vec3(0.0, EARTH + ALTITUDE, 0.0);
  float mu = dot(viewDirection(position), sunDirection());
  float sunAround = (uSunX - 0.5) * uResolution.x * uRadiansPerPixel;
  vec2 toSun = vec2(sin(sunAround), cos(sunAround));
  vec3 behind = skyAt(position);
  // How open the sky is as a whole: a full cover leaves no way in for a
  // low sun
  float open = 1.0 - smoothstep(0.55, 1.0, uCoverage);

  // The veil: thin, high, streaked along the wind, and far behind the clouds
  vec4 veil = vec4(0.0);
  if (uVeil > 0.0) {
    float away = sphere(origin, dir, EARTH + VEIL_HEIGHT).y;
    vec2 ground = (origin + dir * away).xz - uDrift * 2.5;
    vec2 across = vec2(-uWind.y, uWind.x);
    vec2 t = vec2(dot(ground, uWind) * 0.35, dot(ground, across)) / VEIL_TILE;
    float shape = texture(uNoise, t).r * 0.7 + texture(uNoise, t * 3.0 + 0.3).b * 0.3;
    float edge = threshold(uVeil, VEIL_STATS);
    float mask = smoothstep(edge - 0.15, edge + 0.15, shape);
    float tau = 0.2 + 1.2 * smoothstep(edge, edge + 0.3, shape);
    vec3 color = develop(cloudLight(tau, 0.5, 1.0 - uCoverage * 0.5, uVeil * 0.3, 0.0, uSunTVeil, mu, sky));
    float alpha = mask * (1.0 - exp(-tau));
    float far = 1.0 - exp(-away / VEIL_HAZE);
    color = mix(color, behind, far);
    alpha *= 1.0 - far * 0.7;
    veil = vec4(color * alpha, alpha);
  }

  vec4 cloud = vec4(0.0);
  if (uCoverage > 0.0) {
    // Where the view meets the layer. Toward the horizon that's far away,
    // where the noise averages out into its mean
    float away = sphere(origin, dir, EARTH + uHeight).y;
    vec2 ground = (origin + dir * away).xz;
    float tile = TILE * uScale;
    vec2 t = (ground - uDrift - START) / tile;

    float shape = shapeAt(t, -1.0);
    vec2 stats = mix(SHEET_STATS, HEAPS_STATS, uBillow);
    // The threshold is for the whole tile, and the patch under the viewer
    // can run far thinner or thicker than that. Measured against the
    // shape's mean over the view instead, from the noise's mips, the deck
    // is as dense as its coverage says wherever the wind has carried it
    vec2 middle = (vec2(0.0, AHEAD) - uDrift - START) / tile;
    float shift = shapeAt(middle, LOCAL_LOD) - stats.x;
    float edge = threshold(uCoverage, stats) + shift;
    float soft = uSoftness * 0.5;
    // A full cover closes up, whatever the noise
    float mask = mix(
      smoothstep(edge - soft, edge + soft, shape),
      1.0,
      smoothstep(0.92, 1.0, uCoverage)
    );
    float core = smoothstep(edge, edge + 0.3, shape);
    float tau = uDepth * mix(0.3, 1.0, core);

    // Heaps are lit on the side toward the sun: where the cloud thins out
    // that way, this is that side. Flat sheets face nowhere
    float facing = 0.5;
    if (uBillow > 0.0) {
      float ahead = shapeAt(t + toSun * (0.35 / tile), -1.0);
      facing = clamp(0.5 + (shape - ahead) * 6.0 * cos(uSunElevation) * uBillow, 0.0, 1.0);
    }
    // Whether a low sun can reach this underside: open sky a way toward it
    float gap = gapAt(t + toSun * (1.5 / tile), edge, soft)
      * gapAt(t + toSun * (4.0 / tile), edge, soft)
      * open;

    vec3 color = develop(cloudLight(tau, facing, gap, uCoverage, uBillow, uSunT, mu, sky));
    float alpha = mask * (1.0 - exp(-tau));

    // Far off, the clouds merge into the air, which carries the sky's light
    // and the deck's, as much as it covers. Toward the horizon rain and
    // mist thicken that air into murk
    float far = 1.0 - exp(-away / HAZE);
    vec3 deck = develop(cloudLight(uDepth * 0.6, 0.5, 0.3 * open, uCoverage, uBillow, uSunT, mu, sky));
    vec3 air = mix(behind, deck, uCoverage * 0.85);
    color = mix(color, air, far);
    alpha = mix(alpha, uCoverage, far);
    float murk = uMurk * (1.0 - smoothstep(0.0, 0.35, up));
    color = mix(color, air, murk);
    alpha = mix(alpha, 1.0, murk);
    cloud = vec4(color * alpha, alpha);
  }

  outColor = cloud + veil * (1.0 - cloud.a);
}`;

// The sky and the clouds scaled up, with the stars, rain, snow and
// lightning at full size, and the glass over it
const COMPOSE_PASS = /* glsl */ `${COMMON}${NIGHT}
uniform sampler2D uClouds;
uniform float uStarTurn;
uniform float uPixelRatio;
// What falls, 0 nothing, 1 rain, 2 snow, how much of it, 0 to 1, how far
// the wind leans it, and how long the weather has been moving, in seconds
uniform int uFalling;
uniform float uFall;
uniform float uLean;
uniform float uTime;
// A flash of lightning, 0 to 1, where it struck across and how high up,
// 0 to 1, which bolt it is, and whether the bolt shows
uniform float uFlash;
uniform vec3 uBolt;
uniform float uBoltOn;
// Each glass shape: its center and half its size in canvas pixels, and its
// corner radius
uniform vec4 uGlass[${MAX_GLASS}];
uniform float uGlassRadius[${MAX_GLASS}];
uniform int uGlassCount;

// How the glass looks, see SkyParams
uniform float uRim;
uniform float uThickness;
uniform float uSlope;
uniform float uDome;
uniform float uIor;
uniform float uDispersion;
uniform float uChroma;
uniform float uReflection;
uniform float uHighlight;
uniform float uShine;
uniform float uMilk;

const vec3 LIGHT = vec3(-0.55, 0.55, 0.63);

// One star at most in each cell of a grid over the whole turn of the sky,
// in degrees, most of them faint
const float STAR_CELL = 1.2;

float stars(vec2 position) {
  vec2 cell = floor(position / STAR_CELL);
  cell.x = mod(cell.x, 360.0 / STAR_CELL);
  if (hash(cell) > 0.12) return 0.0;
  vec2 center = vec2(hash(cell + 17.1), hash(cell + 31.7)) * 0.8 + 0.1;
  vec2 offset = (fract(position / STAR_CELL) - center) * STAR_CELL;
  // In CSS pixels, so they're the same size on every screen
  float pixels = length(offset) / degrees(uRadiansPerPixel) / uPixelRatio;
  float brightness = 0.3 + 0.7 * pow(hash(cell + 5.3), 6.0);
  // A slow twinkle, each its own
  brightness *= 0.8 + 0.2 * sin(uTime * (1.0 + 2.0 * hash(cell + 9.1)) + hash(cell + 2.2) * 6.2832);
  return (1.0 - smoothstep(0.3, 1.2, pixels)) * brightness;
}

// The stars' light at a point, at night
float starsAt(vec2 position) {
  if (night <= 0.0) return 0.0;
  float up = degrees(elevationAt(position));
  vec2 starDegrees = vec2(
    (position.x - 0.5 * uResolution.x) * degrees(uRadiansPerPixel) - uStarTurn,
    up
  );
  return night * stars(starDegrees) * smoothstep(1.0, 10.0, up);
}

vec4 cloudsAt(vec2 position) {
  return texture(uClouds, position / uResolution);
}

// Rain: streaks in three depths, the nearer ones larger, faster and
// fainter, one at most in each cell of a grid that falls past, each its
// own length and weight
float rainAt(vec2 position) {
  vec2 css = position / uPixelRatio;
  float rain = 0.0;
  for (int i = 0; i < 3; i++) {
    float depth = float(i);
    float scale = 1.0 + depth * 0.6;
    vec2 p = css / scale;
    // Leaning with the wind, and falling
    p.x += p.y * uLean;
    p.y += uTime * 900.0;
    vec2 cellSize = vec2(14.0, 90.0);
    vec2 cell = floor(p / cellSize);
    if (hash(cell + depth * 17.0) > uFall * 0.6) continue;
    vec2 local = fract(p / cellSize);
    float across = abs(local.x - (hash(cell + depth * 31.0) * 0.8 + 0.1)) * cellSize.x;
    float tail = 0.5 + 0.4 * hash(cell + depth * 53.0);
    float streak = (1.0 - smoothstep(0.3, 1.0, across))
      * smoothstep(0.1, tail, local.y)
      * (1.0 - smoothstep(0.7, 0.9, local.y));
    rain += streak * (0.35 - depth * 0.08) * (0.6 + 0.4 * hash(cell + depth * 71.0));
  }
  return rain;
}

// Snow: flakes in three depths, the nearer ones larger and faster, each
// its own size, swaying as they fall
float snowAt(vec2 position) {
  vec2 css = position / uPixelRatio;
  float snow = 0.0;
  for (int i = 0; i < 3; i++) {
    float depth = float(i);
    float scale = 1.0 + depth * 0.8;
    vec2 p = css / scale;
    p.y += uTime * (45.0 + depth * 25.0);
    p.x += p.y * uLean * 0.5 + sin(uTime * 0.8 + p.y * 0.02 + depth * 2.1) * 6.0;
    vec2 cellSize = vec2(40.0);
    vec2 cell = floor(p / cellSize);
    if (hash(cell + depth * 17.0) > uFall * 0.8) continue;
    vec2 local = fract(p / cellSize);
    vec2 center = vec2(hash(cell + depth * 31.0), hash(cell + depth * 47.0)) * 0.8 + 0.1;
    float size = 1.0 + 1.2 * hash(cell + depth * 59.0);
    float pixels = length((local - center) * cellSize);
    snow += (1.0 - smoothstep(0.4 * size, 1.3 * size, pixels)) * (0.9 - depth * 0.2);
  }
  return snow;
}

// How much rain or snow is in front of a point, 0 to 1
float fallAt(vec2 position) {
  if (uFall <= 0.0) return 0.0;
  if (uFalling == 1) return clamp(rainAt(position), 0.0, 1.0);
  if (uFalling == 2) return clamp(snowAt(position), 0.0, 1.0);
  return 0.0;
}

// Rain is grey and see-through, snow white. Both dim at night
vec3 fallColor() {
  vec3 day = uFalling == 2 ? vec3(0.95) : vec3(0.7, 0.74, 0.8);
  return mix(day, vec3(0.3, 0.32, 0.36), night);
}

float noise1(float x, float seed) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash(vec2(i, seed)), hash(vec2(i + 1.0, seed)), u);
}

// The bolt: a jagged line down from where the lightning struck, thin and
// bright with a soft glow, fading out before the ground. Only while the
// flash lasts, and only for some strikes
float boltAt(vec2 position) {
  if (uBoltOn < 0.5 || uFlash <= 0.0) return 0.0;
  float top = uBolt.y * uResolution.y;
  if (position.y > top) return 0.0;
  // 0 at the cloud, 1 at the horizon
  float down = 1.0 - position.y / top;
  float x = uBolt.x * uResolution.x
    + (noise1(down * 6.0, uBolt.z) - 0.5) * 0.14 * uResolution.x
    + (noise1(down * 24.0, uBolt.z + 7.0) - 0.5) * 0.035 * uResolution.x;
  float pixels = abs(position.x - x) / uPixelRatio;
  float core = 1.0 - smoothstep(0.5, 1.6, pixels);
  float halo = exp(-pixels / 18.0) * 0.4;
  float reach = 1.0 - smoothstep(0.75, 1.0, down);
  return (core + halo) * reach * min(uFlash * 3.0, 1.0);
}

// The sky at a point on the canvas, with the clouds and the stars behind
// them, and rain or snow and lightning in front
vec3 scene(vec2 position) {
  vec4 cloud = cloudsAt(position);
  vec3 color = (skyAt(position) + starsAt(position)) * (1.0 - cloud.a) + cloud.rgb;
  color = mix(color, fallColor(), fallAt(position));
  return color + boltAt(position) * vec3(0.85, 0.9, 1.0);
}

// How far a point is outside a rounded rectangle around the origin,
// negative inside it
float roundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

// Which way the glass faces, a distance in from its edge. The rim slopes
// down most steeply at the edge and eases into the flat top
vec3 surface(float gap, float rim, vec2 outward, vec2 dome) {
  float edge = 1.0 - clamp(-gap / rim, 0.0, 1.0);
  float tilt = uSlope * edge * edge;
  return normalize(vec3(outward * tilt + dome, 1.0));
}

// The light the glass throws back, a distance in from its edge: the sky,
// more toward the edge, and a highlight from the top left
float sheen(float gap, float rim, vec2 outward, vec2 dome) {
  vec3 normal = surface(gap, rim, outward, dome);
  float reflection = pow(1.0 - normal.z, 1.5) * uReflection;
  float highlight = pow(max(reflect(-normalize(LIGHT), normal).z, 0.0), uShine) * uHighlight;
  return reflection + highlight;
}

/**
 * A slab of glass over the sky, seen from straight above. Its top is flat
 * and its rim slopes down to the edge, so a ray through the top goes
 * straight on and one through the rim bends toward the middle. Each color
 * bends a little differently, so the clouds, stars, rain, snow and
 * lightning split into color as they pass behind it. The sky's smooth
 * light bends as one color: split, its gradient would tint the glass with
 * nothing behind it.
 */
vec3 glass(vec3 behind, vec2 position, vec2 center, vec2 halfSize, float radius) {
  vec2 local = position - center;
  float gap = roundedBox(local, halfSize, radius);
  if (gap > uPixelRatio) return behind;

  // Out, along the slope of the distance. Nothing on the flat top
  vec2 slope = vec2(
    roundedBox(local + vec2(1.0, 0.0), halfSize, radius) - roundedBox(local - vec2(1.0, 0.0), halfSize, radius),
    roundedBox(local + vec2(0.0, 1.0), halfSize, radius) - roundedBox(local - vec2(0.0, 1.0), halfSize, radius)
  );
  vec2 outward = length(slope) > 0.0 ? normalize(slope) : vec2(0.0);

  float rim = max(min(uRim * uPixelRatio, min(halfSize.x, halfSize.y)), 1.0);
  vec2 dome = uDome * local / max(halfSize.x, halfSize.y);
  vec3 normal = surface(gap, rim, outward, dome);
  // Thin at the very edge, so what shows through doesn't jump there
  float thickness = uThickness * uPixelRatio * smoothstep(0.0, 0.5, -gap / rim);

  // The sky's light, bent once
  vec3 ray = refract(vec3(0.0, 0.0, -1.0), normal, 1.0 / uIor);
  vec3 color = skyAt(position + ray.xy / max(-ray.z, 0.1) * thickness);

  // The clouds, stars, rain, snow and lightning in six wavelengths, red
  // bent least and blue most, blended back into color
  vec3 cover = vec3(0.0);
  vec3 clouds = vec3(0.0);
  vec3 starlight = vec3(0.0);
  vec3 falling = vec3(0.0);
  vec3 bolt = vec3(0.0);
  for (int i = 0; i < 6; i++) {
    float t = float(i) / 5.0;
    float ior = max(uIor + uDispersion * (t - 0.5), 1.0);
    vec3 wave = refract(vec3(0.0, 0.0, -1.0), normal, 1.0 / ior);
    vec2 bent = position + wave.xy / max(-wave.z, 0.1) * thickness;
    vec3 weight = vec3(
      clamp(1.25 - 2.5 * t, 0.0, 1.0),
      clamp(1.0 - abs(2.5 * t - 1.25), 0.0, 1.0),
      clamp(2.5 * t - 1.25, 0.0, 1.0)
    ) / 2.0;
    vec4 cloud = cloudsAt(bent);
    cover += cloud.a * weight;
    clouds += cloud.rgb * weight;
    starlight += starsAt(bent) * (1.0 - cloud.a) * weight;
    falling += fallAt(bent) * weight;
    bolt += boltAt(bent) * weight;
  }
  color = color * (1.0 - cover) + clouds + starlight;
  color = mix(color, fallColor(), falling);
  color += bolt * vec3(0.85, 0.9, 1.0);

  // A little light caught in the glass, and the rim's reflection split into
  // color: red reaches a little further in than blue
  color = mix(color, vec3(1.0), uMilk);
  float chroma = uChroma * uPixelRatio;
  color += vec3(
    sheen(gap + chroma, rim, outward, dome),
    sheen(gap, rim, outward, dome),
    sheen(gap - chroma, rim, outward, dome)
  );

  return mix(behind, color, clamp(0.5 - gap / uPixelRatio, 0.0, 1.0));
}

void main() {
  vec2 position = gl_FragCoord.xy;
  night = nightAt(uSunElevation);
  vec3 color = scene(position);

  for (int i = 0; i < ${MAX_GLASS}; i++) {
    if (i >= uGlassCount) break;
    color = glass(color, position, uGlass[i].xy, uGlass[i].zw, uGlassRadius[i]);
  }

  // Lightning lights the clouds from inside, most around where it struck,
  // and the clear sky a little
  if (uFlash > 0.0) {
    vec2 struck = uBolt.xy * uResolution;
    float spread = 0.2 * uResolution.x;
    float near = exp(-dot(position - struck, position - struck) / (2.0 * spread * spread));
    float cloud = cloudsAt(position).a;
    color += uFlash * (0.25 + cloud * (0.6 + 1.6 * near)) * vec3(0.75, 0.8, 1.0);
  }

  // A little noise against banding in the dark gradients
  color += (hash(position) - 0.5) / 255.0;
  outColor = vec4(color, 1.0);
}`;

// A texture a pass draws into, to be scaled up by the next
interface Target {
  texture: WebGLTexture | null;
  framebuffer: WebGLFramebuffer | null;
  width: number;
  height: number;
}

/**
 * Sets a canvas up to draw the sky. Null where WebGL2 isn't there or the
 * shaders don't compile, and the footer keeps its gradient. The canvas's
 * own size is up to the caller.
 *
 * Compiling the shaders takes a while. Where the browser can do that in the
 * background it does, see gl-program.ts, and the renderer isn't ready until
 * it's done: drawing before that does nothing, and `onReady` is called once
 * it can. Where it can't, they compile here and now, and the renderer comes
 * back ready. `onLost` is called when the GPU drops the canvas, or a shader
 * turns out not to compile, after which drawing does nothing.
 */
export const createSkyRenderer = (
  canvas: HTMLCanvasElement,
  onLost: () => void,
  onReady?: () => void,
): SkyRenderer | null => {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const builds = [NOISE_PASS, SKY_PASS, CLOUD_PASS, COMPOSE_PASS].map(
    (source) => buildProgram(gl, VERTEX, source),
  );
  const [noiseBuild, skyBuild, cloudBuild, composeBuild] = builds;
  if (!noiseBuild || !skyBuild || !cloudBuild || !composeBuild) return null;
  const programs = [noiseBuild, skyBuild, cloudBuild, composeBuild];
  const noiseProgram = noiseBuild.program;
  const skyProgram = skyBuild.program;
  const cloudProgram = cloudBuild.program;
  const composeProgram = composeBuild.program;

  // Found once the programs have linked: asking before would wait for them
  const locate = (program: WebGLProgram, names: string[]) =>
    Object.fromEntries(
      names.map((name) => [name, gl.getUniformLocation(program, name)]),
    );
  const shared = ["uResolution", "uRadiansPerPixel", "uSunElevation", "uSunX"];
  let noiseUniforms: Record<string, WebGLUniformLocation | null> = {};
  let skyUniforms: Record<string, WebGLUniformLocation | null> = {};
  let cloudUniforms: Record<string, WebGLUniformLocation | null> = {};
  let composeUniforms: Record<string, WebGLUniformLocation | null> = {};
  const glassShapes = new Float32Array(MAX_GLASS * 4);
  const glassRadii = new Float32Array(MAX_GLASS);

  const createTarget = (wrap: number, mipmaps = false): Target => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      mipmaps ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return { texture, framebuffer: gl.createFramebuffer(), width: 0, height: 0 };
  };

  // Sizes a target to a share of the canvas. True when that changed it, and
  // it holds nothing yet
  const fit = (target: Target, budget: number, width: number, height: number) => {
    const scale = Math.min(1, Math.sqrt(budget / (width * height)));
    const fitWidth = Math.max(1, Math.round(width * scale));
    const fitHeight = Math.max(1, Math.round(height * scale));
    if (fitWidth === target.width && fitHeight === target.height) return false;
    target.width = fitWidth;
    target.height = fitHeight;
    gl.bindTexture(gl.TEXTURE_2D, target.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA8,
      fitWidth,
      fitHeight,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null,
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      target.texture,
      0,
    );
    return true;
  };

  const noiseTarget = createTarget(gl.REPEAT, true);
  const skyTarget = createTarget(gl.CLAMP_TO_EDGE);
  const cloudTarget = createTarget(gl.CLAMP_TO_EDGE);

  let isReady = false;
  let isLost = false;
  let isDisposed = false;

  const dispose = () => {
    if (isDisposed) return;
    isDisposed = true;
    for (const build of programs) deleteProgram(gl, build);
    for (const target of [noiseTarget, skyTarget, cloudTarget]) {
      gl.deleteTexture(target.texture);
      gl.deleteFramebuffer(target.framebuffer);
    }
  };

  // The programs have linked: finds their uniforms, and draws the noise,
  // once, with its mip levels: those average it out where the layer runs
  // away toward the horizon. False when a shader didn't compile
  const finish = () => {
    if (!programs.every((build) => checkProgram(gl, build))) return false;
    noiseUniforms = locate(noiseProgram, ["uResolution"]);
    skyUniforms = locate(skyProgram, shared);
    cloudUniforms = locate(cloudProgram, [
      ...shared,
      "uSky",
      "uNoise",
      "uDrift",
      "uWind",
      "uSunT",
      "uSunTVeil",
      ...Object.values(LOOK_UNIFORMS),
    ]);
    composeUniforms = locate(composeProgram, [
      ...shared,
      "uSky",
      "uClouds",
      "uStarTurn",
      "uPixelRatio",
      "uFalling",
      "uFall",
      "uLean",
      "uTime",
      "uFlash",
      "uBolt",
      "uBoltOn",
      "uGlass",
      "uGlassRadius",
      "uGlassCount",
      ...Object.values(GLASS_UNIFORMS),
    ]);

    fit(noiseTarget, NOISE_SIZE * NOISE_SIZE, NOISE_SIZE, NOISE_SIZE);
    gl.viewport(0, 0, NOISE_SIZE, NOISE_SIZE);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's, not a React hook
    gl.useProgram(noiseProgram);
    gl.uniform2f(noiseUniforms.uResolution, NOISE_SIZE, NOISE_SIZE);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindTexture(gl.TEXTURE_2D, noiseTarget.texture);
    gl.generateMipmap(gl.TEXTURE_2D);
    isReady = true;
    return true;
  };

  const handleLost = (event: Event) => {
    event.preventDefault();
    isLost = true;
    onLost();
  };
  canvas.addEventListener("webglcontextlost", handleLost);

  // In the background, when the browser can: ready in a while. Otherwise
  // ready, or not, right away
  const stopWaiting = whenLinked(gl, programs, () => {
    if (isLost) return;
    if (finish()) {
      onReady?.();
    } else {
      dispose();
      onLost();
    }
  });
  if (!stopWaiting && !finish()) {
    canvas.removeEventListener("webglcontextlost", handleLost);
    dispose();
    return null;
  }

  // What the sky's texture holds now, so the same sky isn't drawn twice, and
  // whether the clouds' texture holds any
  let drawnSky = "";
  let hasClouds = false;

  const run = (
    program: WebGLProgram,
    uniforms: Record<string, WebGLUniformLocation | null>,
    width: number,
    height: number,
    frame: SkyFrame,
  ) => {
    gl.viewport(0, 0, width, height);
    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's, not a React hook
    gl.useProgram(program);
    gl.uniform2f(uniforms.uResolution, width, height);
    gl.uniform1f(
      uniforms.uRadiansPerPixel,
      (frame.span * Math.PI) / 180 / height,
    );
    gl.uniform1f(uniforms.uSunElevation, (frame.sunElevation * Math.PI) / 180);
    gl.uniform1f(uniforms.uSunX, frame.sunX);
  };

  const bindInputs = () => {
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, cloudTarget.texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, skyTarget.texture);
  };

  return {
    isReady: () => isReady && !isLost,
    draw(frame, glass, values, options) {
      const { width, height } = canvas;
      if (isLost || !isReady || width === 0 || height === 0) return false;
      const { weather } = frame;
      const { look } = weather;

      // The scattering, small, and only when the sun or the size changed.
      // Unbound while it's drawn into
      const resized = fit(skyTarget, SKY_BUDGET, width, height);
      const sky = `${frame.sunElevation} ${frame.sunX} ${frame.span}`;
      if (resized || sky !== drawnSky) {
        drawnSky = sky;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, skyTarget.framebuffer);
        run(skyProgram, skyUniforms, skyTarget.width, skyTarget.height, frame);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // The clouds, lit by that sky. A clear sky only clears them
      const cloudsResized = fit(cloudTarget, CLOUD_BUDGET, width, height);
      const isClear = look.coverage <= 0 && look.veil <= 0;
      if (isClear && (hasClouds || cloudsResized)) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, cloudTarget.framebuffer);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        hasClouds = false;
      } else if (!isClear && (options.clouds || cloudsResized)) {
        hasClouds = true;
        gl.bindFramebuffer(gl.FRAMEBUFFER, cloudTarget.framebuffer);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, noiseTarget.texture);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, skyTarget.texture);
        run(cloudProgram, cloudUniforms, cloudTarget.width, cloudTarget.height, frame);
        gl.uniform1i(cloudUniforms.uSky, 0);
        gl.uniform1i(cloudUniforms.uNoise, 2);
        gl.uniform2f(cloudUniforms.uDrift, frame.drift[0], frame.drift[1]);
        const wind = Math.hypot(weather.windX, weather.windY);
        gl.uniform2f(
          cloudUniforms.uWind,
          wind > 0 ? weather.windX / wind : -Math.SQRT1_2,
          wind > 0 ? weather.windY / wind : -Math.SQRT1_2,
        );
        gl.uniform3fv(
          cloudUniforms.uSunT,
          sunTransmittance(look.height, frame.sunElevation),
        );
        gl.uniform3fv(
          cloudUniforms.uSunTVeil,
          sunTransmittance(VEIL_HEIGHT, frame.sunElevation),
        );
        for (const [key, name] of Object.entries(LOOK_UNIFORMS)) {
          gl.uniform1f(cloudUniforms[name], look[key as keyof CloudLook]);
        }
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      // Both scaled up onto the canvas, with the stars, the rain or snow,
      // the lightning and the glass
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      bindInputs();
      run(composeProgram, composeUniforms, width, height, frame);
      gl.uniform1i(composeUniforms.uSky, 0);
      gl.uniform1i(composeUniforms.uClouds, 1);
      gl.uniform1f(composeUniforms.uStarTurn, frame.starTurn);
      gl.uniform1f(composeUniforms.uPixelRatio, frame.pixelRatio);
      gl.uniform1i(composeUniforms.uFalling, weather.falling);
      gl.uniform1f(composeUniforms.uFall, look.fall);
      // The wind across the view leans what falls, by as much as it carries
      // it sideways per meter it falls, near enough
      gl.uniform1f(
        composeUniforms.uLean,
        Math.min(Math.max(weather.windX * 40, -0.6), 0.6),
      );
      gl.uniform1f(composeUniforms.uTime, frame.time);
      gl.uniform1f(composeUniforms.uFlash, frame.flash);
      const bolt = frame.bolt ?? { x: 0.5, top: 0.5, seed: 0, isVisible: false };
      gl.uniform3f(composeUniforms.uBolt, bolt.x, bolt.top, bolt.seed);
      gl.uniform1f(composeUniforms.uBoltOn, bolt.isVisible ? 1 : 0);
      for (const [key, name] of Object.entries(GLASS_UNIFORMS)) {
        gl.uniform1f(
          composeUniforms[name],
          values[key as keyof typeof GLASS_UNIFORMS],
        );
      }

      const shapes = glass.slice(0, MAX_GLASS);
      shapes.forEach((shape, index) => {
        glassShapes.set(
          [shape.centerX, shape.centerY, shape.halfWidth, shape.halfHeight],
          index * 4,
        );
        glassRadii[index] = shape.radius;
      });
      gl.uniform4fv(composeUniforms.uGlass, glassShapes);
      gl.uniform1fv(composeUniforms.uGlassRadius, glassRadii);
      gl.uniform1i(composeUniforms.uGlassCount, shapes.length);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    },
    destroy() {
      stopWaiting?.();
      canvas.removeEventListener("webglcontextlost", handleLost);
      if (isLost) return;
      dispose();
      // The context too, once the canvas is off the page. Its loss isn't
      // listened for any more, so it isn't taken for the GPU dropping it
      releaseLater(gl);
    },
  };
};
