/// <reference types="@webgpu/types" />

/**
 * The "Distressed ink" shader, ported from Figma to run on a canvas. It
 * takes a picture and prints it in ink on paper: a patchy field blur, then a
 * graphic-pen dither, then the dots clump into torn edges. The WGSL is the
 * Figma version untouched, only the plumbing around it is new.
 */

export interface InkParams {
  // Blur radius in CSS pixels, how patchy it is (0 to 1), patch size
  blur: number;
  unevenness: number;
  patchSize: number;
  // Where the picture stays sharp (0 to 1 of the frame), how large that is
  // and how long the ramp into the blur is, as shares of the frame diagonal
  focusX: number;
  focusY: number;
  focusSize: number;
  falloff: number;
  // The pen: stroke length in detail units, angle in degrees, spray density
  // (0 to 1) and the detail scale in CSS pixels
  strokeLength: number;
  strokeAngle: number;
  balance: number;
  detailScale: number;
  // The clumping: clump radius in CSS pixels, ink weight (0 to 1) and how
  // hard the edges are
  clump: number;
  inkWeight: number;
  hardness: number;
  ink: [number, number, number, number];
  paper: [number, number, number, number];
}

/** What a whole print run shares. The ink weight is set sheet by sheet. */
export type InkSettings = Omit<InkParams, "inkWeight">;

const WGSL = /* wgsl */ `
struct Uniforms {
  res: vec4f,
  blurData: vec4f,
  fieldData: vec4f,
  penData: vec4f,
  tornData: vec4f,
  inkColor: vec4f,
  paperColor: vec4f,
};

@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var inputTex: texture_2d<f32>;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 = p3 + dot(p3, vec3f(p3.y + 33.33, p3.z + 33.33, p3.x + 33.33));
  return fract((p3.x + p3.y) * p3.z);
}

fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let sm = f * f * (3.0 - 2.0 * f);
  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));
  return mix(mix(a, b, sm.x), mix(c, d, sm.x), sm.y);
}

fn fbm(p0: vec2f) -> f32 {
  var p = p0;
  var s = 0.0;
  var a = 0.5;
  var norm = 0.0;
  for (var i = 0; i < 3; i = i + 1) {
    s = s + a * valueNoise(p);
    norm = norm + a;
    p = p * 2.11 + vec2f(7.31, 3.17);
    a = a * 0.5;
  }
  return s / max(norm, 0.00001);
}

fn lumAt(uvPos: vec2f) -> f32 {
  let c = textureSampleLevel(inputTex, samp, clamp(uvPos, vec2f(0.0), vec2f(1.0)), 0.0);
  let a = clamp(c.a, 0.0, 1.0);
  return dot(c.rgb + vec3f(1.0 - a), vec3f(0.299, 0.587, 0.114));
}

fn streakAt(q: vec2f, strokeLen: f32, seed: f32) -> f32 {
  let x = q.x / max(strokeLen, 0.5);
  let row = floor(q.y) + seed * 31.7;
  let i = floor(x);
  let f = fract(x);
  let sm = f * f * (3.0 - 2.0 * f);
  let m = mix(hash21(vec2f(i, row)), hash21(vec2f(i + 1.0, row)), sm);
  let tri = 4.0 * sm * (1.0 - sm);
  return mix(m, m + (m - 0.5) * (1.0 - 2.0 * abs(m - 0.5)) * 0.5, tri);
}

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let dims = max(u.res.xy, vec2f(1.0));

  let blurPx    = u.blurData.x;
  let uneven    = clamp(u.blurData.y, 0.0, 1.0);
  let patchSize = max(u.blurData.z, 0.01);

  let detailScale = max(u.penData.w, 0.1);
  let strokeLen  = clamp(u.penData.x, 1.0, 15.0);
  let penBalance = u.penData.y;
  let penAngle   = u.penData.z;

  let tornLevel  = u.tornData.x;
  let tornRadius = max(u.tornData.y, 0.5);
  let hardness   = u.tornData.z;
  let seed       = u.tornData.w;

  let Ppx = uv * dims;
  let dir  = vec2f(cos(penAngle), sin(penAngle));
  let perp = vec2f(-dir.y, dir.x);

  let focus     = u.fieldData.xy;
  let focusSize = u.fieldData.z;
  let falloff   = u.fieldData.w;

  let aspect = dims.x / dims.y;
  let diag = length(vec2f(aspect, 1.0));
  let d = length((uv - focus) * vec2f(aspect, 1.0)) / diag;

  let ramp = smoothstep(focusSize, focusSize + max(falloff, 0.002), d);

  let patchMod = 1.0 + (fbm(uv * vec2f(aspect, 1.0) / patchSize) - 0.5) * 1.6 * uneven;
  let rLocal = blurPx * ramp * patchMod;

  var lumField = lumAt(uv);
  if (rLocal >= 0.75) {
    let jit = hash21(Ppx * 1.7) * 6.2831853;
    let tapCount = clamp(i32(rLocal * 0.5), 20, 40);
    var acc = 0.0;
    var wacc = 0.0;
    for (var i = 0; i < 40; i = i + 1) {
      if (i >= tapCount) { break; }
      let fi = f32(i);
      let ang = fi * 2.399963 + jit;
      let rr = sqrt((fi + 0.5) / f32(tapCount)) * rLocal;
      let w = exp(-2.0 * rr * rr / (rLocal * rLocal));
      acc = acc + lumAt(uv + vec2f(cos(ang), sin(ang)) * rr / dims) * w;
      wacc = wacc + w;
    }
    lumField = acc / max(wacc, 0.00001);
  }

  let useField = smoothstep(0.2, 0.9, rLocal / tornRadius);
  let penBias = (penBalance - 0.5) * 1.8;

  let jit2 = hash21(Ppx * 3.9 + 11.0) * 6.2831853;
  var inked = 0.0;
  var count = 0.0;

  let e0 = lumAt(uv + vec2f( tornRadius, 0.0) / dims);
  let e1 = lumAt(uv + vec2f(-tornRadius, 0.0) / dims);
  let flat = abs(e0 - lumField) + abs(e1 - lumField) < 0.01;

  if (flat) {
    let T = clamp((1.0 - lumField) + penBias, 0.0, 1.0);
    for (var k = 0; k < 32; k = k + 1) {
      let fk = f32(k);
      let ang = fk * 2.399963 + jit2;
      let rr = sqrt((fk + 0.5) / 32.0) * tornRadius;
      let offPx = vec2f(cos(ang), sin(ang)) * rr;

      let sp = Ppx + offPx;
      let q = vec2f(dot(sp, dir), dot(sp, perp)) / detailScale;
      let s = streakAt(q, strokeLen, seed);

      inked = inked + select(0.0, 1.0, s < T);
      count = count + 1.0;
    }
  } else {
    for (var k = 0; k < 32; k = k + 1) {
      let fk = f32(k);
      let ang = fk * 2.399963 + jit2;
      let rr = sqrt((fk + 0.5) / 32.0) * tornRadius;
      let offPx = vec2f(cos(ang), sin(ang)) * rr;

      let lumTap = mix(lumAt(uv + offPx / dims), lumField, useField);
      let T = clamp((1.0 - lumTap) + penBias, 0.0, 1.0);

      let sp = Ppx + offPx;
      let q = vec2f(dot(sp, dir), dot(sp, perp)) / detailScale;
      let s = streakAt(q, strokeLen, seed);

      inked = inked + select(0.0, 1.0, s < T);
      count = count + 1.0;
    }
  }

  let density = inked / count;
  let ink = clamp((density - tornLevel) * hardness + 0.5, 0.0, 1.0);

  let inkC = u.inkColor.rgb * u.inkColor.a;
  let paperC = u.paperColor.rgb * u.paperColor.a;
  return vec4f(mix(paperC, inkC, ink), mix(u.paperColor.a, u.inkColor.a, ink));
}
`;

const SEED = 7;

export const isInkSupported = () =>
  typeof navigator !== "undefined" && "gpu" in navigator;

// One device for the page, asked for once
let devicePromise: Promise<GPUDevice | null> | null = null;
const getDevice = () => {
  devicePromise ??= (async () => {
    if (!isInkSupported()) return null;
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    // Lost devices, e.g. after the GPU reset, are asked for again next time
    device.lost.then(() => {
      devicePromise = null;
    });
    return device;
  })();
  return devicePromise;
};

interface Shared {
  module: GPUShaderModule;
  quad: GPUBuffer;
  sampler: GPUSampler;
  pipelines: Map<GPUTextureFormat, GPURenderPipeline>;
}

// The pieces every printer on a device can share
const shared = new WeakMap<GPUDevice, Shared>();
const getShared = (device: GPUDevice): Shared => {
  let entry = shared.get(device);
  if (entry) return entry;

  const quad = device.createBuffer({
    size: 6 * 4 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(quad.getMappedRange()).set([
    -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, -1, 1, 0, 0, 1, -1, 1, 1, 1, 1, 1,
    0,
  ]);
  quad.unmap();

  entry = {
    module: device.createShaderModule({ code: WGSL }),
    quad,
    sampler: device.createSampler({
      magFilter: "linear",
      minFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
    }),
    pipelines: new Map(),
  };
  shared.set(device, entry);
  return entry;
};

const getPipeline = (device: GPUDevice, format: GPUTextureFormat) => {
  const entry = getShared(device);
  let pipeline = entry.pipelines.get(format);
  if (pipeline) return pipeline;

  pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module: entry.module,
      entryPoint: "vs_main",
      buffers: [
        {
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, format: "float32x2", offset: 0 },
            { shaderLocation: 1, format: "float32x2", offset: 8 },
          ],
        },
      ],
    },
    fragment: {
      module: entry.module,
      entryPoint: "fs_main",
      targets: [{ format }],
    },
    primitive: { topology: "triangle-list" },
  });
  entry.pipelines.set(format, pipeline);
  return pipeline;
};

export interface InkPrinter {
  /** Prints `source` onto the canvas. Pixel sizes in `params` are CSS pixels, scaled by `dpr`. */
  print: (source: HTMLCanvasElement, params: InkParams, dpr: number) => void;
  destroy: () => void;
}

/** Sets a canvas up to print with the shader. Null where WebGPU isn't there. */
export const createInkPrinter = async (
  canvas: HTMLCanvasElement,
): Promise<InkPrinter | null> => {
  // Asked for first: taking the canvas for WebGPU without a device would
  // leave it unusable for the plain fallback
  const device = await getDevice();
  if (!device) return null;
  const context = canvas.getContext("webgpu");
  if (!context) return null;

  const format = navigator.gpu.getPreferredCanvasFormat();
  const pipeline = getPipeline(device, format);
  const { quad, sampler } = getShared(device);

  const uniforms = device.createBuffer({
    size: 7 * 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  let texture: GPUTexture | null = null;
  let bindGroup: GPUBindGroup | null = null;

  return {
    print(source, params, dpr) {
      const { width, height } = source;
      if (width === 0 || height === 0) return;

      if (!texture || texture.width !== width || texture.height !== height) {
        texture?.destroy();
        texture = device.createTexture({
          size: [width, height],
          format: "rgba8unorm",
          usage:
            GPUTextureUsage.TEXTURE_BINDING |
            GPUTextureUsage.COPY_DST |
            GPUTextureUsage.RENDER_ATTACHMENT,
        });
        bindGroup = null;
      }
      // Configured on every print. The canvas is shared with whoever set it up
      // before, and in development React sets everything up twice.
      context.configure({ device, format, alphaMode: "premultiplied" });

      device.queue.copyExternalImageToTexture({ source }, { texture }, [
        width,
        height,
      ]);

      device.queue.writeBuffer(
        uniforms,
        0,
        new Float32Array([
          width,
          height,
          0,
          0,
          params.blur * dpr,
          params.unevenness,
          params.patchSize,
          0,
          params.focusX,
          params.focusY,
          params.focusSize,
          params.falloff,
          params.strokeLength,
          params.balance,
          (params.strokeAngle * Math.PI) / 180,
          params.detailScale * dpr,
          1 - params.inkWeight,
          params.clump * dpr,
          params.hardness,
          SEED,
          ...params.ink,
          ...params.paper,
        ]),
      );

      bindGroup ??= device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniforms } },
          { binding: 1, resource: sampler },
          { binding: 2, resource: texture.createView() },
        ],
      });

      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [
          {
            view: context.getCurrentTexture().createView(),
            loadOp: "clear",
            clearValue: { r: 0, g: 0, b: 0, a: 0 },
            storeOp: "store",
          },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.setVertexBuffer(0, quad);
      pass.draw(6);
      pass.end();
      device.queue.submit([encoder.finish()]);
    },
    destroy() {
      // The canvas is left configured: another printer may be using it
      texture?.destroy();
      uniforms.destroy();
    },
  };
};
