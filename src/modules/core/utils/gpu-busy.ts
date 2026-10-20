const WAIT_AT_MOST = 8000;

let holds = 0;
const waiting = new Set<() => void>();

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
