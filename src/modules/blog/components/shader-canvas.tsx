"use client";

import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { releaseLater } from "~/modules/core/utils/gl-program";
import cn from "~/utils/cn";

// One triangle that covers the canvas, without any buffers
const VERTEX = /* glsl */ `#version 300 es
void main() {
  vec2 corner = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(corner * 2.0 - 1.0, 0.0, 1.0);
}`;

const MAX_PIXEL_RATIO = 2;

export type Uniforms = Record<string, number | readonly number[]>;

export type TextureSource = string | TexImageSource;

interface Props {
  fragment: string;
  uniforms?: Uniforms;
  // Bound to texture units in this order, by their sampler's name
  textures?: Record<string, TextureSource | null>;
  animate?: boolean;
  onPointer?: (x: number, y: number) => void;
  className?: string;
  style?: CSSProperties;
}

interface Gl {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  locations: Map<string, WebGLUniformLocation | null>;
  textures: Map<string, { texture: WebGLTexture | null; source: TextureSource | null }>;
}

const compile = (gl: WebGL2RenderingContext, type: number, source: string) => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
};

const createGl = (canvas: HTMLCanvasElement, fragment: string): Gl | null => {
  const gl = canvas.getContext("webgl2", {
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "low-power",
  });
  if (!gl) return null;
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const shader = compile(gl, gl.FRAGMENT_SHADER, fragment);
  const program = gl.createProgram();
  if (!vertex || !shader || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, shader);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(shader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    return null;
  }
  return { gl, program, locations: new Map(), textures: new Map() };
};

const locate = ({ gl, program, locations }: Gl, name: string) => {
  if (!locations.has(name)) {
    locations.set(name, gl.getUniformLocation(program, name));
  }
  return locations.get(name) ?? null;
};

const ShaderCanvas = ({
  fragment,
  uniforms = {},
  textures = {},
  animate = false,
  onPointer,
  className,
  style,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<Gl | null>(null);
  const [isVisible, setVisible] = useState(false);
  const [isSupported, setSupported] = useState(true);
  const uniformsRef = useRef(uniforms);
  uniformsRef.current = uniforms;
  const texturesRef = useRef(textures);
  texturesRef.current = textures;
  const drawRef = useRef<() => void>(() => {});
  const frameRef = useRef(0);
  const startRef = useRef(performance.now());

  const schedule = () => {
    if (frameRef.current) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      drawRef.current();
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  // Set up the first time it shows, and kept from then on. schedule only
  // touches refs, so it's left out of what this depends on
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isVisible || glRef.current) return;
    const created = createGl(canvas, fragment);
    if (!created) {
      setSupported(false);
      return;
    }
    glRef.current = created;
    const { gl } = created;

    const upload = (name: string, source: TextureSource | null) => {
      let entry = created.textures.get(name);
      if (!entry) {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
        entry = { texture, source: null };
        created.textures.set(name, entry);
      }
      if (entry.source === source || !source) return;
      entry.source = source;

      const put = (image: TexImageSource) => {
        if (!glRef.current) return;
        gl.bindTexture(gl.TEXTURE_2D, entry.texture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
        gl.generateMipmap(gl.TEXTURE_2D);
        schedule();
      };
      if (typeof source === "string") {
        const image = new Image();
        image.decoding = "async";
        image.onload = () => {
          if (entry.source === source) put(image);
        };
        image.src = source;
      } else put(source);
    };

    drawRef.current = () => {
      const { width, height } = canvas;
      if (width === 0 || height === 0) return;
      for (const [name, source] of Object.entries(texturesRef.current)) {
        upload(name, source);
      }
      gl.viewport(0, 0, width, height);
      // biome-ignore lint/correctness/useHookAtTopLevel: WebGL's, not a React hook
      gl.useProgram(created.program);
      gl.uniform2f(locate(created, "uResolution"), width, height);
      gl.uniform1f(locate(created, "uTime"), (performance.now() - startRef.current) / 1000);
      for (const [name, value] of Object.entries(uniformsRef.current)) {
        const location = locate(created, name);
        if (typeof value === "number") gl.uniform1f(location, value);
        else if (value.length === 2) gl.uniform2fv(location, value);
        else if (value.length === 3) gl.uniform3fv(location, value);
        else if (value.length === 4) gl.uniform4fv(location, value);
      }
      Object.keys(texturesRef.current).forEach((name, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, created.textures.get(name)?.texture ?? null);
        gl.uniform1i(locate(created, name), unit);
      });
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
  }, [isVisible, fragment]);

  // Sized to the canvas on screen, which clears it, so it's drawn again.
  // Keeps up while out of view so a resize or rotation doesn't leave it stretched; schedule only touches refs
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !glRef.current) return;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      if (isVisible) schedule();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    resize();

    return () => {
      resizeObserver.disconnect();
    };
  }, [isVisible]);

  useEffect(() => {
    if (glRef.current) schedule();
  });

  useEffect(() => {
    if (!animate || !isVisible) return;
    let request = 0;
    const loop = () => {
      drawRef.current();
      request = requestAnimationFrame(loop);
    };
    request = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(request);
  }, [animate, isVisible]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current);
      const created = glRef.current;
      glRef.current = null;
      if (!created) return;
      for (const { texture } of created.textures.values()) {
        created.gl.deleteTexture(texture);
      }
      created.gl.deleteProgram(created.program);
      // Browsers only keep so many contexts at once, so it's handed back
      // once the canvas is off the page, see releaseLater, rather than at once.
      releaseLater(created.gl);
    },
    [],
  );

  const point = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!onPointer) return;
    const rect = event.currentTarget.getBoundingClientRect();
    onPointer(
      Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1),
      Math.min(Math.max((event.clientY - rect.top) / rect.height, 0), 1),
    );
  };

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-hidden
        className={cn(
          "block size-full",
          onPointer && "cursor-crosshair touch-none",
          className,
        )}
        style={style}
        onPointerDown={(event) => {
          if (!onPointer) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          point(event);
        }}
        onPointerMove={(event) => {
          if (event.buttons) point(event);
        }}
      />
      {!isSupported && (
        <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-light text-neutral-950/55 text-sm">
          This demo needs WebGL2, which this browser doesn't have.
        </p>
      )}
    </>
  );
};

export default ShaderCanvas;
