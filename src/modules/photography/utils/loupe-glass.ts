import {
  buildProgram,
  checkProgram,
  deleteProgram,
  releaseLater,
  whenLinked,
} from "~/modules/core/utils/gl-program";


// The footer's glass, see SKY_DEFAULTS in sky-shader.ts, without its dome:
// the lens's top magnifies instead, and a bulge would split the colors across
// all of it. Lengths are in CSS pixels
const LOOK = {
  rim: 5,
  thickness: 200,
  slope: 0.45,
  ior: 2.4,
  dispersion: 3,
  chroma: 0.5,
  reflection: 1.5,
  highlight: 0.7,
  shine: 64,
  milk: 0.04,
  shade: 0.12,
};

const BEZEL = {
  width: 10,
  color: 0.07,
  shine: 40,
  highlight: 0.55,
  sheen: 0.12,
};

const SHADOW = { drop: 4, blur: 10, strength: 0.08 };

export const BEZEL_WIDTH = BEZEL.width;

export const LENS_ROOM = BEZEL.width + SHADOW.drop + SHADOW.blur + 2;

const LOOK_UNIFORMS: Record<keyof typeof LOOK, string> = {
  rim: "uRim",
  thickness: "uThickness",
  slope: "uSlope",
  ior: "uIor",
  dispersion: "uDispersion",
  chroma: "uChroma",
  reflection: "uReflection",
  highlight: "uHighlight",
  shine: "uShine",
  milk: "uMilk",
  shade: "uShade",
};

const BEZEL_UNIFORMS: Record<keyof typeof BEZEL, string> = {
  width: "uBezelWidth",
  color: "uBezelColor",
  shine: "uBezelShine",
  highlight: "uBezelHighlight",
  sheen: "uBezelSheen",
};

// One triangle that covers the canvas, without any buffers
const VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const LENS_PASS = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uContent;
uniform vec2 uContentSize;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uPixelRatio;

uniform float uRim;
uniform float uThickness;
uniform float uSlope;
uniform float uIor;
uniform float uDispersion;
uniform float uChroma;
uniform float uReflection;
uniform float uHighlight;
uniform float uShine;
uniform float uMilk;
uniform float uShade;
uniform float uBezelWidth;
uniform float uBezelColor;
uniform float uBezelShine;
uniform float uBezelHighlight;
uniform float uBezelSheen;
uniform vec3 uShadow;

out vec4 outColor;

const vec3 LIGHT = vec3(-0.55, 0.55, 0.63);

const float BEZEL_ROUND = 1.1;

vec3 contentAt(vec2 position) {
  return texture(uContent, (position - 0.5 * uResolution) / uContentSize + 0.5).rgb;
}

vec3 surface(float gap, float rim, vec2 outward) {
  float edge = 1.0 - clamp(-gap / rim, 0.0, 1.0);
  float tilt = uSlope * edge * edge;
  return normalize(vec3(outward * tilt, 1.0));
}

float sheen(float gap, float rim, vec2 outward) {
  vec3 normal = surface(gap, rim, outward);
  float reflection = pow(1.0 - normal.z, 1.5) * uReflection;
  float highlight = pow(max(reflect(-normalize(LIGHT), normal).z, 0.0), uShine) * uHighlight;
  return reflection + highlight;
}

vec3 glass(vec2 position, float gap, vec2 outward) {
  float rim = max(min(uRim * uPixelRatio, uRadius), 1.0);
  vec3 normal = surface(gap, rim, outward);
  float thickness = uThickness * uPixelRatio * smoothstep(0.0, 0.5, -gap / rim);

  vec3 color = vec3(0.0);
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
    color += contentAt(bent) * weight;
  }

  float edge = 1.0 - clamp(-gap / rim, 0.0, 1.0);
  float away = 0.5 - 0.5 * dot(outward, normalize(LIGHT.xy));
  color *= 1.0 - uShade * edge * edge * (0.5 + 0.5 * away);

  color = mix(color, vec3(1.0), uMilk);
  float chroma = uChroma * uPixelRatio;
  color += vec3(
    sheen(gap + chroma, rim, outward),
    sheen(gap, rim, outward),
    sheen(gap - chroma, rim, outward)
  );
  return min(color, vec3(1.0));
}

vec3 bezel(float gap, float width, vec2 outward) {
  float angle = (clamp(gap / width, 0.0, 1.0) * 2.0 - 1.0) * BEZEL_ROUND;
  vec3 normal = vec3(outward * sin(angle), cos(angle));
  vec3 light = normalize(LIGHT);
  float diffuse = max(dot(normal, light), 0.0);
  float highlight = pow(max(dot(normal, normalize(light + vec3(0.0, 0.0, 1.0))), 0.0), uBezelShine) * uBezelHighlight;
  float room = pow(1.0 - normal.z, 2.0) * uBezelSheen;
  return min(vec3(uBezelColor * (0.5 + diffuse) + highlight + room), vec3(1.0));
}

void main() {
  vec2 position = gl_FragCoord.xy;
  vec2 local = position - 0.5 * uResolution;
  vec2 outward = local / max(length(local), 0.001);
  float width = uBezelWidth * uPixelRatio;
  float gap = length(local) - uRadius;
  float outerGap = gap - width;

  float drop = uShadow.x * uPixelRatio;
  float blur = uShadow.y * uPixelRatio;
  float shadowGap = length(local + vec2(0.0, drop)) - uRadius - width;
  vec4 behind = vec4(0.0, 0.0, 0.0, uShadow.z * (1.0 - smoothstep(-blur, blur, shadowGap)));
  if (outerGap > uPixelRatio) {
    outColor = behind;
    return;
  }

  vec3 color = bezel(gap, width, outward);
  if (gap < uPixelRatio) {
    color = mix(glass(position, gap, outward), color, clamp(0.5 + gap / uPixelRatio, 0.0, 1.0));
  }

  outColor = mix(behind, vec4(color, 1.0), clamp(0.5 - outerGap / uPixelRatio, 0.0, 1.0));
}`;

export const canDrawLoupe = () =>
  "WebGL2RenderingContext" in window &&
  "roundRect" in CanvasRenderingContext2D.prototype;

export interface LoupeGlass {
  /** Whether the shader has compiled. Drawing before that does nothing. */
  isReady: () => boolean;
  draw: (
    content: HTMLCanvasElement,
    radius: number,
    pixelRatio: number,
  ) => boolean;
  destroy: () => void;
  release: () => void;
}

export const createLoupeGlass = (
  canvas: HTMLCanvasElement,
  onLost: () => void,
  onReady?: () => void,
): LoupeGlass | null => {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  const build = buildProgram(gl, VERTEX, LENS_PASS);
  if (!build) return null;
  const { program } = build;

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  let textureWidth = 0;
  let textureHeight = 0;

  // Found once the program has linked: asking before would wait for it
  let uniforms: Record<string, WebGLUniformLocation | null> = {};
  let isReady = false;
  let isLost = false;
  let isDisposed = false;

  const dispose = () => {
    if (isDisposed) return;
    isDisposed = true;
    deleteProgram(gl, build);
    gl.deleteTexture(texture);
  };

  // The program has linked: finds its uniforms and sets the look, which
  // never changes, once. False when the shader didn't compile
  const finish = () => {
    if (!checkProgram(gl, build)) return false;
    uniforms = Object.fromEntries(
      [
        "uContent",
        "uContentSize",
        "uResolution",
        "uRadius",
        "uPixelRatio",
        "uShadow",
        ...Object.values(LOOK_UNIFORMS),
        ...Object.values(BEZEL_UNIFORMS),
      ].map((name) => [name, gl.getUniformLocation(program, name)]),
    );

    // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's, not a React hook
    gl.useProgram(program);
    for (const [key, name] of Object.entries(LOOK_UNIFORMS)) {
      gl.uniform1f(uniforms[name], LOOK[key as keyof typeof LOOK]);
    }
    for (const [key, name] of Object.entries(BEZEL_UNIFORMS)) {
      gl.uniform1f(uniforms[name], BEZEL[key as keyof typeof BEZEL]);
    }
    gl.uniform3f(uniforms.uShadow, SHADOW.drop, SHADOW.blur, SHADOW.strength);
    gl.uniform1i(uniforms.uContent, 0);
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
  const stopWaiting = whenLinked(gl, [build], () => {
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

  return {
    isReady: () => isReady && !isLost,
    draw(content, radius, pixelRatio) {
      const { width, height } = canvas;
      if (isLost || !isReady || width === 0 || height === 0) return false;

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (content.width !== textureWidth || content.height !== textureHeight) {
        textureWidth = content.width;
        textureHeight = content.height;
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA8,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          content,
        );
      } else {
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          content,
        );
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's, not a React hook
      gl.useProgram(program);
      gl.uniform2f(uniforms.uContentSize, textureWidth, textureHeight);
      gl.uniform2f(uniforms.uResolution, width, height);
      gl.uniform1f(uniforms.uRadius, radius);
      gl.uniform1f(uniforms.uPixelRatio, pixelRatio);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    },
    destroy() {
      stopWaiting?.();
      canvas.removeEventListener("webglcontextlost", handleLost);
      if (isLost) return;
      dispose();
    },
    release() {
      releaseLater(gl);
    },
  };
};
