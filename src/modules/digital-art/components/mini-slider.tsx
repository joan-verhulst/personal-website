"use client";

import { gsap } from "gsap";
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import {
  CLICK_THRESHOLD,
  GAP,
  INACTIVE_SIZE,
  MOMENTUM,
  OVERDRAG,
  SETTLE,
} from "~/modules/digital-art/components/horizontal-image-slider";
import SlideCard from "~/modules/digital-art/components/slider-card";
import {
  type Artwork,
  SLIDE_HEIGHT,
} from "~/modules/digital-art/utils/slide-image";
import { scrollerOf } from "~/utils/footer";

// The slides' height, as a share of the frame's height, and of its width at
// most, so on a phone a landscape piece still fits with its neighbours
// peeking in
const HEIGHT_SHARE = 0.62;
const WIDTH_SHARE = 0.5;
// While dragging, the slide it's heading for and the ones beside it grow by
// this much, at the full slider's size
const PREVIEW_GROW = 64;
const PREVIEW_GROW_NEXT = 24;
// The card after the slides, its width as a share of their height
const END_SHARE = 0.75;

interface Size {
  // The frame's width, and the slides' height in it
  width: number;
  height: number;
}

interface Props {
  items: Artwork[];
  // In a blank card after the slides, a link on to the rest
  end?: ReactNode;
}

/**
 * The digital art slider, small, in a frame on the about page: the same
 * slides, dragged and flicked the same way, scaled down to the frame. It
 * leaves the page alone: up and down scrolls on past it, and only a
 * sideways swipe moves it. After the slides, a card can lead on to the
 * rest.
 */
const MiniSlider = ({ items, end }: Props) => {
  const frameRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const isPlaced = useRef(false);
  const { animationsEnabled } = useAnimationPreference();

  const [size, setSize] = useState<Size | null>(null);
  // Put in, pictures and all, once the frame is about a screen away
  const [isNear, setIsNear] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // The slides, and the card after them
  const count = items.length + (end ? 1 : 0);

  // The full slider's measures, scaled to these slides
  const scale = size ? size.height / SLIDE_HEIGHT : 1;
  const gap = Math.round(GAP * scale);
  const inactiveSize = Math.round(INACTIVE_SIZE * scale);
  // Wider than the frame leaves room for, a piece is cropped instead
  const sizes = useMemo(() => {
    if (!size) return [];
    const widest = size.width - 2 * (gap + inactiveSize / 2);
    return items.map(({ width, height }) =>
      Math.min(widest, Math.round((size.height * width) / height)),
    );
  }, [items, size, gap, inactiveSize]);
  const endSize = size ? Math.round(size.height * END_SHARE) : 0;

  // ── Size ────────────────────────────────────────────────────────────────────

  // Layout effect, so the size is known before the slides are first painted
  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const measure = () => {
      const { clientWidth: width, clientHeight: height } = frame;
      const next = {
        width,
        height: Math.round(
          Math.min(height * HEIGHT_SHARE, width * WIDTH_SHARE),
        ),
      };
      setSize((current) =>
        current &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next,
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    // Opened over home, the page scrolls in the layer, which cuts off what's
    // past its edges, so a screen away is measured from there
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsNear(true);
        observer.disconnect();
      },
      { root: scrollerOf(frame), rootMargin: "100% 0px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  // ── Layout helpers ──────────────────────────────────────────────────────────

  // The card after the slides keeps its width
  const getSlideSize = useCallback(
    (index: number, forActiveIndex: number) => {
      if (index === items.length) return endSize;
      return index === forActiveIndex
        ? (sizes[index] ?? inactiveSize)
        : inactiveSize;
    },
    [items.length, sizes, inactiveSize, endSize],
  );

  // Every slide before the active one is collapsed
  const calculateCenterOffset = useCallback(
    (targetIndex: number) =>
      size
        ? size.width / 2 -
          targetIndex * (inactiveSize + gap) -
          getSlideSize(targetIndex, targetIndex) / 2
        : 0,
    [size, inactiveSize, gap, getSlideSize],
  );

  const findClosestIndex = useCallback(
    (offset: number) => {
      if (!size) return 0;
      let position = 0;
      let closestIndex = 0;
      let closestDistance = Number.POSITIVE_INFINITY;
      for (let index = 0; index < count; index++) {
        const slideSize = getSlideSize(index, activeIndex);
        const distance = Math.abs(
          offset + position + slideSize / 2 - size.width / 2,
        );
        if (distance < closestDistance) {
          closestDistance = distance;
          closestIndex = index;
        }
        position += slideSize + gap;
      }
      return closestIndex;
    },
    [size, count, activeIndex, gap, getSlideSize],
  );

  const clampWithResistance = useCallback(
    (offset: number) => {
      const max = calculateCenterOffset(0);
      const min = calculateCenterOffset(count - 1);
      if (offset > max) return max + (offset - max) * OVERDRAG;
      if (offset < min) return min + (offset - min) * OVERDRAG;
      return offset;
    },
    [calculateCenterOffset, count],
  );

  // One tween per image, retargeted on every move, like the full slider
  const parallax = useRef(new Map<HTMLImageElement, gsap.QuickToFunc>());
  const shiftImage = useCallback((img: HTMLImageElement, x: number) => {
    let to = parallax.current.get(img);
    if (!to) {
      to = gsap.quickTo(img, "x", { duration: 0.6, ease: "power2.out" });
      parallax.current.set(img, to);
    }
    to(x);
  }, []);

  const setSlideRef = useCallback(
    (index: number, element: HTMLDivElement | null) => {
      slideRefs.current[index] = element;
    },
    [],
  );
  const setImgRef = useCallback(
    (index: number, element: HTMLImageElement | null) => {
      imgRefs.current[index] = element;
    },
    [],
  );

  useEffect(() => {
    const slides = slideRefs.current;
    const images = imgRefs.current;
    return () => {
      if (trackRef.current) gsap.killTweensOf(trackRef.current);
      for (const slide of slides) if (slide) gsap.killTweensOf(slide);
      for (const image of images) if (image) gsap.killTweensOf(image);
    };
  }, []);

  // ── Slide sizes and position ────────────────────────────────────────────────

  // Layout effect, so the slides are in place before they're first painted
  useLayoutEffect(() => {
    const trackElement = trackRef.current;
    if (!size || !isNear || !trackElement) return;

    const instant = !isPlaced.current;
    isPlaced.current = true;

    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const width = getSlideSize(index, activeIndex);
      if (instant) gsap.set(slide, { width });
      else gsap.to(slide, { width, ...SETTLE });
    });

    const x = calculateCenterOffset(activeIndex);
    if (instant) gsap.set(trackElement, { x });
    else gsap.to(trackElement, { x, ...SETTLE });
  }, [activeIndex, size, isNear, calculateCenterOffset, getSlideSize]);

  // While dragging, the slide it's heading for grows a little, and the ones
  // beside it less
  const isDragging = useRef(false);
  const previewHeights = useRef<number[]>([]);
  useEffect(() => {
    if (!size || !isNear) return;
    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      let height = size.height;
      if (pendingIndex !== null && isDragging.current) {
        if (index === pendingIndex) {
          height += Math.round(PREVIEW_GROW * scale);
        } else if (Math.abs(index - pendingIndex) === 1) {
          height += Math.round(PREVIEW_GROW_NEXT * scale);
        }
      }
      if (previewHeights.current[index] === height) return;
      previewHeights.current[index] = height;
      gsap.to(slide, { height, duration: 0.6, ease: "power2.out" });
    });
  }, [pendingIndex, size, isNear, scale]);

  // ── Drag ────────────────────────────────────────────────────────────────────

  const dragStartX = useRef(0);
  const dragStartOffset = useRef(0);
  const dragLastX = useRef(0);
  const dragLastTime = useRef(0);
  const dragVelocity = useRef(0);

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    const trackElement = trackRef.current;
    if (!trackElement || (event.pointerType === "mouse" && event.button !== 0))
      return;
    isDragging.current = true;

    dragStartX.current = event.clientX;
    dragLastX.current = event.clientX;
    dragLastTime.current = performance.now();
    dragVelocity.current = 0;

    gsap.killTweensOf(trackElement, "x");
    dragStartOffset.current =
      (gsap.getProperty(trackElement, "x") as number) || 0;

    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };

  const handleDragMove = useCallback(
    (event: PointerEvent) => {
      const trackElement = trackRef.current;
      if (!isDragging.current || !trackElement) return;

      const now = performance.now();
      const dt = now - dragLastTime.current;
      if (dt > 0) dragVelocity.current = (event.clientX - dragLastX.current) / dt;
      dragLastX.current = event.clientX;
      dragLastTime.current = now;

      if (animationsEnabled) {
        const shift =
          gsap.utils.clamp(-20, 20, dragVelocity.current * -8) * scale;
        imgRefs.current.forEach((img, index) => {
          if (img && index !== activeIndex) shiftImage(img, shift);
        });
      }

      const offset = clampWithResistance(
        dragStartOffset.current + (event.clientX - dragStartX.current),
      );
      gsap.set(trackElement, { x: offset });
      setPendingIndex(findClosestIndex(offset));
    },
    [
      activeIndex,
      animationsEnabled,
      scale,
      shiftImage,
      clampWithResistance,
      findClosestIndex,
    ],
  );

  // Also when the browser takes the touch over, to scroll the page
  const handleDragEnd = useCallback(() => {
    const trackElement = trackRef.current;
    if (!isDragging.current || !trackElement) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    imgRefs.current.forEach((img) => {
      if (img && parallax.current.has(img)) shiftImage(img, 0);
    });
    setPendingIndex(null);

    const offset = (gsap.getProperty(trackElement, "x") as number) || 0;
    const settle = () =>
      gsap.to(trackElement, {
        x: calculateCenterOffset(activeIndex),
        ...SETTLE,
      });

    if (Math.abs(offset - dragStartOffset.current) < CLICK_THRESHOLD) {
      settle();
      return;
    }

    // A finger that stopped before letting go doesn't flick
    const isStill = performance.now() - dragLastTime.current > 80;
    const momentum = isStill ? 0 : dragVelocity.current * MOMENTUM;
    const closestIndex = findClosestIndex(offset + momentum);
    if (closestIndex !== activeIndex) setActiveIndex(closestIndex);
    else settle();
  }, [activeIndex, calculateCenterOffset, findClosestIndex, shiftImage]);

  useEffect(() => {
    window.addEventListener("pointermove", handleDragMove);
    window.addEventListener("pointerup", handleDragEnd);
    window.addEventListener("pointercancel", handleDragEnd);
    return () => {
      window.removeEventListener("pointermove", handleDragMove);
      window.removeEventListener("pointerup", handleDragEnd);
      window.removeEventListener("pointercancel", handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // ── Wheel ───────────────────────────────────────────────────────────────────

  // A sideways swipe on a trackpad moves it a piece at a time. Up and down
  // is left to the page
  const wheelAccumulator = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      event.preventDefault();
      wheelAccumulator.current += event.deltaX;

      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        wheelAccumulator.current = 0;
      }, 150);

      if (Math.abs(wheelAccumulator.current) > 80) {
        const direction = wheelAccumulator.current > 0 ? 1 : -1;
        wheelAccumulator.current = 0;
        const next = gsap.utils.clamp(0, count - 1, activeIndex + direction);
        if (next !== activeIndex) setActiveIndex(next);
      }
    };

    // React listens to wheel passively, so its handler couldn't keep the
    // browser from going back a page
    frame.addEventListener("wheel", handleWheel, { passive: false });
    return () => frame.removeEventListener("wheel", handleWheel);
  }, [activeIndex, count]);

  // ── Slides ──────────────────────────────────────────────────────────────────

  // A click, not the end of a drag
  const handleSlideClick = useCallback((index: number) => {
    const trackElement = trackRef.current;
    if (!trackElement) return;
    const offset = (gsap.getProperty(trackElement, "x") as number) || 0;
    if (Math.abs(offset - dragStartOffset.current) < CLICK_THRESHOLD) {
      setActiveIndex(index);
    }
  }, []);

  // The card's link only follows a click, not the end of a drag
  const handleEndClick = useCallback((event: ReactMouseEvent) => {
    const trackElement = trackRef.current;
    if (!trackElement) return;
    const offset = (gsap.getProperty(trackElement, "x") as number) || 0;
    if (Math.abs(offset - dragStartOffset.current) >= CLICK_THRESHOLD) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, []);

  return (
    <div
      ref={frameRef}
      // Sideways is its own, up and down scrolls the page. Clipped, not
      // hidden, so tabbing to the end card's link can't scroll the frame
      // out from under the track
      className="relative h-84 cursor-grab touch-pan-y select-none overflow-clip rounded-[2.5rem] border border-neutral-950/10 md:h-105"
      onPointerDown={handleDragStart}
    >
      {size && isNear && (
        <div
          ref={trackRef}
          className="absolute inset-y-0 left-0 my-auto flex w-max items-center"
          style={{ height: size.height, gap }}
        >
          {items.map((item, index) => (
            <SlideCard
              key={item.id}
              item={item}
              index={index}
              isActive={index === activeIndex}
              isHovered={hoveredIndex === index}
              isVertical={false}
              slideRef={setSlideRef}
              imgRef={setImgRef}
              onSelect={handleSlideClick}
              onHover={setHoveredIndex}
            />
          ))}
          {end && (
            <div
              ref={(element) => setSlideRef(items.length, element)}
              className="h-full shrink-0"
              onClickCapture={handleEndClick}
              // Dragged, the link would go along instead of the slider
              onDragStart={(event) => event.preventDefault()}
            >
              {end}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MiniSlider;
