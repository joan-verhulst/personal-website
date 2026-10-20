"use client";

import { type ReactNode, useEffect, useMemo, useRef } from "react";
import useInView from "~/modules/about/hooks/use-in-view";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import cn from "~/utils/cn";

// One sprite sheet: nine flowers, then leaf, sprig, eucalyptus and olive.
const ATLAS = "/assets/flowers/stickers.webp";
const CELL = 224;
const COLUMNS = 4;
// How often each flower comes up, by cell: the pink ones (cosmos, magnolia,
// lotus) a quarter as often as the rest.
const FLOWER_WEIGHTS = [1, 0.25, 1, 0.25, 1, 1, 0.25, 1, 1];
const FLOWER_TOTAL = FLOWER_WEIGHTS.reduce((sum, weight) => sum + weight, 0);
const FOLIAGE_CELLS = [9, 10, 11, 12];

// One draw picks the flower, as one draw always has, so the shape of every
// bush stays as it was: only which flower grows where changes.
const flowerAt = (draw: number) => {
  let pick = draw * FLOWER_TOTAL;
  for (const [index, weight] of FLOWER_WEIGHTS.entries()) {
    pick -= weight;
    if (pick < 0) return index;
  }
  return FLOWER_WEIGHTS.length - 1;
};

// Laid out in px against the element at `fullWidth` and scaled with it. The
// canvas covers only the corner the bush grows from, or the whole edge.
const CORNER_MARGIN = 280;
const FRAME_MARGIN = 140;

const REACH = 150;
const FOLIAGE_COUNT = 12;
const FLOWER_COUNT = 18;

// The frame rings an element about this much taller than wide, all the way
// round, starting from the bottom-right corner.
const FRAME_ASPECT = 1.45;
const FRAME_COUNT = 40;

type Shape = "corner" | "frame";

type Piece = {
  cell: number;
  isFront: boolean;
  fx: number;
  fy: number;
  dx: number;
  dy: number;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  overshoot: number;
  depth: number;
};

const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// A point on the edge, walking from the bottom-right corner up the right
// side, along the top, down the left and back along the bottom.
const onEdge = (u: number) => {
  const sides = [FRAME_ASPECT, 1, FRAME_ASPECT, 1];
  let distance = u * (FRAME_ASPECT * 2 + 2);
  for (const [index, length] of sides.entries()) {
    if (distance <= length || index === 3) {
      const t = Math.min(1, distance / length);
      return [
        { fx: 1, fy: 1 - t, normal: 0 },
        { fx: 1 - t, fy: 0, normal: -90 },
        { fx: 0, fy: t, normal: 180 },
        { fx: t, fy: 1, normal: 90 },
      ][index];
    }
    distance -= length;
  }
  return { fx: 1, fy: 1, normal: 45 };
};

const layout = (seed: number, shape: Shape) => {
  const random = seeded(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const cell = (isFoliage: boolean) =>
    isFoliage
      ? FOLIAGE_CELLS[Math.floor(random() * FOLIAGE_CELLS.length)]
      : flowerAt(random());
  const pieces: Piece[] = [];

  // A small bush out of the bottom-right corner: up the right edge a little,
  // along the bottom a little, densest at the corner itself.
  const sprout = (isFoliage: boolean) => {
    const angle = between(-35, 115);
    const out = random() ** (isFoliage ? 0.85 : 1.3) * REACH - between(0, 20);
    const isFront = !isFoliage && out < 30 && random() < 0.5;
    const size = isFoliage ? between(110, 190) : isFront ? between(44, 70) : between(56, 110);
    const radians = (angle * Math.PI) / 180;
    const distance = out + (isFoliage ? size * 0.25 : 0);
    const isSide = angle < 35;
    pieces.push({
      cell: cell(isFoliage),
      isFront,
      fx: isSide ? 1 : 1 - between(0, 0.05),
      fy: isSide ? 1 - between(0, 0.12) : 1,
      dx: Math.cos(radians) * distance,
      dy: Math.sin(radians) * distance,
      size,
      rotation: isFoliage ? angle + 90 + between(-12, 12) : between(-180, 180),
      delay: (isFoliage ? 0 : 0.1) + (Math.max(0, out) / REACH) * 0.5 + between(0, 0.15),
      duration: isFoliage ? 0.75 : 0.55,
      overshoot: isFoliage ? 1.2 : 2,
      depth: (isFoliage ? 0 : 1) + random(),
    });
  };

  // A wreath hugging the whole edge, growing round it both ways from the
  // bottom-right corner.
  const ring = (index: number) => {
    const u = (index + random()) / FRAME_COUNT;
    const { fx, fy, normal } = onEdge(u);
    const isFoliage = random() < 0.38;
    const isFront = !isFoliage && random() < 0.3;
    const size = isFoliage ? between(100, 170) : isFront ? between(40, 62) : between(56, 100);
    const angle = normal + between(-45, 45);
    const radians = (angle * Math.PI) / 180;
    const out = isFoliage ? size * 0.18 + between(-6, 14) : isFront ? between(-14, 2) : between(6, 26);
    pieces.push({
      cell: cell(isFoliage),
      isFront,
      fx,
      fy,
      dx: Math.cos(radians) * out,
      dy: Math.sin(radians) * out,
      size,
      rotation: isFoliage ? angle + 90 + between(-12, 12) : between(-180, 180),
      delay: (isFoliage ? 0 : 0.08) + Math.min(u, 1 - u) * 1.1 + between(0, 0.08),
      duration: isFoliage ? 0.6 : 0.45,
      overshoot: isFoliage ? 1.2 : 2,
      depth: (isFoliage ? 0 : 1) + random(),
    });
  };

  if (shape === "frame") {
    for (let index = 0; index < FRAME_COUNT; index++) ring(index);
  } else {
    for (let index = 0; index < FOLIAGE_COUNT; index++) sprout(true);
    for (let index = 0; index < FLOWER_COUNT; index++) sprout(false);
  }
  // Foliage underneath, flowers over it in a shuffled order.
  pieces.sort((a, b) => a.depth - b.depth);
  return {
    back: pieces.filter((piece) => !piece.isFront),
    front: pieces.filter((piece) => piece.isFront),
    end: Math.max(...pieces.map((piece) => piece.delay + piece.duration)),
  };
};

// The part of the element the canvas covers, in px from its top-left corner.
type Region = { left: number; top: number; width: number; height: number };

const regionOf = (shape: Shape, isLeft: boolean, width: number, height: number, scale: number): Region => {
  if (shape === "frame") {
    const margin = FRAME_MARGIN * scale;
    return { left: -margin, top: -margin, width: width + margin * 2, height: height + margin * 2 };
  }
  const corner = CORNER_MARGIN * scale;
  return {
    left: isLeft ? -corner : width - corner,
    top: height - corner,
    width: corner * 2,
    height: corner * 2,
  };
};

const backOut = (t: number, overshoot: number) =>
  1 + (overshoot + 1) * (t - 1) ** 3 + overshoot * (t - 1) ** 2;

const draw = (
  canvas: HTMLCanvasElement,
  pieces: Piece[],
  atlas: HTMLImageElement,
  elapsed: number,
  box: { width: number; height: number; scale: number; isLeft: boolean; region: Region },
) => {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height, scale, isLeft, region } = box;
  const ratio = canvas.width / region.width;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  for (const piece of pieces) {
    const progress = Math.min(1, (elapsed - piece.delay) / piece.duration);
    if (progress <= 0) continue;
    const eased = backOut(progress, piece.overshoot);
    const size = piece.size * scale * Math.max(0, eased);
    const across = piece.fx * width + piece.dx * scale * eased;
    const x = (isLeft ? width - across : across) - region.left;
    const y = piece.fy * height + piece.dy * scale * eased - region.top;
    const turn = piece.rotation - (1 - Math.min(1, eased)) * 50;
    context.setTransform(ratio, 0, 0, ratio, x * ratio, y * ratio);
    context.rotate(((isLeft ? -turn : turn) * Math.PI) / 180);
    context.drawImage(
      atlas,
      (piece.cell % COLUMNS) * CELL,
      Math.floor(piece.cell / COLUMNS) * CELL,
      CELL,
      CELL,
      -size / 2,
      -size / 2,
      size,
      size,
    );
  }
};

/**
 * Flowers growing out of the wrapped element: a small bush from one of its
 * bottom corners, or a wreath round its whole edge. It plays once on scroll
 * into view, or every time `play` turns on.
 */
const FlowerBurst = ({
  className,
  fullWidth = 1250,
  seed = 31,
  shape = "corner",
  side = "right",
  play,
  children,
}: {
  className?: string;
  /** The width the flowers are sized for; they scale with the element from there. */
  fullWidth?: number;
  seed?: number;
  shape?: Shape;
  side?: "left" | "right";
  play?: boolean;
  children: ReactNode;
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const isInView = useInView(ref);
  const { animationsEnabled } = useAnimationPreference();
  const { back: backPieces, front: frontPieces, end } = useMemo(
    () => layout(seed, shape),
    [seed, shape],
  );
  const isPlaying = play ?? isInView;

  useEffect(() => {
    const wrapper = ref.current;
    const back = backRef.current;
    const front = frontRef.current;
    if (!wrapper || !back || !front) return;
    if (animationsEnabled && !isPlaying) {
      for (const canvas of [back, front]) canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const atlas = new Image();
    atlas.src = ATLAS;
    let frame = 0;
    let started = 0;
    let isCancelled = false;
    const isLeft = side === "left";

    const size = () => {
      const width = wrapper.offsetWidth;
      const height = wrapper.offsetHeight;
      const scale = width / fullWidth;
      const region = regionOf(shape, isLeft, width, height, scale);
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      for (const canvas of [back, front]) {
        canvas.style.left = `${region.left}px`;
        canvas.style.top = `${region.top}px`;
        canvas.style.width = `${region.width}px`;
        canvas.style.height = `${region.height}px`;
        canvas.width = Math.round(region.width * ratio);
        canvas.height = Math.round(region.height * ratio);
      }
      return { width, height, scale, isLeft, region };
    };

    let box = size();
    const render = (elapsed: number) => {
      draw(back, backPieces, atlas, elapsed, box);
      draw(front, frontPieces, atlas, elapsed, box);
    };

    const tick = (now: number) => {
      const elapsed = (now - started) / 1000;
      render(elapsed);
      if (elapsed < end) frame = requestAnimationFrame(tick);
    };

    atlas
      .decode()
      .then(() => {
        if (isCancelled) return;
        if (!animationsEnabled) return render(end);
        started = performance.now();
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {});

    const observer = new ResizeObserver(() => {
      box = size();
      if (!started && animationsEnabled) return;
      render(started ? (performance.now() - started) / 1000 : end);
    });
    observer.observe(wrapper);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [isPlaying, animationsEnabled, fullWidth, shape, side, backPieces, frontPieces, end]);

  return (
    <span ref={ref} className={cn("relative isolate block", className)}>
      <canvas ref={backRef} aria-hidden className="pointer-events-none absolute z-0" />
      <span className="relative z-10 block">{children}</span>
      <canvas ref={frontRef} aria-hidden className="pointer-events-none absolute z-20" />
    </span>
  );
};

export default FlowerBurst;
