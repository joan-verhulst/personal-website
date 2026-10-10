"use client";

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { gsap } from "gsap";
import SlideCard from "./slider-card";
import cn from "~/utils/cn";
import { isFooterClosed, openFooter } from "~/utils/footer";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import {
  type Artwork,
  SLIDE_HEIGHT,
} from "~/modules/digital-art/utils/slide-image";

// ─── Constants ────────────────────────────────────────────────────────────────

const GAP = 20;
const INACTIVE_SIZE = 128;
const FIXED_HEIGHT = SLIDE_HEIGHT;
const VERTICAL_PADDING = 48 * 2; // 3rem each side, matches `px-12`
const MD_BREAKPOINT = 768;
const CLICK_THRESHOLD = 5;
// How far a flick carries on after the finger lets go, in ms of its speed. A
// fast flick passes several slides, a slow one settles on the nearest
const MOMENTUM = 220;
// Past the first or last slide a drag only follows at this share, so it
// stretches a little and springs back instead of running off
const OVERDRAG = 0.25;
// How far past the last piece a finger has to pull to open the footer
const PULL_TO_FOOTER = 160;
// The settle after a drag or flick: long and soft, so it glides into place
const SETTLE = { duration: 0.7, ease: "power3.out" };

// ─── Hooks ────────────────────────────────────────────────────────────────────

// Layout effect, so the size is known before the slider is first painted
function useViewportSize(): { width: number; height: number } {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const update = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  items: Artwork[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  pendingIndex: number | null;
  onPendingIndexChange: (index: number | null) => void;
  onOpenPopover: () => void;
}

const HorizontalImageSlider = ({
  items,
  activeIndex,
  onActiveIndexChange,
  pendingIndex,
  onPendingIndexChange,
  onOpenPopover,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);
  const imgRefs = useRef<(HTMLImageElement | null)[]>([]);
  const shouldSnapInstantly = useRef(true);
  const prevIsVertical = useRef<boolean | null>(null);

  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const { animationsEnabled } = useAnimationPreference();

  const { width: viewportWidth, height: viewportHeight } = useViewportSize();
  const isVertical = viewportWidth > 0 && viewportWidth < MD_BREAKPOINT;

  const crossAxisSize = isVertical
    ? viewportWidth - VERTICAL_PADDING
    : FIXED_HEIGHT;
  // The pieces come with their proportions, so the slides are laid out right
  // away instead of after every image has loaded
  const sizes = useMemo(
    () =>
      items.map(({ width, height }) =>
        isVertical
          ? Math.round((crossAxisSize * height) / width)
          : Math.round((crossAxisSize * width) / height),
      ),
    [items, crossAxisSize, isVertical],
  );
  // Only the viewport is missing on the first render, and on the server
  const ready = viewportWidth > 0;
  const viewportCenter = isVertical ? viewportHeight / 2 : viewportWidth / 2;

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // One tween per image, retargeted on every move. Starting a new one on every
  // move piled up dozens per image, all writing the same transform
  const parallax = useRef(new Map<HTMLImageElement, gsap.QuickToFunc>());
  const shiftImage = useCallback((img: HTMLImageElement, x: number) => {
    let to = parallax.current.get(img);
    if (!to) {
      to = gsap.quickTo(img, "x", { duration: 0.6, ease: "power2.out" });
      parallax.current.set(img, to);
    }
    to(x);
  }, []);

  // The height each slide is heading for while dragging, so only the ones
  // that change get a new tween
  const previewHeights = useRef<number[]>([]);

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

  // Drag state
  const isDragging = useRef(false);
  const dragStartPos = useRef(0);
  const dragStartSliderPos = useRef(0);
  const dragLastPos = useRef(0);
  const dragLastTime = useRef(0);
  const dragVelocity = useRef(0);

  // ── Layout helpers ──────────────────────────────────────────────────────────

  const getSlideMainSize = useCallback(
    (index: number, forActiveIndex: number): number =>
      index === forActiveIndex
        ? (sizes[index] ?? INACTIVE_SIZE)
        : INACTIVE_SIZE,
    [sizes],
  );

  const calculateCenterOffset = useCallback(
    (targetIndex: number): number => {
      if (!ready || sizes.length === 0) return 0;
      let pos = 0;
      for (let i = 0; i < items.length; i++) {
        const size = getSlideMainSize(i, targetIndex);
        if (i === targetIndex) return viewportCenter - (pos + size / 2);
        pos += size + GAP;
      }
      return 0;
    },
    [ready, sizes, items.length, viewportCenter, getSlideMainSize],
  );

  const findClosestIndex = useCallback(
    (sliderOffset: number): number => {
      if (!ready || sizes.length === 0) return 0;
      let pos = 0;
      let closestIndex = 0;
      let closestDist = Infinity;
      for (let i = 0; i < items.length; i++) {
        const size = getSlideMainSize(i, activeIndex);
        const dist = Math.abs(sliderOffset + pos + size / 2 - viewportCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestIndex = i;
        }
        pos += size + GAP;
      }
      return closestIndex;
    },
    [
      ready,
      sizes,
      items.length,
      viewportCenter,
      activeIndex,
      getSlideMainSize,
    ],
  );

  // The offsets with the first and the last slide centred. Dragging past them
  // only stretches
  const clampWithResistance = useCallback(
    (offset: number): number => {
      const max = calculateCenterOffset(0);
      const min = calculateCenterOffset(items.length - 1);
      if (offset > max) return max + (offset - max) * OVERDRAG;
      if (offset < min) return min + (offset - min) * OVERDRAG;
      return offset;
    },
    [calculateCenterOffset, items.length],
  );

  // ── Cleanup all GSAP animations on unmount ────────────────────────────────────

  useEffect(() => {
    return () => {
      if (sliderRef.current) gsap.killTweensOf(sliderRef.current);
      slideRefs.current.forEach((s) => s && gsap.killTweensOf(s));
      imgRefs.current.forEach((i) => i && gsap.killTweensOf(i));
    };
  }, []);

  // ── GSAP: animate slide sizes + slider position ──────────────────────────────

  // Layout effect, so the slides are in place before the slider is first painted
  useLayoutEffect(() => {
    if (!ready || !sliderRef.current) return;

    const orientationFlipped =
      prevIsVertical.current !== null && prevIsVertical.current !== isVertical;
    prevIsVertical.current = isVertical;

    if (orientationFlipped) {
      // A tween started by the last resize would carry on and move the stale
      // axis back, so it goes first
      gsap.killTweensOf(sliderRef.current);
      gsap.set(sliderRef.current, { clearProps: "x,y" });
      // The slides outlive the flip, so drop the sizes of the old layout and
      // let the classes size the cross axis again
      slideRefs.current.forEach((slide) => {
        if (!slide) return;
        gsap.killTweensOf(slide);
        gsap.set(slide, { clearProps: "width,height" });
      });
      imgRefs.current.forEach((img) => {
        if (!img) return;
        gsap.killTweensOf(img);
        gsap.set(img, { clearProps: "x" });
      });
      parallax.current.clear();
      previewHeights.current = [];
      shouldSnapInstantly.current = true;
    }

    const instant = shouldSnapInstantly.current;
    shouldSnapInstantly.current = false;

    const axis = isVertical ? "y" : "x";
    const sizeProp = isVertical ? "height" : "width";
    const targetOffset = calculateCenterOffset(activeIndex);

    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      const targetSize = getSlideMainSize(index, activeIndex);
      if (instant) {
        gsap.set(slide, { [sizeProp]: targetSize });
      } else {
        gsap.to(slide, { [sizeProp]: targetSize, ...SETTLE });
      }
    });

    if (instant) {
      gsap.set(sliderRef.current, { [axis]: targetOffset });
    } else {
      gsap.to(sliderRef.current, { [axis]: targetOffset, ...SETTLE });
    }
  }, [
    activeIndex,
    ready,
    sizes,
    isVertical,
    calculateCenterOffset,
    getSlideMainSize,
  ]);

  // ── GSAP: live height preview during drag ───────────────────────────────────

  useEffect(() => {
    if (isVertical) return;
    slideRefs.current.forEach((slide, index) => {
      if (!slide) return;
      let height = FIXED_HEIGHT;
      if (pendingIndex !== null && isDragging.current) {
        if (index === pendingIndex) {
          height = FIXED_HEIGHT + 64;
        } else if (index === pendingIndex - 1 || index === pendingIndex + 1) {
          height = FIXED_HEIGHT + 24;
        }
      }
      if (previewHeights.current[index] === height) return;
      previewHeights.current[index] = height;
      gsap.to(slide, { height, duration: 0.6, ease: "power2.out" });
    });
  }, [pendingIndex]);

  // ── Drag ────────────────────────────────────────────────────────────────────

  const getEventPos = (
    e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent,
  ) => {
    const point =
      "touches" in e ? e.touches[0] : (e as MouseEvent | React.MouseEvent);
    return isVertical ? point.clientY : point.clientX;
  };

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!sliderRef.current) return;
      isDragging.current = true;

      const pos = getEventPos(e);
      dragStartPos.current = pos;
      dragLastPos.current = pos;
      dragLastTime.current = performance.now();
      dragVelocity.current = 0;

      const axis = isVertical ? "y" : "x";
      gsap.killTweensOf(sliderRef.current, axis);
      dragStartSliderPos.current =
        (gsap.getProperty(sliderRef.current, axis) as number) || 0;

      document.body.style.cursor = "grabbing";
      document.body.style.userSelect = "none";
    },
    [isVertical],
  );

  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging.current || !sliderRef.current) return;
      // Otherwise the page scrolls along under the finger
      if (e.cancelable) e.preventDefault();

      const pos = getEventPos(e);
      const now = performance.now();
      const dt = now - dragLastTime.current;
      if (dt > 0) dragVelocity.current = (pos - dragLastPos.current) / dt;
      dragLastPos.current = pos;
      dragLastTime.current = now;

      const parallaxX = Math.max(-20, Math.min(20, dragVelocity.current * -8));
      if (!isVertical && animationsEnabled) {
        imgRefs.current.forEach((img, index) => {
          if (img && index !== activeIndex) shiftImage(img, parallaxX);
        });
      }

      const axis = isVertical ? "y" : "x";
      const newSliderPos = clampWithResistance(
        dragStartSliderPos.current + (pos - dragStartPos.current),
      );
      gsap.set(sliderRef.current, { [axis]: newSliderPos });

      const closest = findClosestIndex(newSliderPos);
      onPendingIndexChange(closest);
    },
    [
      isVertical,
      activeIndex,
      findClosestIndex,
      onPendingIndexChange,
      animationsEnabled,
      shiftImage,
      clampWithResistance,
    ],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current || !sliderRef.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    imgRefs.current.forEach((img) => {
      if (img && parallax.current.has(img)) shiftImage(img, 0);
    });
    onPendingIndexChange(null);

    const axis = isVertical ? "y" : "x";
    const currentPos =
      (gsap.getProperty(sliderRef.current, axis) as number) || 0;
    const dragDelta = currentPos - dragStartSliderPos.current;

    if (Math.abs(dragDelta) < CLICK_THRESHOLD) {
      // A tap past the end still springs back
      gsap.to(sliderRef.current, {
        [axis]: calculateCenterOffset(activeIndex),
        ...SETTLE,
      });
      return;
    }

    // A pull well past the last piece opens the footer, which touch can't
    // scroll to on a phone: the slider takes every drag. The overdrag only
    // follows part of the finger, so this measures the finger
    const pastLast =
      (calculateCenterOffset(items.length - 1) - currentPos) / OVERDRAG;
    if (isVertical && pastLast > PULL_TO_FOOTER) {
      gsap.to(sliderRef.current, {
        [axis]: calculateCenterOffset(activeIndex),
        ...SETTLE,
      });
      openFooter(sliderRef.current);
      return;
    }

    // A finger that stopped before letting go doesn't flick
    const isStill = performance.now() - dragLastTime.current > 80;
    const momentum = isStill ? 0 : dragVelocity.current * MOMENTUM;
    const closestIndex = findClosestIndex(currentPos + momentum);
    if (closestIndex !== activeIndex) {
      onActiveIndexChange(closestIndex);
    } else {
      gsap.to(sliderRef.current, {
        [axis]: calculateCenterOffset(activeIndex),
        ...SETTLE,
      });
    }
  }, [
    isVertical,
    activeIndex,
    items.length,
    onActiveIndexChange,
    onPendingIndexChange,
    calculateCenterOffset,
    findClosestIndex,
    shiftImage,
  ]);

  // ── Wheel ───────────────────────────────────────────────────────────────────

  const wheelAccumulator = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      const delta = isVertical ? e.deltaY : e.deltaX || e.deltaY;
      // Left to the footer: on from the last piece, and anything while the
      // footer is open or being pulled
      const container = containerRef.current;
      const pastLast = delta > 0 && activeIndex === items.length - 1;
      if (container && (!isFooterClosed(container) || pastLast)) {
        wheelAccumulator.current = 0;
        return;
      }
      e.preventDefault();
      wheelAccumulator.current += delta;

      if (wheelTimer.current) clearTimeout(wheelTimer.current);
      wheelTimer.current = setTimeout(() => {
        wheelAccumulator.current = 0;
      }, 150);

      if (Math.abs(wheelAccumulator.current) > 80) {
        const direction = wheelAccumulator.current > 0 ? 1 : -1;
        wheelAccumulator.current = 0;
        const next = Math.max(
          0,
          Math.min(items.length - 1, activeIndex + direction),
        );
        if (next !== activeIndex) onActiveIndexChange(next);
      }
    },
    [isVertical, activeIndex, items.length, onActiveIndexChange],
  );

  // React listens to wheel passively, so its handler couldn't keep the page
  // from scrolling along
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // ── Global listeners ────────────────────────────────────────────────────────

  useEffect(() => {
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove, { passive: false });
    window.addEventListener("touchend", handleDragEnd);
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [handleDragMove, handleDragEnd]);

  // ── Slide click ─────────────────────────────────────────────────────────────

  const handleSlideClick = useCallback(
    (index: number) => {
      if (!sliderRef.current) return;
      const axis = isVertical ? "y" : "x";
      const currentPos =
        (gsap.getProperty(sliderRef.current, axis) as number) || 0;
      if (Math.abs(currentPos - dragStartSliderPos.current) < CLICK_THRESHOLD) {
        onActiveIndexChange(index);
      }
    },
    [isVertical, onActiveIndexChange],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div
      className={cn(
        "cursor-grab select-none overflow-visible",
        isVertical ? "h-screen w-full px-12" : "h-96 w-full",
        // The slider moves itself, so touches on it never scroll the page
        "touch-none",
        // Server rendered without a viewport, so hidden until it's laid out
        !ready && "invisible",
      )}
      ref={containerRef}
      // Takes every touch, so a pull past the last piece opens the footer
      // instead, see handleDragEnd
      data-gestures
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
    >
      <div
        ref={sliderRef}
        className={cn(
          isVertical
            ? "flex w-full flex-col gap-5"
            : "flex h-full flex-row items-center gap-5",
        )}
      >
        {items.map((item, index) => (
          <SlideCard
            key={item.id}
            item={item}
            index={index}
            isActive={index === activeIndex}
            isHovered={hoveredIndex === index}
            isVertical={isVertical}
            // Stable, so a card only renders again when it changes itself
            slideRef={setSlideRef}
            imgRef={setImgRef}
            onSelect={handleSlideClick}
            onHover={setHoveredIndex}
            onOpenPopover={onOpenPopover}
          />
        ))}
      </div>
    </div>
  );
};

export default HorizontalImageSlider;
