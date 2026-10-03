"use client";

import { gsap } from "gsap";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  type CSSProperties,
  type PointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { gear } from "~/data/favorites";
import { siteData } from "~/data/site";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import CataloguePage from "~/modules/favorites/components/catalogue-page";
import {
  COVER_FONT,
  departments,
  drawPage,
  pages,
} from "~/modules/favorites/utils/brochure";
import {
  createInkPrinter,
  type InkParams,
  type InkPrinter,
  type InkSettings,
} from "~/modules/favorites/utils/ink-shader";
import cn from "~/utils/cn";

/**
 * How the sheets are inked. These are the Figma shader's own controls, tuned
 * by eye on the open spread. The ink weight isn't here: every department has
 * its own, see the brochure.
 */
const INK_SETTINGS: InkSettings = {
  // Blur amount, blur variation and patch size
  blur: 1.2,
  unevenness: 0,
  patchSize: 0.04,
  // Sharp in the top left corner of the spread, softer towards the bottom right
  focusX: 0,
  focusY: 0,
  focusSize: 0,
  falloff: 1,
  // Stroke length, stroke angle, spray density and detail scale
  strokeLength: 1,
  strokeAngle: 7,
  balance: 0.55,
  detailScale: 0.11,
  // Clump size and edge hardness
  clump: 0.25,
  hardness: 3,
  ink: [0.086, 0.086, 0.086, 1],
  paper: [0.973, 0.965, 0.945, 1],
};


// Typeset at no less than this many device pixels per CSS pixel. Small type
// comes through the ink far better when it's printed large and shown small.
const MIN_SCALE = 2;
const MAX_SCALE = 3;
// Narrower than this, the two pages go one above the other. Matches @2xl
const UPRIGHT_BELOW = 672;

// A leaf is the sheet between two spreads: the right page of one, and on its
// back the left page of the next. The covers are leaves too, so the book
// opens and closes
const LEAVES = pages.length / 2;
// What lies open, from the front cover to the back cover
const SPREADS = [
  "Cover",
  ...departments.map(({ title }) => title),
  "Back cover",
];
const LEAF_INDEXES = Array.from({ length: LEAVES }, (_, leaf) => leaf);

// A whole turn in seconds. A leaf that's already part of the way takes less
const TURN_DURATION = 0.9;
const SHORTEST_TURN = 0.3;
// How far a page lifts under the pointer, as a share of a turn
const LIFT = 0.1;
// A press becomes a drag after this many pixels
const DRAG_FROM = 6;
// Let go faster than this, in pixels per millisecond, a page goes where it's thrown
const FLICK = 0.35;

type Side = "previous" | "next";

// A page held by its edge
interface Hold {
  leaf: number;
  side: Side;
  startX: number;
  startY: number;
  // How far from the fold it was taken hold of
  grip: number;
  // Where the held point was across the fold when the drag began: 1 flat on the right, -1 flat on the left
  from: number;
  canDrag: boolean;
  isDragging: boolean;
  lastX: number;
  lastTime: number;
  velocity: number;
}

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// "#3a9bd8" as the shader takes it: red, green, blue and alpha from 0 to 1
const toRgba = (hex: string): InkSettings["ink"] => [
  Number.parseInt(hex.slice(1, 3), 16) / 255,
  Number.parseInt(hex.slice(3, 5), 16) / 255,
  Number.parseInt(hex.slice(5, 7), 16) / 255,
  1,
];

// The pages print in black on paper, the covers in their own colors
const inkFor = (page: (typeof pages)[number]): InkSettings =>
  "colors" in page
    ? {
        ...INK_SETTINGS,
        ink: toRgba(page.colors.ink),
        paper: toRgba(page.colors.paper),
      }
    : INK_SETTINGS;

// The cover's title face, loaded once however often the book opens. Without
// it the cover falls back to the page's font
let coverFont: Promise<void> | null = null;
const loadCoverFont = () => {
  coverFont ??= new FontFace(COVER_FONT.family, `url(${COVER_FONT.url})`, {
    weight: "900",
  })
    .load()
    .then((face) => {
      document.fonts.add(face);
    })
    .catch(() => {});
  return coverFont;
};

// What a page shows before it's printed
const paperOf = (index: number) => {
  const page = pages[index];
  return page && "colors" in page ? page.colors.paper : undefined;
};

const loadImages = async () => {
  const images = new Map<string, HTMLImageElement>();
  await Promise.all(
    gear.map(async (item) => {
      const image = new Image();
      image.src = item.image;
      try {
        await image.decode();
        images.set(item.id, image);
      } catch {}
    }),
  );
  return images;
};

/**
 * The ink for one page. The sharp spot and its falloff are set on the open
 * spread, where they were tuned, and the shader measures them in diagonals of
 * whatever it prints. So a page gets its half of the spread: the spot moved
 * to where it lies seen from this page, the distances stretched from the
 * spread's diagonal to the page's.
 */
const pageInk = (
  settings: InkSettings,
  inkWeight: number,
  // 0 for the left or upper page, 1 for the right or lower one
  half: number,
  aspect: number,
  isUpright: boolean,
): InkParams => {
  const stretch = isUpright
    ? Math.hypot(aspect, 2) / Math.hypot(aspect, 1)
    : Math.hypot(aspect * 2, 1) / Math.hypot(aspect, 1);

  return {
    ...settings,
    inkWeight,
    focusX: isUpright ? settings.focusX : settings.focusX * 2 - half,
    focusY: isUpright ? settings.focusY * 2 - half : settings.focusY,
    focusSize: settings.focusSize * stretch,
    falloff: settings.falloff * stretch,
  };
};

/**
 * The gear as a store catalogue you page through: a spread per department,
 * every piece in its own cell with a plate, a line of copy and its figures.
 * Each page is typeset on a canvas and printed through the ink shader. The
 * pages are bound into leaves that turn over the fold: by the pager under the
 * book, by clicking a page's outer edge, or by dragging that edge across. It
 * starts shut on its front cover and closes again on the back one.
 */
const Gear = () => {
  const [spread, setSpread] = useState(0);

  const bookRef = useRef<HTMLDivElement>(null);
  const leafRefs = useRef<(HTMLDivElement | null)[]>([]);
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const sourceRef = useRef<HTMLCanvasElement | null>(null);
  const printersRef = useRef<(InkPrinter | null)[] | null>(null);
  const imagesRef = useRef<Map<string, HTMLImageElement> | null>(null);

  // The open spread, known before the next render: turns can follow each other fast
  const spreadRef = useRef(spread);
  // Where every leaf is in its turn: 0 lies on the right, 1 on the left
  const turns = useRef(LEAF_INDEXES.map(() => ({ value: 0 })));
  const hold = useRef<Hold | null>(null);
  const hovered = useRef<Side | null>(null);

  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();

  // The department open, none while the book is closed
  const department = departments[spread - 1];
  const previous = SPREADS[spread - 1];
  const next = SPREADS[spread + 1];

  // Typesets every page and prints it. Without WebGPU a page is shown as
  // typeset, clean instead of inked.
  const print = useCallback(() => {
    const book = bookRef.current;
    const images = imagesRef.current;
    const printers = printersRef.current;
    if (!book || !images || !printers) return;

    sourceRef.current ??= document.createElement("canvas");
    const source = sourceRef.current;
    const ctx = source.getContext("2d");
    if (!ctx) return;

    const isUpright = book.clientWidth < UPRIGHT_BELOW;
    const family = getComputedStyle(book).fontFamily;
    const scale = Math.min(
      MAX_SCALE,
      Math.max(MIN_SCALE, window.devicePixelRatio || 1),
    );

    pages.forEach((page, index) => {
      const canvas = canvasRefs.current[index];
      if (!canvas) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (width === 0 || height === 0) return;

      // One sheet to typeset on for all pages: sizing it also wipes it
      source.width = Math.round(width * scale);
      source.height = Math.round(height * scale);
      const printer = printers[index];
      drawPage(
        ctx,
        width,
        height,
        scale,
        page,
        { owner: siteData.owner.name, images },
        family,
        printer || !("colors" in page) ? undefined : page.colors,
      );

      canvas.width = source.width;
      canvas.height = source.height;
      if (printer) {
        printer.print(
          source,
          pageInk(
            inkFor(page),
            page.inkWeight,
            // The front of a leaf lies on the right
            (index + 1) % 2,
            width / height,
            isUpright,
          ),
          scale,
        );
      } else {
        canvas.getContext("2d")?.drawImage(source, 0, 0);
      }
    });
  }, []);

  // Everything the press needs: the plates, the type and a printer per page.
  // Nothing is drawn before all three are in, as a canvas can only ever be
  // one kind.
  useEffect(() => {
    const book = bookRef.current;
    if (!book) return;
    let isCancelled = false;
    let made: (InkPrinter | null)[] = [];

    Promise.all([
      loadImages(),
      Promise.all(
        pages.map((_, index) => {
          const canvas = canvasRefs.current[index];
          return canvas ? createInkPrinter(canvas).catch(() => null) : null;
        }),
      ),
      document.fonts.ready,
      loadCoverFont(),
    ]).then(([images, printers]) => {
      if (isCancelled) {
        for (const printer of printers) printer?.destroy();
        return;
      }
      made = printers;
      imagesRef.current = images;
      printersRef.current = printers;
      print();
    });

    // Printed again whenever the book changes size
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(print);
    });
    observer.observe(book);

    return () => {
      isCancelled = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      for (const printer of made) printer?.destroy();
      printersRef.current = null;
    };
  }, [print]);

  useEffect(() => {
    const all = turns.current;
    return () => gsap.killTweensOf(all);
  }, []);

  const canAnimate = () => animationsEnabled && !prefersReducedMotion();

  // Puts a leaf where it is in its turn
  const place = useCallback((leaf: number) => {
    const element = leafRefs.current[leaf];
    if (!element) return;
    const { value } = turns.current[leaf];
    element.style.setProperty("--turn", value.toFixed(4));
    // Either pile has the leaf nearest the open spread on top, and over the
    // fold a leaf changes pile
    element.style.zIndex = String(value < 0.5 ? LEAVES - leaf : leaf + 1);

    // Shut, the book is one page wide. It slides over as a cover turns, so
    // the closed book sits in the middle. Stacked, it's one page tall: it
    // slides up to the top and the empty half folds away
    if (leaf === 0 || leaf === LEAVES - 1) {
      const front = turns.current[0].value;
      const back = turns.current[LEAVES - 1].value;
      const style = bookRef.current?.style;
      style?.setProperty("--shift", ((back - (1 - front)) / 4).toFixed(4));
      style?.setProperty("--lift", (-(1 - front) / 2).toFixed(4));
      style?.setProperty("--shut", Math.max(1 - front, back).toFixed(4));
    }
  }, []);

  const moveLeaf = (leaf: number, to: number, ease = "power2.inOut") => {
    const turn = turns.current[leaf];
    if (!canAnimate()) {
      gsap.killTweensOf(turn);
      turn.value = to;
      place(leaf);
      return;
    }

    gsap.to(turn, {
      value: to,
      duration: Math.max(
        SHORTEST_TURN,
        TURN_DURATION * Math.abs(to - turn.value),
      ),
      ease,
      overwrite: true,
      onUpdate: () => place(leaf),
    });
  };

  // The top leaf of a pile: lifted while the pointer is on its edge, flat otherwise
  const settle = (side: Side, at: number, isLifted: boolean) => {
    const leaf = side === "next" ? at : at - 1;
    if (leaf < 0 || leaf >= LEAVES) return;
    const flat = side === "next" ? 0 : 1;
    moveLeaf(
      leaf,
      isLifted && canAnimate() ? Math.abs(flat - LIFT) : flat,
      "power2.out",
    );
  };

  const open = (target: number) => {
    spreadRef.current = target;
    setSpread(target);
  };

  const turn = (side: Side) => {
    const from = spreadRef.current;
    const target = side === "next" ? from + 1 : from - 1;
    if (target < 0 || target > LEAVES) return;
    haptic.onClick();

    // The leaf between the two spreads goes over, whichever way
    moveLeaf(Math.min(from, target), side === "next" ? 1 : 0);
    open(target);
    // With the pointer still on that edge, the page now on top lifts in turn
    if (hovered.current === side) settle(side, target, true);
  };

  const press = (event: PointerEvent<HTMLDivElement>, side: Side) => {
    const book = bookRef.current;
    const leaf = side === "next" ? spreadRef.current : spreadRef.current - 1;
    if (!book || event.button !== 0 || leaf < 0 || leaf >= LEAVES) return;

    const { left, width } = book.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    hold.current = {
      leaf,
      side,
      startX: event.clientX,
      startY: event.clientY,
      // Never so close to the fold that the page whips over
      grip: Math.max(
        Math.abs(event.clientX - (left + width / 2)),
        width * 0.15,
      ),
      from: 0,
      // Stacked pages only turn on a click: dragging them would fight the scroll
      canDrag: book.clientWidth >= UPRIGHT_BELOW && canAnimate(),
      isDragging: false,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    const held = hold.current;
    if (!held?.canDrag) return;
    const turn = turns.current[held.leaf];

    if (!held.isDragging) {
      if (Math.abs(event.clientX - held.startX) < DRAG_FROM) return;
      // Picked up where it is, so a lifted or still moving page doesn't jump
      gsap.killTweensOf(turn);
      held.isDragging = true;
      held.from = Math.cos(Math.PI * turn.value);
      held.startX = event.clientX;
    }

    // The point held stays under the pointer. Seen from above it travels a
    // half circle over the fold, so the turn is the arc cosine of where it is
    const reach = held.from + (event.clientX - held.startX) / held.grip;
    turn.value = Math.acos(Math.min(1, Math.max(-1, reach))) / Math.PI;
    place(held.leaf);

    const elapsed = event.timeStamp - held.lastTime;
    if (elapsed > 0) held.velocity = (event.clientX - held.lastX) / elapsed;
    held.lastX = event.clientX;
    held.lastTime = event.timeStamp;
  };

  const release = (
    event: PointerEvent<HTMLDivElement>,
    isCancelled = false,
  ) => {
    const held = hold.current;
    if (!held) return;
    hold.current = null;

    if (!held.isDragging) {
      // A press that went nowhere is a click. A cancelled one was a scroll
      const travel = Math.hypot(
        event.clientX - held.startX,
        event.clientY - held.startY,
      );
      if (!isCancelled && travel < DRAG_FROM) turn(held.side);
      return;
    }

    // Let go, a page thrown goes where it was thrown. Otherwise it falls to
    // the side it's nearest
    const speed = event.timeStamp - held.lastTime < 80 ? held.velocity : 0;
    const isOver =
      speed < -FLICK ||
      (speed <= FLICK && turns.current[held.leaf].value > 0.5);
    const target = held.leaf + (isOver ? 1 : 0);
    moveLeaf(held.leaf, isOver ? 1 : 0, "power2.out");
    if (target !== spreadRef.current) {
      haptic.onClick();
      open(target);
    }
    if (hovered.current) settle(hovered.current, target, true);
  };

  const hover = (
    event: PointerEvent<HTMLDivElement>,
    side: Side,
    isOver: boolean,
  ) => {
    if (event.pointerType !== "mouse") return;
    hovered.current = isOver ? side : null;
    if (!hold.current) settle(side, spreadRef.current, isOver);
  };

  const canvasAt = (index: number) => (canvas: HTMLCanvasElement | null) => {
    canvasRefs.current[index] = canvas;
  };

  return (
    // Fills the modal's height, so on small screens the book sits in the
    // middle with the pager at the bottom
    <div className="@container flex w-full flex-1 flex-col">
      {/*
        The book. Its two halves lie side by side, or one above the other
        where it's narrow, and the leaves turn over the fold between them
      */}
      {/*
        Stacked, a page is never taller than the modal shows, so it's read
        whole. The half that folds away while the book is shut is cut off here,
        so it leaves nothing to scroll
      */}
      <div className="flex @2xl:flex-none flex-1 flex-col justify-center overflow-y-clip @2xl:overflow-y-visible">
        <div
          ref={bookRef}
          // Starts shut on the front cover, see place()
          style={
            {
              "--shift": "-0.25",
              "--lift": "-0.5",
              "--shut": "1",
            } as CSSProperties
          }
          className="perspective-[1600cqw] @2xl:perspective-[400cqw] relative @2xl:mx-0 mx-auto @2xl:mb-0 mb-[calc(var(--shut)*-1*min(105cqw,100cqh))] @2xl:aspect-100/46 aspect-100/210 @2xl:w-full w-[min(100%,100cqh/1.05)] @2xl:translate-x-[calc(var(--shift)*100%)] @2xl:translate-y-0 translate-y-[calc(var(--lift)*100%)]"
        >

          {/* Hinged on the fold. Its back is the left page of the next spread */}
          {LEAF_INDEXES.map((leaf) => (
            <div
              key={leaf}
              ref={(element) => {
                leafRefs.current[leaf] = element;
              }}
              style={{ zIndex: LEAVES - leaf }}
              className="transform-3d transform-[rotateX(calc(var(--turn,0)*180deg))] @2xl:transform-[rotateY(calc(var(--turn,0)*-180deg))] absolute right-0 bottom-0 @2xl:h-full h-1/2 @2xl:w-1/2 w-full @2xl:origin-left origin-top"
            >
              <CataloguePage
                side="right"
                isLeaf
                paper={paperOf(leaf * 2)}
                canvasRef={canvasAt(leaf * 2)}
              />
              <CataloguePage
                side="left"
                isLeaf
                paper={paperOf(leaf * 2 + 1)}
                canvasRef={canvasAt(leaf * 2 + 1)}
              />
            </div>
          ))}

          {/*
            The outer edge of either page takes hold of it: it lifts under the
            pointer, a click turns it and a drag carries it over. The pager
            below does the same for the keyboard
          */}
          {(["previous", "next"] as const).map((side) => (
            <div
              key={side}
              aria-hidden
              onPointerDown={(event) => press(event, side)}
              onPointerMove={drag}
              onPointerUp={(event) => release(event)}
              onPointerCancel={(event) => release(event, true)}
              onPointerEnter={(event) => hover(event, side, true)}
              onPointerLeave={(event) => hover(event, side, false)}
              className={cn(
                "absolute z-20 @2xl:h-full h-[10%] @2xl:w-[9%] w-full touch-pan-y select-none",
                side === "next" ? "right-0 bottom-0" : "top-0 left-0",
                (side === "next" ? next : previous) && "cursor-pointer",
              )}
            />
          ))}
        </div>
      </div>

      {/*
        The pager hangs off the bottom edge at the fold, like a ribbon. Where
        the pages are stacked and scroll, it stays in view at the bottom
      */}
      <div className="pointer-events-none @2xl:relative sticky @2xl:bottom-auto bottom-0 z-10 @2xl:-mt-4 mt-4 flex justify-center">
        <div className="pointer-events-auto flex h-8 items-center gap-1 rounded-full bg-neutral-950 p-1 text-neutral-50 shadow-[0_8px_16px_-8px_rgb(0_0_0/0.5)]">
          <button
            type="button"
            aria-label={
              previous ? `Previous pages: ${previous}` : "Previous pages"
            }
            disabled={!previous}
            onClick={() => turn("previous")}
            onMouseEnter={haptic.onMouseEnter}
            className="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-neutral-50/15 focus-visible:outline-2 focus-visible:outline-primary-500 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="size-3.5" />
          </button>
          <p className="min-w-40 px-1 text-center text-xs">
            {SPREADS[spread]}
            {department && (
              <span className="ml-2 text-neutral-50/50 tabular-nums">
                {spread} / {departments.length}
              </span>
            )}
          </p>
          <button
            type="button"
            aria-label={next ? `Next pages: ${next}` : "Next pages"}
            disabled={!next}
            onClick={() => turn("next")}
            onMouseEnter={haptic.onMouseEnter}
            className="flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-neutral-50/15 focus-visible:outline-2 focus-visible:outline-primary-500 disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="size-3.5" />
          </button>
        </div>
      </div>

      {/* The pages are pictures, so what's printed on the open ones is repeated here to be read out */}
      <div className="sr-only" aria-live="polite">
        <h3>{SPREADS[spread]}</h3>
        {department && (
          <ul>
            {department.items.map((item) => (
              <li key={item.id}>
                {item.name}. {item.blurb}.{" "}
                {item.stats
                  .map((stat) => `${stat.label}: ${stat.value}`)
                  .join(", ")}
                .
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default Gear;
