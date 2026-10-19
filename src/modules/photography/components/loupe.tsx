"use client";

import { gsap } from "gsap";
import { Draggable } from "gsap/Draggable";
import { InertiaPlugin } from "gsap/InertiaPlugin";
import { type RefObject, useEffect, useRef } from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
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

// How much larger the loupe shows the table
const ZOOM = 2.5;

// The glass across, in CSS pixels: on small screens, and from md up. Its
// bezel goes around it
const SIZE = { small: 130, large: 160 };

// It's put down this far in from the frame's bottom right corner, in CSS
// pixels, clear of the hint at the bottom
const INSET = 48;

// Picked up, it comes off the table a little, like a print does
const LIFTED = 1.05;

// What's under the lens is drawn a little past its edge, in CSS pixels, for
// its soft edge to blend into
const EDGE_ROOM = 2;

// Canvas pixels to a CSS pixel, at most
const MAX_PIXEL_RATIO = 3;

// The photos under the loupe are the originals, straight from the media
// bucket: it zooms in, so it might as well have every pixel, and nothing has
// to be resized for it. The ones most recently looked at are kept
const KEPT_PHOTOS = 6;

// A print as print-card.tsx lays it out, in CSS pixels, and the colors from
// global.css: the table is the page behind it
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

// A computed `rotate`, in degrees, and a computed `scale`, the same both ways
const toDegrees = (rotate: string) =>
  rotate === "none" ? 0 : Number.parseFloat(rotate);
const toScale = (scale: string) =>
  scale === "none" ? 1 : Number.parseFloat(scale);

// A card as it lies on the table now
interface Lying {
  card: HTMLButtonElement;
  print: Print;
  number: number;
  // Its center on the screen, its turn in degrees, and its size and scale
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  scaleX: number;
  scaleY: number;
  // The paper's own turn and scale inside it, while it's picked up
  paperRotation: number;
  paperScale: number;
}

interface Photo {
  image: HTMLImageElement;
  isReady: boolean;
}

interface Props {
  stageRef: RefObject<HTMLDivElement | null>;
  // The prints' cards, and the prints and their numbers in the same order
  cardRefs: RefObject<(HTMLButtonElement | null)[]>;
  prints: Print[];
  numbers: number[];
  // On the table: it's taken off while the prints are in a grid
  isOn: boolean;
  // The lens couldn't be made, or the GPU dropped it
  onLost: () => void;
}

/**
 * A loupe lying on the photo table: a round lens of the footer's glass, see
 * loupe-glass.ts, that shows what's under it larger. It's put down in the
 * frame's bottom right corner, and picked up, dragged and thrown like the
 * table itself. It stays where it was put while the table moves under it.
 *
 * A canvas can't see the page, so each frame the prints under the lens are
 * drawn again, larger: where each card lies now, read from the page, so the
 * loupe follows the table as it's dragged, thrown and shuffled. The photos
 * are sharp copies once those are in, the cards' own until then. Only drawn
 * when something under it moved.
 */
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
  // Read in the drawing, which shouldn't be set up again when these change
  const printsRef = useRef(prints);
  printsRef.current = prints;
  const numbersRef = useRef(numbers);
  numbersRef.current = numbers;
  const onLostRef = useRef(onLost);
  onLostRef.current = onLost;
  const animateRef = useRef(animationsEnabled);
  animateRef.current = animationsEnabled;
  // The lens last made on the canvas, for handing its context back
  const glassRef = useRef<LoupeGlass | null>(null);

  // The canvas's context is handed back once the loupe leaves the page. Not
  // when it's taken off: it's put back on the same canvas
  useEffect(() => () => glassRef.current?.release(), []);

  useEffect(() => {
    const stage = stageRef.current;
    const canvas = canvasRef.current;
    const handle = handleRef.current;
    if (!isOn || !stage || !canvas || !handle) return;

    // What's under the lens, magnified, for the glass to bend
    const content = document.createElement("canvas");
    const context = content.getContext("2d", { alpha: false });
    if (!context) return;

    let isShown = false;
    const glass = createLoupeGlass(
      canvas,
      () => {
        hide();
        onLostRef.current();
      },
      // Compiled in the background: what's under the lens is drawn once
      // it's ready
      () => {
        needsDraw = true;
        if (isShown) frame();
      },
    );
    if (!glass) {
      onLostRef.current();
      return;
    }
    glassRef.current = glass;

    // The captions, in the page's font. Measured once: tabular figures are
    // all about as wide as a zero, and CSS centers a line's text by the
    // font's ascent and descent
    const font = `${CAPTION_SIZE}px ${getComputedStyle(stage).fontFamily}`;
    context.font = font;
    const zero = context.measureText("0");
    const figure = zero.width;
    const middle =
      ((zero.fontBoundingBoxAscent || CAPTION_SIZE * 0.9) -
        (zero.fontBoundingBoxDescent || CAPTION_SIZE * 0.25)) /
      2;

    // ── Size ─────────────────────────────────────────────────────────────────

    let size = 0;
    let pixelRatio = 1;
    // What was last drawn, and whether it has to be drawn again regardless
    let drawn: number[] = [];
    let needsDraw = true;

    // Its center stays on the table, from the frame's top left
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
      // Smaller than the canvas by as much on every side, so their pixels
      // line up and the lens doesn't blur what's under it
      const contentPixels =
        pixels - 2 * Math.floor((LENS_ROOM - EDGE_ROOM) * pixelRatio);
      content.width = contentPixels;
      content.height = contentPixels;
      // What's picked up is the lens with its bezel, round, so the prints
      // around it can still be clicked
      const across = size + BEZEL_WIDTH * 2;
      gsap.set(handle, { width: across, height: across });
      needsDraw = true;
    };

    // ── Photos and captions ──────────────────────────────────────────────────

    const photos = new Map<string, Photo>();

    // A print's original photo, or null until it's in. Asked for the first
    // time it's under the lens
    const sharpPhoto = (print: Print) => {
      let photo = photos.get(print.id);
      if (photo) {
        photos.delete(print.id);
      } else {
        const image = new Image();
        // From another domain, so the lens may only draw it when it was
        // asked for with CORS. Under an address of its own: the same file
        // opened full screen was loaded without, and the browser would hand
        // that copy back, which the lens can't use
        image.crossOrigin = "anonymous";
        const source = new URL(print.image, location.href);
        source.searchParams.set("loupe", "");
        image.src = source.href;
        const loading: Photo = { image, isReady: false };
        image.decode().then(
          () => {
            loading.isReady = true;
            needsDraw = true;
          },
          // The card's own photo stays in its place
          () => {},
        );
        photo = loading;
      }
      // The most recently looked at last, so the oldest is let go
      photos.set(print.id, photo);
      if (photos.size > KEPT_PHOTOS) {
        const oldest = photos.keys().next().value;
        if (oldest !== undefined) photos.delete(oldest);
      }
      return photo.isReady ? photo.image : null;
    };

    // The photo the card shows, already loaded, so the lens is never empty
    const cardPhoto = (card: HTMLButtonElement) => {
      const image = card.querySelector("img");
      return image?.complete && image.naturalWidth > 0 ? image : null;
    };

    const captions = new Map<string, { number: string; title: string }>();

    // The number, and the title cut short with an ellipsis where it doesn't
    // fit, like on the paper
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

    // ── Drawing ──────────────────────────────────────────────────────────────

    // Fills the box and crops the rest, like object-cover
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

    // A print the way PrintCard draws it: the paper fits inside the card,
    // with the photo inset and the caption below it
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
      // The paper turns and scales around the card's center, which it shares
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
      const image = sharpPhoto(print) ?? cardPhoto(card);
      if (image) {
        drawCover(
          image,
          left + PAPER_BORDER,
          top + PAPER_BORDER,
          photoWidth,
          photoHeight,
        );
      }
      context.restore();

      // The outline, inside the paper's edge
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

      // The number faint, each figure in a cell of its own, then the title
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

    // Everything under the lens, magnified around its center. The frame's
    // edge needn't be: the frame cuts the lens off, and magnifying only
    // pushes what's past that edge further out
    const paint = (centerX: number, centerY: number, lying: Lying[]) => {
      const scale = ZOOM * pixelRatio;
      const half = content.width / 2;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.fillStyle = TABLE;
      context.fillRect(0, 0, content.width, content.height);
      // From here on in CSS pixels on the screen
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

    // Where the lens is and what lies under it, drawn when any of that
    // changed since the last frame
    const frame = () => {
      const bounds = stage.getBoundingClientRect();
      const originX = bounds.left + stage.clientLeft;
      const originY = bounds.top + stage.clientTop;
      const wantX = originX + (gsap.getProperty(handle, "x") as number);
      const wantY = originY + (gsap.getProperty(handle, "y") as number);

      // The canvas on whole device pixels, so it isn't blurred. The lens
      // magnifies around its own center, where it's held within a pixel
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
      const seen = [left, top, originX, originY];
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

        // A print picked up under the pointer straightens and grows a little,
        // see PrintCard: its paper's, read as it is mid-transition
        const paper = getComputedStyle(card.firstElementChild ?? card);

        // A card turned around its center shares that center with its box
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
          placed.x,
          placed.y,
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

    // ── Showing ──────────────────────────────────────────────────────────────

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
      // In place and drawn first, so it doesn't come in with an old picture
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

    // Taken off the table, with the picture it last drew
    const hide = () => {
      if (!isShown) return;
      isShown = false;
      cancelAnimationFrame(frameRequest);
      frameRequest = 0;
      // Stopped mid-throw, too
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

    // ── Picking up ───────────────────────────────────────────────────────────

    const lift = (isLifted: boolean) =>
      gsap.to(canvas, {
        scale: isLifted ? LIFTED : 1,
        duration: hasMotion() ? 0.2 : 0,
        ease: "power2.out",
        overwrite: "auto",
      });

    fit();
    // Put down in the frame's bottom right corner, centered on where it's held
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
      // Raising the z-index on press would lift it over the hint
      zIndexBoost: false,
      onPress: function (this: Draggable) {
        // Thrown like the table, where there's motion. Read on release
        this.vars.inertia = hasMotion();
        lift(true);
      },
      onRelease: () => {
        lift(false);
      },
    })[0];

    // The table's Draggable listens on the frame, for pointers and touches
    // both, so a press on the lens is kept from it
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
      glass.destroy();
      photos.clear();
      captions.clear();
    };
  }, [isOn, stageRef, cardRefs]);

  // Clipped to the frame, so in the grid, which scrolls, it doesn't make
  // room for itself where it last lay
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
