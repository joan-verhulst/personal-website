export const INK_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uResolution;
uniform float uPixelRatio;
uniform sampler2D uImage;
uniform float uSplit;
uniform float uShowFocus;

uniform float uBlur;
uniform float uUneven;
uniform float uPatch;
uniform vec2 uFocus;
uniform float uFocusSize;
uniform float uFalloff;
uniform float uStrokeLength;
uniform float uStrokeAngle;
uniform float uBalance;
uniform float uDetail;
uniform float uClump;
uniform float uInkWeight;
uniform float uHardness;
uniform vec3 uInk;
uniform vec3 uPaper;

out vec4 outColor;

const float SEED = 7.0;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, vec3(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 sm = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, sm.x), mix(c, d, sm.x), sm.y);
}

float fbm(vec2 p0) {
  vec2 p = p0;
  float s = 0.0;
  float a = 0.5;
  float norm = 0.0;
  for (int i = 0; i < 3; i++) {
    s += a * valueNoise(p);
    norm += a;
    p = p * 2.11 + vec2(7.31, 3.17);
    a *= 0.5;
  }
  return s / max(norm, 0.00001);
}

float lumAt(vec2 uv) {
  vec4 c = textureLod(uImage, clamp(uv, vec2(0.0), vec2(1.0)), 0.0);
  float a = clamp(c.a, 0.0, 1.0);
  return dot(c.rgb * a + vec3(1.0 - a), vec3(0.299, 0.587, 0.114));
}

float streakAt(vec2 q, float strokeLen, float seed) {
  float x = q.x / max(strokeLen, 0.5);
  float row = floor(q.y) + seed * 31.7;
  float i = floor(x);
  float f = fract(x);
  float sm = f * f * (3.0 - 2.0 * f);
  float m = mix(hash21(vec2(i, row)), hash21(vec2(i + 1.0, row)), sm);
  float tri = 4.0 * sm * (1.0 - sm);
  return mix(m, m + (m - 0.5) * (1.0 - 2.0 * abs(m - 0.5)) * 0.5, tri);
}

vec3 focusRing(vec3 color, vec2 Ppx, vec2 dims) {
  if (uShowFocus < 0.5) return color;
  float d = length(Ppx - uFocus * dims) / uPixelRatio;
  float ring = 1.0 - smoothstep(0.6, 1.6, abs(d - 9.0));
  float center = 1.0 - smoothstep(1.2, 2.2, d);
  return mix(color, vec3(0.227, 0.608, 0.847), max(ring, center));
}

void main() {
  vec2 dims = max(uResolution, vec2(1.0));
  vec2 uv = vec2(gl_FragCoord.x, dims.y - gl_FragCoord.y) / dims;
  vec2 Ppx = uv * dims;

  if (uv.x < uSplit) {
    vec4 c = textureLod(uImage, uv, 0.0);
    outColor = vec4(c.rgb * c.a + uPaper * (1.0 - c.a), 1.0);
    return;
  }

  float blurPx = uBlur * uPixelRatio;
  float uneven = clamp(uUneven, 0.0, 1.0);
  float patchSize = max(uPatch, 0.01);
  float detailScale = max(uDetail * uPixelRatio, 0.1);
  float strokeLen = clamp(uStrokeLength, 1.0, 15.0);
  float penBalance = uBalance;
  float penAngle = uStrokeAngle;
  float tornLevel = 1.0 - uInkWeight;
  float tornRadius = max(uClump * uPixelRatio, 0.5);
  float hardness = uHardness;
  float seed = SEED;

  vec2 dir = vec2(cos(penAngle), sin(penAngle));
  vec2 perp = vec2(-dir.y, dir.x);

  float aspect = dims.x / dims.y;
  float diag = length(vec2(aspect, 1.0));
  float d = length((uv - uFocus) * vec2(aspect, 1.0)) / diag;
  float ramp = smoothstep(uFocusSize, uFocusSize + max(uFalloff, 0.002), d);
  float patchMod = 1.0 + (fbm(uv * vec2(aspect, 1.0) / patchSize) - 0.5) * 1.6 * uneven;
  float rLocal = blurPx * ramp * patchMod;

  float lumField = lumAt(uv);
  if (rLocal >= 0.75) {
    float jit = hash21(Ppx * 1.7) * 6.2831853;
    int tapCount = clamp(int(rLocal * 0.5), 20, 40);
    float acc = 0.0;
    float wacc = 0.0;
    for (int i = 0; i < 40; i++) {
      if (i >= tapCount) break;
      float fi = float(i);
      float ang = fi * 2.399963 + jit;
      float rr = sqrt((fi + 0.5) / float(tapCount)) * rLocal;
      float w = exp(-2.0 * rr * rr / (rLocal * rLocal));
      acc += lumAt(uv + vec2(cos(ang), sin(ang)) * rr / dims) * w;
      wacc += w;
    }
    lumField = acc / max(wacc, 0.00001);
  }

  float useField = smoothstep(0.2, 0.9, rLocal / tornRadius);
  float penBias = (penBalance - 0.5) * 1.8;
  float jit2 = hash21(Ppx * 3.9 + 11.0) * 6.2831853;
  float inked = 0.0;
  float count = 0.0;

  float e0 = lumAt(uv + vec2( tornRadius, 0.0) / dims);
  float e1 = lumAt(uv + vec2(-tornRadius, 0.0) / dims);
  bool flat_ = abs(e0 - lumField) + abs(e1 - lumField) < 0.01;

  for (int k = 0; k < 32; k++) {
    float fk = float(k);
    float ang = fk * 2.399963 + jit2;
    float rr = sqrt((fk + 0.5) / 32.0) * tornRadius;
    vec2 offPx = vec2(cos(ang), sin(ang)) * rr;
    float lumTap = flat_ ? lumField : mix(lumAt(uv + offPx / dims), lumField, useField);
    float T = clamp((1.0 - lumTap) + penBias, 0.0, 1.0);
    vec2 sp = Ppx + offPx;
    vec2 q = vec2(dot(sp, dir), dot(sp, perp)) / detailScale;
    float s = streakAt(q, strokeLen, seed);
    inked += s < T ? 1.0 : 0.0;
    count += 1.0;
  }

  float density = inked / count;
  float ink = clamp((density - tornLevel) * hardness + 0.5, 0.0, 1.0);
  outColor = vec4(focusRing(mix(uPaper, uInk, ink), Ppx, dims), 1.0);
}`;
