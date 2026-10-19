// Heavy graphics work, like the about page's room compiling its shaders and
// sending up its textures, keeps the browser's graphics process busy for a
// few seconds. In Firefox every canvas's WebGL queues behind it there, and
// a canvas that starts on the page meanwhile holds the whole page up while
// it waits for its context and its shaders: scrolling and animations stop.
// Heavy work says so here, and other canvases wait for it before they start

// Waited for this long at most, in ms: a canvas starts regardless after it
const WAIT_AT_MOST = 8000;

let holds = 0;
const waiting = new Set<() => void>();

/** Marks heavy graphics work under way. Returns what marks it done. */
export const holdGraphics = () => {
  holds += 1;
  let isDone = false;
  return () => {
    if (isDone) return;
    isDone = true;
    holds -= 1;
    if (holds > 0) return;
    for (const resume of waiting) resume();
    waiting.clear();
  };
};

/** Settles once no heavy graphics work is under way, or after a while. */
export const whenGraphicsFree = () =>
  new Promise<void>((resolve) => {
    if (holds === 0) {
      resolve();
      return;
    }
    const resume = () => {
      clearTimeout(timer);
      waiting.delete(resume);
      resolve();
    };
    const timer = setTimeout(resume, WAIT_AT_MOST);
    waiting.add(resume);
  });
