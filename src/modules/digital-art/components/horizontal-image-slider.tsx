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
const FLICK_VELOCITY = 0.5; // px/ms

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
        gsap.to(slide, {
          [sizeProp]: targetSize,
          duration: 0.5,
          ease: "power2.out",
        });
      }
    });

    if (instant) {
      gsap.set(sliderRef.current, { [axis]: targetOffset });
    } else {
      gsap.to(sliderRef.current, {
        [axis]: targetOffset,
        duration: 0.5,
        ease: "power2.out",
      });
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

      const pos = getEventPos(e);
      const now = performance.now();
      const dt = now - dragLastTime.current;
      if (dt > 0) dragVelocity.current = (pos - dragLastPos.current) / dt;
      dragLastPos.current = pos;
      dragLastTime.current = now;

      const parallaxX = Math.max(-20, Math.min(20, dragVelocity.current * -8));
      imgRefs.current.forEach((img, index) => {
        if (isVertical || !animationsEnabled) return;
        else if (img && index !== activeIndex) {
          gsap.to(img, { x: parallaxX, duration: 0.6, ease: "power2.out" });
        }
      });

      const axis = isVertical ? "y" : "x";
      const newSliderPos =
        dragStartSliderPos.current + (pos - dragStartPos.current);
      gsap.set(sliderRef.current, { [axis]: newSliderPos });

      const closest = findClosestIndex(newSliderPos);
      onPendingIndexChange(closest);
    },
    [isVertical, findClosestIndex, onPendingIndexChange, animationsEnabled],
  );

  const handleDragEnd = useCallback(() => {
    if (!isDragging.current || !sliderRef.current) return;
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";

    imgRefs.current.forEach((img) => {
      if (img) gsap.to(img, { x: 0, duration: 0.5, ease: "power2.out" });
    });
    onPendingIndexChange(null);

    const axis = isVertical ? "y" : "x";
    const currentPos =
      (gsap.getProperty(sliderRef.current, axis) as number) || 0;
    const dragDelta = currentPos - dragStartSliderPos.current;

    if (Math.abs(dragDelta) < CLICK_THRESHOLD) return;

    if (Math.abs(dragVelocity.current) > FLICK_VELOCITY) {
      const direction = dragVelocity.current > 0 ? -1 : 1;
      const target = Math.max(
        0,
        Math.min(items.length - 1, activeIndex + direction),
      );
      onActiveIndexChange(target);
      return;
    }

    const closestIndex = findClosestIndex(currentPos);
    if (closestIndex !== activeIndex) {
      onActiveIndexChange(closestIndex);
    } else {
      gsap.to(sliderRef.current, {
        [axis]: calculateCenterOffset(activeIndex),
        duration: 0.35,
        ease: "power2.out",
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
  ]);

  // ── Wheel ───────────────────────────────────────────────────────────────────

  const wheelAccumulator = useRef(0);
  const wheelTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      wheelAccumulator.current += isVertical ? e.deltaY : e.deltaX || e.deltaY;

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
        "overflow-visible cursor-grab select-none",
        isVertical ? "w-full h-screen px-12" : "w-full h-96",
        // Server rendered without a viewport, so hidden until it's laid out
        !ready && "invisible",
      )}
      onMouseDown={handleDragStart}
      onTouchStart={handleDragStart}
      onWheel={handleWheel}
    >
      <div
        ref={sliderRef}
        className={cn(
          isVertical
            ? "flex flex-col w-full gap-5"
            : "flex flex-row h-full gap-5 items-center ",
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
            slideRef={(el) => {
              slideRefs.current[index] = el;
            }}
            imgRef={(el) => {
              imgRefs.current[index] = el;
            }}
            onClick={() => handleSlideClick(index)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            onOpenPopover={() => {
              onOpenPopover();
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default HorizontalImageSlider;
