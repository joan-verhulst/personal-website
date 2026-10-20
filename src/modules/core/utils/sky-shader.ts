import {
  buildProgram,
  checkProgram,
  deleteProgram,
  releaseLater,
  whenLinked,
} from "~/modules/core/utils/gl-program";
import { sunTransmittance } from "~/modules/core/utils/sky-light";
import type { CloudLook, SkyWeather } from "~/modules/core/utils/weather";

/** Sunlight scattered through the atmosphere, after Maxime Heckel's "On Rendering the Sky, Sunsets, and Planets". WebGL2: in every browser, and WebGPU would add nothing. */

export interface Bolt {
  x: number;
  top: number;
  seed: number;
  // Whether the bolt itself shows, or only the flash in the cloud
  isVisible: boolean;
}

export interface SkyFrame {
  sunElevation: number;
  sunX: number;
  span: number;
  starTurn: number;
  weather: SkyWeather;
  drift: [number, number];
  time: number;
  flash: number;
  bolt: Bolt | null;
  pixelRatio: number;
}

export interface GlassShape {
  centerX: number;
  centerY: number;
  halfWidth: number;
  halfHeight: number;
  radius: number;
}

export interface SkyParams {
  clouds: CloudLook[];

  rim: number;
  thickness: number;
  slope: number;
  dome: number;
  ior: number;
  dispersion: number;
  chroma: number;
  reflection: number;
  highlight: number;
  shine: number;
  milk: number;
}

export const SKY_DEFAULTS: SkyParams = {
  clouds: [
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
  clouds: boolean;
}

export interface SkyRenderer {
  /** Whether the shaders have compiled. Drawing before that does nothing. */
  isReady: () => boolean;
  /** Scattering is redrawn only when the sun or size changed; true when it drew. */
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

export const MAX_GLASS = 4;

const SKY_BUDGET = 300_000;
const CLOUD_BUDGET = 800_000;

const NOISE_SIZE = 512;

const VEIL_HEIGHT = 7;

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

const NOISE_PASS = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 uResolution;
out vec4 outColor;
${HASH}
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

const COMMON = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uRadiansPerPixel;
uniform float uSunElevation;
uniform float uSunX;
out vec4 outColor;

const float PI = 3.14159265;

const float EARTH = 6360.0;
const float ATMOSPHERE = 6460.0;
const float ALTITUDE = 0.5;

const vec3 RAYLEIGH = vec3(0.0058, 0.0135, 0.0331);
const float RAYLEIGH_HEIGHT = 8.0;
const float MIE = 0.004;
const float MIE_EXTINCTION = 0.00444;
const float MIE_HEIGHT = 1.2;
const float MIE_G = 0.8;
const vec3 OZONE = vec3(0.00065, 0.00188, 0.00008);

const float SUN_INTENSITY = 20.0;
const float EXPOSURE = 1.0;

vec2 sphere(vec3 o, vec3 d, float radius) {
  float b = dot(o, d);
  float c = dot(o, o) - radius * radius;
  float h = b * b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

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

vec3 sunlight(vec3 point, vec3 sun) {
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

float exposure() {
  return EXPOSURE * (1.0 + 3.0 * (1.0 - smoothstep(-0.1, 0.07, uSunElevation)));
}

vec3 develop(vec3 light) {
  return pow(aces(light * exposure()), vec3(1.0 / 2.2));
}

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

const NIGHT = /* glsl */ `
uniform sampler2D uSky;

float night;

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

const CLOUD_PASS = /* glsl */ `${COMMON}${NIGHT}
uniform sampler2D uNoise;
uniform vec2 uDrift;
uniform vec2 uWind;
uniform float uCoverage;
uniform float uScale;
uniform float uHeight;
uniform float uDepth;
uniform float uBillow;
uniform float uRagged;
uniform float uSoftness;
uniform float uMurk;
uniform float uVeil;
uniform vec3 uSunT;
uniform vec3 uSunTVeil;

const float TILE = 30.0;
const vec2 START = vec2(5.0, 16.0);
const float VEIL_TILE = 60.0;
const float VEIL_HEIGHT = ${VEIL_HEIGHT.toFixed(1)};

const float HAZE = 35.0;
const float VEIL_HAZE = 150.0;

const vec2 SHEET_STATS = vec2(0.563, 0.089);
const vec2 HEAPS_STATS = vec2(0.553, 0.135);
const vec2 VEIL_STATS = vec2(0.545, 0.1);

const float THROUGH = 0.2;
const float DOWN = 0.092;
const float SKY_TOP = 8.0;
const float AMBIENT_HORIZON = 0.25;
const float AMBIENT_UP = 0.7;
const float AMBIENT_DIM = 0.85;
const float AMBIENT_GREY = 0.6;
const float UNDER = 0.08;
const float SIDE = 0.15;
const float HORIZON_GLOW = 0.12;
const float LINING = 0.04;
const float LINING_DEPTH = 0.35;
const vec3 CITY = vec3(0.02, 0.015, 0.01);

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

struct Lights {
  vec3 up;
  vec3 horizon;
  vec3 sunward;
};

vec3 cloudLight(
  float tau, float facing, float gap, float cover, float billow,
  vec3 sunT, float mu, Lights sky
) {
  float sinE = sin(uSunElevation);
  float cosE = cos(uSunElevation);
  float thin = exp(-THROUGH * tau);

  vec3 top = sunT * SUN_INTENSITY * max(sinE, 0.0) + sky.up * SKY_TOP;
  vec3 down = top * thin * DOWN * mix(1.0 - 0.3 * billow, 1.0 + 0.3 * billow, facing);

  vec3 ambient = (sky.horizon * AMBIENT_HORIZON + sky.up * AMBIENT_UP)
    * (1.0 - cover * AMBIENT_DIM)
    * (1.0 - thin * 0.5)
    * (1.0 - 0.5 * smoothstep(10.0, 30.0, tau));
  float grey = dot(ambient, vec3(0.2126, 0.7152, 0.0722));
  ambient = mix(ambient, grey * vec3(0.9, 0.97, 1.1), cover * AMBIENT_GREY);

  float underlit = 1.0 - smoothstep(-0.03, 0.17, sinE);
  vec3 under = sunT * SUN_INTENSITY * underlit * gap * UNDER
    * mix(0.6, 1.4, facing) * (1.0 - thin * 0.5);
  vec3 side = sunT * SUN_INTENSITY * max(cosE, 0.0) * sqrt(max(sinE, 0.0))
    * max(facing - 0.5, 0.0) * 2.0 * billow * SIDE * (1.0 - thin) * gap;
  vec3 glow = sky.sunward * HORIZON_GLOW * gap * (1.0 - thin * 0.5);

  float g = 0.7;
  float g2 = g * g;
  float phase = 3.0 / (8.0 * PI) * ((1.0 - g2) * (1.0 + mu * mu))
    / ((2.0 + g2) * pow(1.0 + g2 - 2.0 * g * mu, 1.5));
  vec3 lining = sunT * SUN_INTENSITY * phase * exp(-tau * LINING_DEPTH) * LINING;

  float dusk = 1.0 - smoothstep(-0.14, -0.02, uSunElevation);
  vec3 city = CITY * dusk * (1.0 - thin);

  return down + ambient + under + side + glow + lining + city;
}

float threshold(float coverage, vec2 stats) {
  float share = clamp(coverage, 0.02, 0.98);
  return stats.x + stats.y * log((1.0 - share) / share) / 1.7;
}

const float AHEAD = 1.0;
const float LOCAL_LOD = 6.0;

vec4 noiseAt(vec2 t, float lod) {
  return lod < 0.0 ? texture(uNoise, t) : textureLod(uNoise, t, lod);
}

float finer(float lod, float times) {
  return lod < 0.0 ? lod : lod + log2(times);
}

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

  float up = max(elevationAt(position), 0.0005);
  float around = (position.x - 0.5 * uResolution.x) * uRadiansPerPixel;
  vec3 dir = vec3(cos(up) * sin(around), sin(up), cos(up) * cos(around));
  vec3 origin = vec3(0.0, EARTH + ALTITUDE, 0.0);
  float mu = dot(viewDirection(position), sunDirection());
  float sunAround = (uSunX - 0.5) * uResolution.x * uRadiansPerPixel;
  vec2 toSun = vec2(sin(sunAround), cos(sunAround));
  vec3 behind = skyAt(position);
  float open = 1.0 - smoothstep(0.55, 1.0, uCoverage);

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
    float away = sphere(origin, dir, EARTH + uHeight).y;
    vec2 ground = (origin + dir * away).xz;
    float tile = TILE * uScale;
    vec2 t = (ground - uDrift - START) / tile;

    float shape = shapeAt(t, -1.0);
    vec2 stats = mix(SHEET_STATS, HEAPS_STATS, uBillow);
    vec2 middle = (vec2(0.0, AHEAD) - uDrift - START) / tile;
    float shift = shapeAt(middle, LOCAL_LOD) - stats.x;
    float edge = threshold(uCoverage, stats) + shift;
    float soft = uSoftness * 0.5;
    float mask = mix(
      smoothstep(edge - soft, edge + soft, shape),
      1.0,
      smoothstep(0.92, 1.0, uCoverage)
    );
    float core = smoothstep(edge, edge + 0.3, shape);
    float tau = uDepth * mix(0.3, 1.0, core);

    float facing = 0.5;
    if (uBillow > 0.0) {
      float ahead = shapeAt(t + toSun * (0.35 / tile), -1.0);
      facing = clamp(0.5 + (shape - ahead) * 6.0 * cos(uSunElevation) * uBillow, 0.0, 1.0);
    }
    float gap = gapAt(t + toSun * (1.5 / tile), edge, soft)
      * gapAt(t + toSun * (4.0 / tile), edge, soft)
      * open;

    vec3 color = develop(cloudLight(tau, facing, gap, uCoverage, uBillow, uSunT, mu, sky));
    float alpha = mask * (1.0 - exp(-tau));

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

const COMPOSE_PASS = /* glsl */ `${COMMON}${NIGHT}
uniform sampler2D uClouds;
uniform float uStarTurn;
uniform float uPixelRatio;
uniform int uFalling;
uniform float uFall;
uniform float uLean;
uniform float uTime;
uniform float uFlash;
uniform vec3 uBolt;
uniform float uBoltOn;
uniform vec4 uGlass[${MAX_GLASS}];
uniform float uGlassRadius[${MAX_GLASS}];
uniform int uGlassCount;

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

const float STAR_CELL = 1.2;

float stars(vec2 position) {
  vec2 cell = floor(position / STAR_CELL);
  cell.x = mod(cell.x, 360.0 / STAR_CELL);
  if (hash(cell) > 0.12) return 0.0;
  vec2 center = vec2(hash(cell + 17.1), hash(cell + 31.7)) * 0.8 + 0.1;
  vec2 offset = (fract(position / STAR_CELL) - center) * STAR_CELL;
  float pixels = length(offset) / degrees(uRadiansPerPixel) / uPixelRatio;
  float brightness = 0.3 + 0.7 * pow(hash(cell + 5.3), 6.0);
  brightness *= 0.8 + 0.2 * sin(uTime * (1.0 + 2.0 * hash(cell + 9.1)) + hash(cell + 2.2) * 6.2832);
  return (1.0 - smoothstep(0.3, 1.2, pixels)) * brightness;
}

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

float rainAt(vec2 position) {
  vec2 css = position / uPixelRatio;
  float rain = 0.0;
  for (int i = 0; i < 3; i++) {
    float depth = float(i);
    float scale = 1.0 + depth * 0.6;
    vec2 p = css / scale;
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

float fallAt(vec2 position) {
  if (uFall <= 0.0) return 0.0;
  if (uFalling == 1) return clamp(rainAt(position), 0.0, 1.0);
  if (uFalling == 2) return clamp(snowAt(position), 0.0, 1.0);
  return 0.0;
}

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

float boltAt(vec2 position) {
  if (uBoltOn < 0.5 || uFlash <= 0.0) return 0.0;
  float top = uBolt.y * uResolution.y;
  if (position.y > top) return 0.0;
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

vec3 scene(vec2 position) {
  vec4 cloud = cloudsAt(position);
  vec3 color = (skyAt(position) + starsAt(position)) * (1.0 - cloud.a) + cloud.rgb;
  color = mix(color, fallColor(), fallAt(position));
  return color + boltAt(position) * vec3(0.85, 0.9, 1.0);
}

float roundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

vec3 surface(float gap, float rim, vec2 outward, vec2 dome) {
  float edge = 1.0 - clamp(-gap / rim, 0.0, 1.0);
  float tilt = uSlope * edge * edge;
  return normalize(vec3(outward * tilt + dome, 1.0));
}

float sheen(float gap, float rim, vec2 outward, vec2 dome) {
  vec3 normal = surface(gap, rim, outward, dome);
  float reflection = pow(1.0 - normal.z, 1.5) * uReflection;
  float highlight = pow(max(reflect(-normalize(LIGHT), normal).z, 0.0), uShine) * uHighlight;
  return reflection + highlight;
}

vec3 glass(vec3 behind, vec2 position, vec2 center, vec2 halfSize, float radius) {
  vec2 local = position - center;
  float gap = roundedBox(local, halfSize, radius);
  if (gap > uPixelRatio) return behind;

  vec2 slope = vec2(
    roundedBox(local + vec2(1.0, 0.0), halfSize, radius) - roundedBox(local - vec2(1.0, 0.0), halfSize, radius),
    roundedBox(local + vec2(0.0, 1.0), halfSize, radius) - roundedBox(local - vec2(0.0, 1.0), halfSize, radius)
  );
  vec2 outward = length(slope) > 0.0 ? normalize(slope) : vec2(0.0);

  float rim = max(min(uRim * uPixelRatio, min(halfSize.x, halfSize.y)), 1.0);
  vec2 dome = uDome * local / max(halfSize.x, halfSize.y);
  vec3 normal = surface(gap, rim, outward, dome);
  float thickness = uThickness * uPixelRatio * smoothstep(0.0, 0.5, -gap / rim);

  vec3 ray = refract(vec3(0.0, 0.0, -1.0), normal, 1.0 / uIor);
  vec3 color = skyAt(position + ray.xy / max(-ray.z, 0.1) * thickness);

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

interface Target {
  texture: WebGLTexture | null;
  framebuffer: WebGLFramebuffer | null;
  width: number;
  height: number;
}

/** Null where WebGL2 is missing or the shaders fail; the footer keeps its gradient. */
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

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      bindInputs();
      run(composeProgram, composeUniforms, width, height, frame);
      gl.uniform1i(composeUniforms.uSky, 0);
      gl.uniform1i(composeUniforms.uClouds, 1);
      gl.uniform1f(composeUniforms.uStarTurn, frame.starTurn);
      gl.uniform1f(composeUniforms.uPixelRatio, frame.pixelRatio);
      gl.uniform1i(composeUniforms.uFalling, weather.falling);
      gl.uniform1f(composeUniforms.uFall, look.fall);
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
      releaseLater(gl);
    },
  };
};
