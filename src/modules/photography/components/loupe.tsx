"use client";

import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { type RefObject, useEffect, useRef } from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { holdGraphics } from "~/modules/core/utils/gpu-busy";
import { formatNumber } from "~/modules/photography/components/print-card";
import {
  BEZEL_WIDTH,
  createLoupeGlass,
  LENS_ROOM,
  type LoupeGlass,
} from "~/modules/photography/utils/loupe-glass";
import {
  PAPER_BORDER,
  PAPER_LABEL,
  type Print,
} from "~/modules/photography/utils/print-layouts";

gsap.registerPlugin(Draggable, InertiaPlugin);

const ZOOM = 2.5;

const SIZE = { small: 130, large: 160 };

const INSET = 48;

const LIFTED = 1.05;

const EDGE_ROOM = 2;

const MAX_PIXEL_RATIO = 3;

const KEPT_PHOTOS = 6;

const SHARPEN_MS = 200;

const PAPER_RADIUS = 16;
const PHOTO_RADIUS = 10;
const CAPTION_SIZE = 10;
const CAPTION_GAP = 6;
const TABLE = "#faf9f9";
const PAPER = "#ffffff";
const PHOTO_EMPTY = "#d8d8d8";
const CAPTION = "#878787";
const OUTLINE = "rgba(15, 15, 15, 0.1)";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const toDegrees = (rotate: string) =>
  rotate === "none" ? 0 : Number.parseFloat(rotate);
const toScale = (scale: string) =>
  scale === "none" ? 1 : Number.parseFloat(scale);

interface Lying {
  card: HTMLButtonElement;
  print: Print;
  number: number;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  paperRotation: number;
  paperScale: number;
}

interface Photo {
  image: HTMLImageElement;
  isReady: boolean;
  readyAt: number;
}

interface Props {
  stageRef: RefObject<HTMLDivElement | null>;
  cardRefs: RefObject<(HTMLButtonElement | null)[]>;
  prints: Print[];
  numbers: number[];
  isOn: boolean;
  onLost: () => void;
}

// A lens on the canvas. What it says goes to whoever is drawing with it at
// the time, or, before anyone is, the loupe's own `onLost`
const glassOn = (
  canvas: HTMLCanvasElement,
  onLost: RefObject<() => void>,
  lost: RefObject<(() => void) | null>,
  ready: RefObject<(() => void) | null>,
) =>
  createLoupeGlass(
    canvas,
    () => (lost.current ?? onLost.current)(),
    () => ready.current?.(),
  );

const Loupe = ({
  stageRef,
  cardRefs,
  prints,
  numbers,
  isOn,
  onLost,
}: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const { animationsEnabled } = useAnimationPreference();
  const printsRef = useRef(prints);
  printsRef.current = prints;
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;
  const onLostRef = useRef(onLost);
  onLostRef.current = onLost;
  const animateRef = useRef(animationsEnabled);
  animateRef.current = animationsEnabled;
  const glassRef = useRef<LoupeGlass | null>(null);

  useEffect(() => () => glassRef.current?.release(), []);

  const readyRef = useRef<(() => void) | null>(null);
  const lostRef = useRef<(() => void) | null>(null);

  // The lens is made first thing, before it's in view: its context and its
  // shader then go ahead of heavier graphics work on the page.
  const warmRef = useRef<LoupeGlass | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const free = holdGraphics();
    const glass = createLoupeGlass(
      canvas,
      () => {
        free();
        (lostRef.current ?? onLostRef.current)();
      },
      () => {
        free();
        readyRef.current?.();
      },
    );
    if (!glass) {
      free();
      onLostRef.current();
      return;
    }
    warmRef.current = glass;
    glassRef.current = glass;
    return () => {
      free();
      if (warmRef.current !== glass) return;
      warmRef.current = null;
      glass.destroy();
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const handle = handleRef.current;
    if (!isOn || !stage || !canvas || !handle) return;

    const content = document.createElement("canvas");
    const context = content.getContext("2d", { alpha: false });
    if (!context) return;

    let isShown = false;
    lostRef.current = () => {
      hide();
      onLostRef.current();
    };
    readyRef.current = () => {
      needsDraw = true;
      if (isShown) frame();
    };
    // The one made ahead, the first time; a new one after it's put away
    const glass = warmRef.current ?? glassOn(canvas, onLostRef, lostRef, readyRef);
    warmRef.current = null;
    if (!glass) {
      onLostRef.current();
      return;
    }
    glassRef.current = glass;

    const font = `${CAPTION_SIZE}px ${getComputedStyle(stage).fontFamily}`;
    context.font = font;
    const zero = context.measureText("0");
    const figure = zero.width;
    const middle =
      ((zero.fontBoundingBoxAscent || CAPTION_SIZE * 0.9) -
        (zero.fontBoundingBoxDescent || CAPTION_SIZE * 0.25)) /
      2;

    let size = 0;
    let pixelRatio = 1;
    let drawn: number[] = [];
    let needsDraw = true;

    const tableBounds = () => ({
      minX: 0,
      maxX: stage.clientWidth,
      minY: 0,
      maxY: stage.clientHeight,
    });

    // Setting a canvas's size clears it, so this is drawn again after
    const fit = () => {
      size = window.matchMedia("(min-width: 768px)").matches
        ? SIZE.large
        : SIZE.small;
      pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
      const pixels = Math.round((size + LENS_ROOM * 2) * pixelRatio);
      canvas.width = pixels;
      canvas.height = pixels;
      canvas.style.width = `${pixels / pixelRatio}px`;
      canvas.style.height = `${pixels / pixelRatio}px`;
      const contentPixels =
        pixels - 2 * Math.floor((LENS_ROOM - EDGE_ROOM) * pixelRatio);
      content.width = contentPixels;
      content.height = contentPixels;
      const across = size + BEZEL_WIDTH * 2;
      gsap.set(handle, { width: across, height: across });
      needsDraw = true;
    };

    const photos = new Map<string, Photo>();

    const sharpPhoto = (print: Print): Photo | null => {
      let photo = photos.get(print.id);
      if (photo) {
        photos.delete(print.id);
      } else {
        const image = new Image();
        // From another domain, so the lens may only draw it when it was
        // asked for with CORS. Under an address of its own, so a cached copy without CORS can't be reused.
        image.crossOrigin = "anonymous";
        const source = new URL(print.image, location.href);
        source.searchParams.set("loupe", "");
        image.src = source.href;
        const loading: Photo = { image, isReady: false, readyAt: 0 };
        image.decode().then(
          () => {
            loading.isReady = true;
            loading.readyAt = performance.now();
            needsDraw = true;
          },
          () => {},
        );
        photo = loading;
      }
      photos.set(print.id, photo);
      if (photos.size > KEPT_PHOTOS) {
        const oldest = photos.keys().next().value;
        if (oldest !== undefined) photos.delete(oldest);
      }
      return photo.isReady ? photo : null;
    };

    // The photo the card shows, already loaded, so the lens is never empty
    const cardPhoto = (card: HTMLButtonElement) => {
      const image = card.querySelector("img");
      return image?.complete && image.naturalWidth > 0 ? image : null;
    };

    const captions = new Map<string, { number: string; title: string }>();

    const captionFor = (print: Print, number: number, width: number) => {
      const key = `${print.id} ${number} ${Math.round(width)}`;
      let caption = captions.get(key);
      if (!caption) {
        const digits = formatNumber(number);
        const room = width - digits.length * figure - CAPTION_GAP;
        let title = print.title;
        if (context.measureText(title).width > room) {
          while (
            title.length > 0 &&
            context.measureText(`${title}…`).width > room
          ) {
            title = title.slice(0, -1);
          }
          title = `${title}…`;
        }
        caption = { number: digits, title };
        captions.set(key, caption);
      }
      return caption;
    };

    const drawCover = (
      image: HTMLImageElement,
      x: number,
      y: number,
      width: number,
      height: number,
    ) => {
      const scale = Math.max(
        width / image.naturalWidth,
        height / image.naturalHeight,
      );
      const cropWidth = width / scale;
      const cropHeight = height / scale;
      context.drawImage(
        image,
        (image.naturalWidth - cropWidth) / 2,
        (image.naturalHeight - cropHeight) / 2,
        cropWidth,
        cropHeight,
        x,
        y,
        width,
        height,
      );
    };

    const drawPrint = (lying: Lying) => {
      const { card, print, number, width, height } = lying;
      const aspect = print.width / print.height;
      const photoWidth = Math.min(
        width - PAPER_BORDER * 2,
        aspect * (height - PAPER_BORDER - PAPER_LABEL),
      );
      const photoHeight = photoWidth / aspect;
      const paperWidth = photoWidth + PAPER_BORDER * 2;
      const paperHeight = photoHeight + PAPER_BORDER + PAPER_LABEL;
      const left = -paperWidth / 2;
      const top = -paperHeight / 2;

      context.save();
      context.translate(lying.x, lying.y);
      context.rotate((lying.rotation * Math.PI) / 180);
      context.scale(lying.scaleX, lying.scaleY);
      context.rotate((lying.paperRotation * Math.PI) / 180);
      context.scale(lying.paperScale, lying.paperScale);

      context.fillStyle = PAPER;
      context.beginPath();
      context.roundRect(left, top, paperWidth, paperHeight, PAPER_RADIUS);
      context.fill();

      context.save();
      context.beginPath();
      context.roundRect(
        left + PAPER_BORDER,
        top + PAPER_BORDER,
        photoWidth,
        photoHeight,
        PHOTO_RADIUS,
      );
      context.clip();
      context.fillStyle = PHOTO_EMPTY;
      context.fill();
      const sharp = sharpPhoto(print);
      const shown = sharp
        ? Math.min((performance.now() - sharp.readyAt) / SHARPEN_MS, 1)
        : 0;
      const soft = shown < 1 ? cardPhoto(card) : null;
      if (soft) {
        drawCover(
          soft,
          left + PAPER_BORDER,
          top + PAPER_BORDER,
          photoWidth,
          photoHeight,
        );
      }
      if (sharp) {
        context.globalAlpha = shown;
        drawCover(
          sharp.image,
          left + PAPER_BORDER,
          top + PAPER_BORDER,
          photoWidth,
          photoHeight,
        );
        if (shown < 1) needsDraw = true;
      }
      context.restore();

      context.strokeStyle = OUTLINE;
      context.lineWidth = 1;
      context.beginPath();
      context.roundRect(
        left + 0.5,
        top + 0.5,
        paperWidth - 1,
        paperHeight - 1,
        PAPER_RADIUS - 0.5,
      );
      context.stroke();

      const caption = captionFor(print, number, photoWidth);
      const baseline =
        top + PAPER_BORDER + photoHeight + PAPER_LABEL / 2 + middle;
      let x = left + PAPER_BORDER;
      context.fillStyle = CAPTION;
      context.globalAlpha = 0.6;
      context.textAlign = "center";
      for (const digit of caption.number) {
        context.fillText(digit, x + figure / 2, baseline);
        x += figure;
      }
      context.globalAlpha = 1;
      context.textAlign = "left";
      context.fillText(caption.title, x + CAPTION_GAP, baseline);

      context.restore();
    };

    const paint = (centerX: number, centerY: number, lying: Lying[]) => {
      const scale = ZOOM * pixelRatio;
      const half = content.width / 2;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = TABLE;
      context.fillRect(0, 0, content.width, content.height);
      context.setTransform(
        scale,
        0,
        0,
        scale,
        half - centerX * scale,
        half - centerY * scale,
      );
      context.font = font;
      context.textBaseline = "alphabetic";
      context.imageSmoothingQuality = "high";
      for (const print of lying) drawPrint(print);
    };

    const frame = () => {
      const bounds = stage.getBoundingClientRect();
      const originX = bounds.left + stage.clientLeft;
      const originY = bounds.top + stage.clientTop;
      const wantX = originX + (gsap.getProperty(handle, "x") as number);
      const wantY = originY + (gsap.getProperty(handle, "y") as number);

      const canvasSize = canvas.width / pixelRatio;
      const left =
        Math.round((wantX - canvasSize / 2) * pixelRatio) / pixelRatio;
      const top =
        Math.round((wantY - canvasSize / 2) * pixelRatio) / pixelRatio;
      const centerX = left + canvasSize / 2;
      const centerY = top + canvasSize / 2;

      // The cards that reach under it, in the order they lie in, with a
      // hovered or focused one on top, like on the page
      const reach = content.width / 2 / (ZOOM * pixelRatio);
      const focused = document.activeElement;
      const lying: Lying[] = [];
      const raised: Lying[] = [];
      // Compared from the table's corner, not the window's: scrolling moves
      // the table and the lens together and changes nothing under the lens.
      const seen = [left - originX, top - originY];
      for (const [index, card] of cardRefs.current.entries()) {
        const print = printsRef.current[index];
        if (!card || !print) continue;
        const rect = card.getBoundingClientRect();
        if (
          rect.right < centerX - reach ||
          rect.left > centerX + reach ||
          rect.bottom < centerY - reach ||
          rect.top > centerY + reach
        ) {
          continue;
        }

        const paper = getComputedStyle(card.firstElementChild ?? card);

        const placed: Lying = {
          card,
          print,
          number: numbersRef.current[index] ?? index + 1,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          rotation: gsap.getProperty(card, "rotation") as number,
          width: card.offsetWidth,
          height: card.offsetHeight,
          scaleX: gsap.getProperty(card, "scaleX") as number,
          scaleY: gsap.getProperty(card, "scaleY") as number,
          paperRotation: toDegrees(paper.rotate),
          paperScale: toScale(paper.scale),
        };
        const isRaised =
          card.matches(":hover") ||
          (card === focused && card.matches(":focus-visible"));
        if (isRaised) raised.push(placed);
        else lying.push(placed);
        seen.push(
          index,
          isRaised ? 1 : 0,
          placed.x - originX,
          placed.y - originY,
          placed.rotation,
          placed.width,
          placed.height,
          placed.scaleX,
          placed.scaleY,
          placed.paperRotation,
          placed.paperScale,
        );
      }
      lying.push(...raised);

      if (
        !needsDraw &&
        seen.length === drawn.length &&
        seen.every((value, index) => value === drawn[index])
      ) {
        return;
      }
      needsDraw = false;
      drawn = seen;

      gsap.set(canvas, { x: left - originX, y: top - originY });
      paint(centerX, centerY, lying);
      glass.draw(content, (size / 2) * pixelRatio, pixelRatio);
    };

    let frameRequest = 0;
    const loop = () => {
      frame();
      frameRequest = requestAnimationFrame(loop);
    };

    const hasMotion = () => animateRef.current && !prefersReducedMotion();

    // Put down a little after the prints, settling into place like they do.
    // It can be picked up once it's coming down
    const show = () => {
      if (isShown) return;
      isShown = true;
      needsDraw = true;
      frame();
      const motion = hasMotion();
      const delay = motion ? 0.6 : 0;
      gsap.killTweensOf(canvas);
      gsap.fromTo(
        canvas,
        { autoAlpha: 0, scale: LIFTED },
        {
          autoAlpha: 1,
          scale: 1,
          duration: motion ? 0.6 : 0,
          delay,
          ease: "power3.out",
        },
      );
      gsap.set(handle, { visibility: "visible", delay });
      frameRequest = requestAnimationFrame(loop);
    };

    const hide = () => {
      if (!isShown) return;
      isShown = false;
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      gsap.killTweensOf(handle);
      gsap.set(handle, { visibility: "hidden" });
      gsap.killTweensOf(canvas);
      gsap.to(canvas, {
        autoAlpha: 0,
        scale: LIFTED,
        duration: hasMotion() ? 0.3 : 0,
        ease: "power2.in",
      });
    };

    const lift = (isLifted: boolean) =>
      gsap.to(canvas, {
        scale: isLifted ? LIFTED : 1,
        duration: hasMotion() ? 0.2 : 0,
        ease: "power2.out",
        overwrite: "auto",
      });

    fit();
    gsap.set(handle, {
      xPercent: -50,
      yPercent: -50,
      x: stage.clientWidth - size / 2 - BEZEL_WIDTH - INSET,
      y: stage.clientHeight - size / 2 - BEZEL_WIDTH - INSET,
    });

    const draggable = Draggable.create(handle, {
      type: "x,y",
      bounds: tableBounds(),
      edgeResistance: 1,
      zIndexBoost: false,
      onPress: function (this: Draggable) {
        this.vars.inertia = hasMotion();
        lift(true);
      },
      onRelease: () => {
        lift(false);
      },
    })[0];

    const keepPress = (event: Event) => event.stopPropagation();

    const handleResize = () => {
      fit();
      draggable.applyBounds(tableBounds());
      if (isShown) frame();
    };

    show();

    handle.addEventListener("pointerdown", keepPress);
    handle.addEventListener("touchstart", keepPress, { passive: true });
    window.addEventListener("resize", handleResize);

    return () => {
      hide();
      draggable.kill();
      handle.removeEventListener("pointerdown", keepPress);
      handle.removeEventListener("touchstart", keepPress);
      window.removeEventListener("resize", handleResize);
      readyRef.current = null;
      lostRef.current = null;
      glass.destroy();
      photos.clear();
      captions.clear();
    };
  }, [isOn, stageRef, cardRefs]);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <canvas ref={canvasRef} className="invisible absolute top-0 left-0" />
      <div
        ref={handleRef}
        className="pointer-events-auto invisible absolute top-0 left-0 rounded-full"
      />
    </div>
  );
};

export default Loupe;
