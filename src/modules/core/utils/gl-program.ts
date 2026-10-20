/** Compiles in the background (KHR_parallel_shader_compile): asking a program whether it linked blocks the page. */

export interface Build {
  program: WebGLProgram;
  vertex: WebGLShader;
  fragment: WebGLShader;
}

/** Compiles and links without checking the result, see checkProgram. */
export const buildProgram = (
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): Build | null => {
  const vertex = gl.createShader(gl.VERTEX_SHADER);
  const fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.shaderSource(vertex, vertexSource);
  gl.compileShader(vertex);
  gl.shaderSource(fragment, fragmentSource);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  return { program, vertex, fragment };
};

export const checkProgram = (
  gl: WebGL2RenderingContext,
  { program, vertex, fragment }: Build,
) => {
  const isLinked = gl.getProgramParameter(program, gl.LINK_STATUS) === true;
  if (!isLinked) {
    for (const shader of [vertex, fragment]) {
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
      }
    }
    console.error(gl.getProgramInfoLog(program));
  }
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return isLinked;
};

export const deleteProgram = (
  gl: WebGL2RenderingContext,
  { program, vertex, fragment }: Build,
) => {
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  gl.deleteProgram(program);
};

// Delay in ms before asking where the browser cannot say: Firefox compiles in its graphics process
const ASK_AFTER = 400;

/**
 * Calls back once all programs linked. Polls every frame where parallel compile
 * is available; Firefox cannot say, so they are asked after a delay instead of
 * right away, which would block the page.
 */
export const whenLinked = (
  gl: WebGL2RenderingContext,
  builds: Build[],
  onLinked: () => void,
): (() => void) | null => {
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (!parallel) {
    const timer = setTimeout(() => {
      if (!gl.isContextLost()) onLinked();
    }, ASK_AFTER);
    return () => clearTimeout(timer);
  }

  let request = 0;
  const poll = () => {
    request = 0;
    if (gl.isContextLost()) return;
    const isDone = builds.every(
      ({ program }) =>
        gl.getProgramParameter(program, parallel.COMPLETION_STATUS_KHR) ===
        true,
    );
    if (isDone) onLinked();
    else request = requestAnimationFrame(poll);
  };
  request = requestAnimationFrame(poll);

  return () => cancelAnimationFrame(request);
};

export const releaseLater = (gl: WebGL2RenderingContext) => {
  setTimeout(() => {
    const { canvas } = gl;
    if (canvas instanceof HTMLCanvasElement && canvas.isConnected) return;
    if (gl.isContextLost()) return;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }, 0);
};
