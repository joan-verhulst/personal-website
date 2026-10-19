/**
 * Shader programs that compile in the background. Compiling takes a while,
 * and asking a program whether it linked waits for it: the page stood still
 * for as long as that took. Where the browser can compile in the
 * background, see KHR_parallel_shader_compile, a program is built here and
 * only asked once it says it's done, with whenLinked. The sky and the loupe
 * are made this way.
 */

export interface Build {
  program: WebGLProgram;
  vertex: WebGLShader;
  fragment: WebGLShader;
}

/**
 * Compiles and links a program, without asking whether that worked, see
 * checkProgram. Null when the context can't make one.
 */
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

/**
 * Whether a program linked, which waits for it where it's still compiling.
 * Says what went wrong when it didn't, and lets go of the shaders either way.
 */
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

/** Lets go of a program, and of its shaders if it still has them. */
export const deleteProgram = (
  gl: WebGL2RenderingContext,
  { program, vertex, fragment }: Build,
) => {
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  gl.deleteProgram(program);
};

/**
 * Waits for programs that compile in the background, and calls back once
 * they have all linked. They're asked every frame whether they're done,
 * which doesn't wait, unlike asking whether they linked. Returns a way to
 * stop waiting. Null where the browser compiles in the foreground: then
 * they're waited for when they're checked, and nothing is called.
 */
export const whenLinked = (
  gl: WebGL2RenderingContext,
  builds: Build[],
  onLinked: () => void,
): (() => void) | null => {
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  if (!parallel) return null;

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

/**
 * Hands a context back, rather than leaving it until its canvas is
 * collected: browsers only keep so many at once, and drop the oldest for a
 * new one. A moment later, and only once the canvas is off the page. React
 * sets an effect up again on the same canvas, in development and after a
 * fast refresh, sometimes only once it scrolls into view, and a canvas whose
 * context was handed back only ever gives that lost one again. A canvas
 * that's still on the page keeps its context, to draw with again.
 */
export const releaseLater = (gl: WebGL2RenderingContext) => {
  setTimeout(() => {
    const { canvas } = gl;
    if (canvas instanceof HTMLCanvasElement && canvas.isConnected) return;
    if (gl.isContextLost()) return;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }, 0);
};
