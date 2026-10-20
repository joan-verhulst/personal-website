
export const SCATTER_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uSunElevation;
uniform float uSunX;
uniform float uSpan;
uniform float uRayleigh;
uniform float uMie;
uniform float uOzone;
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
  return RAYLEIGH * depth.x * uRayleigh
    + MIE_EXTINCTION * depth.y * uMie
    + OZONE * depth.z * uOzone;
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
  return 1.0 + 3.0 * (1.0 - smoothstep(-0.1, 0.07, uSunElevation));
}

void main() {
  float radiansPerPixel = uSpan / uResolution.y;
  vec2 position = gl_FragCoord.xy;
  float up = position.y * radiansPerPixel;
  float around = (position.x - uSunX * uResolution.x) * radiansPerPixel;
  vec3 view = vec3(cos(up) * sin(around), sin(up), cos(up) * cos(around));
  vec3 sun = vec3(0.0, sin(uSunElevation), cos(uSunElevation));
  vec3 origin = vec3(0.0, EARTH + ALTITUDE, 0.0);
  float far = sphere(origin, view, ATMOSPHERE).y;

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

  vec3 light = SUN_INTENSITY * (
    rayleigh * RAYLEIGH * rayleighPhase * uRayleigh
    + mie * MIE * miePhase * uMie
  );
  outColor = vec4(pow(aces(light * exposure()), vec3(1.0 / 2.2)), 1.0);
}`;

const NOISE_GLSL = /* glsl */ `
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

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
      vec2 point = vec2(cellHash(cell + offset, n, seed), cellHash(cell + offset, n, seed + 19.19));
      nearest = min(nearest, length(offset + point - f));
    }
  }
  return nearest;
}

float sheetNoise(vec2 t) { return fbm(t, 4.0, 5, 0.0); }
float heapsNoise(vec2 t) { return 1.0 - smoothstep(0.0, 0.95, worley(t, 6.0, 3.3)); }
float detailNoise(vec2 t) { return fbm(t, 32.0, 3, 11.0); }
float smallHeapsNoise(vec2 t) {
  return 0.6 * (1.0 - smoothstep(0.0, 0.9, worley(t, 16.0, 5.5))) + 0.4 * detailNoise(t);
}

float sheetAt(vec2 t) {
  vec2 r = mat2(0.8, 0.6, -0.6, 0.8) * t * 5.0 + vec2(0.37, 0.71);
  return sheetNoise(t) * 0.6 + sheetNoise(r) * 0.4;
}

float heapsAt(vec2 t) {
  return sheetNoise(t * 0.6) * 0.45 + heapsNoise(t * 3.0) * 0.45 + smallHeapsNoise(t * 6.0) * 0.1;
}

float threshold(float coverage, vec2 stats) {
  float share = clamp(coverage, 0.02, 0.98);
  return stats.x + stats.y * log((1.0 - share) / share) / 1.7;
}

const vec2 SHEET_STATS = vec2(0.563, 0.089);
const vec2 HEAPS_STATS = vec2(0.553, 0.135);

vec2 tileAt(vec2 uv, vec2 resolution) {
  return vec2(uv.x, uv.y * resolution.y / resolution.x);
}

vec3 cloudsOver(float shape, float edge, float soft, float y) {
  float mask = smoothstep(edge - soft, edge + soft, shape);
  float core = smoothstep(edge, edge + 0.3, shape);
  vec3 ground = mix(vec3(0.24, 0.42, 0.62), vec3(0.36, 0.56, 0.78), y);
  vec3 cloud = mix(vec3(1.0), vec3(0.74, 0.77, 0.82), core * 0.6);
  return mix(ground, cloud, mask);
}
`;

export const COVERAGE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uCoverage;
uniform float uSoftness;
uniform float uBillow;
out vec4 outColor;
${NOISE_GLSL}
void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  vec2 t = tileAt(uv, uResolution);
  float shape = sheetAt(t);
  if (uBillow > 0.0) shape = mix(shape, heapsAt(t), uBillow);
  vec2 stats = mix(SHEET_STATS, HEAPS_STATS, uBillow);
  outColor = vec4(cloudsOver(shape, threshold(uCoverage, stats), uSoftness * 0.5, uv.y), 1.0);
}`;
