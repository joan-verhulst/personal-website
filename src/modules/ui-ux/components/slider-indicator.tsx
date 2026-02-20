"use client";

import { useRef, useEffect, useState } from "react";
import { gsap } from "gsap";
import cn from "~/utils/cn";
import SliderLabel from "./slider-label";

interface Props {
  totalSlides: number;
  activeIndex: number;
  onSlideClick?: (index: number) => void;
  labels?: string[];
  showLabel?: boolean;
  orientation?: "vertical" | "horizontal";
  className?: string;
  pendingIndex?: number | null;
}

const STEM_ACTIVE_WIDTH = 20;
const STEM_INACTIVE_WIDTH = 8;
const STEM_HOVER_WIDTH = 16;
const STEM_ADJACENT_WIDTH = 12;
const ANIMATION_DURATION = 0.3;

const SliderIndicator = ({
  totalSlides,
  activeIndex,
  onSlideClick,
  labels,
  showLabel = true,
  orientation = "vertical",
  className,
  pendingIndex = null,
}: Props) => {
  const isHorizontal = orientation === "horizontal";
  const stemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasMounted = useRef(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [labelPosition, setLabelPosition] = useState<number>(0);

  const sizeKey = isHorizontal ? "height" : "width";

  // Priority: hover > pending (drag preview) > active
  const getStemStyles = (index: number) => {
    if (hoveredIndex !== null) {
      if (index === hoveredIndex)
        return { [sizeKey]: STEM_HOVER_WIDTH, opacity: 1 };
      if (index === hoveredIndex - 1 || index === hoveredIndex + 1)
        return { [sizeKey]: STEM_ADJACENT_WIDTH, opacity: 0.25 };
    }

    if (pendingIndex !== null) {
      if (index === pendingIndex)
        return { [sizeKey]: STEM_HOVER_WIDTH, opacity: 1 };
      if (index === pendingIndex - 1 || index === pendingIndex + 1)
        return { [sizeKey]: STEM_ADJACENT_WIDTH, opacity: 0.25 };
    }

    return index === activeIndex
      ? { [sizeKey]: STEM_ACTIVE_WIDTH, opacity: 1 }
      : { [sizeKey]: STEM_INACTIVE_WIDTH, opacity: 0.25 };
  };

  useEffect(() => {
    const animate = hasMounted.current ? gsap.to : gsap.set;
    const animProps = { duration: ANIMATION_DURATION, ease: "power2.out" };

    stemRefs.current.forEach((stem, index) => {
      if (stem) animate(stem, { ...getStemStyles(index), ...animProps });
    });

    const activeWrapper = wrapperRefs.current[activeIndex];
    if (dotRef.current && activeWrapper) {
      const pos = isHorizontal
        ? activeWrapper.offsetLeft + activeWrapper.offsetWidth / 2 - 1.5
        : activeWrapper.offsetTop + activeWrapper.offsetHeight / 2 - 1.5;
      animate(dotRef.current, {
        [isHorizontal ? "left" : "top"]: pos,
        opacity: 1,
        ...animProps,
      });
    }

    hasMounted.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, hoveredIndex, pendingIndex]);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
    const wrapper = wrapperRefs.current[index];
    if (wrapper) {
      setLabelPosition(
        isHorizontal
          ? wrapper.offsetLeft + wrapper.offsetWidth / 2
          : wrapper.offsetTop + wrapper.offsetHeight / 2,
      );
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed z-40",
        isHorizontal
          ? "bottom-16 left-1/2 -translate-x-1/2 flex flex-row gap-3"
          : "left-16 top-1/2 -translate-y-1/2 flex flex-col gap-3",
        className,
      )}
    >
      <div
        ref={dotRef}
        className="absolute w-0.75 h-0.75 rounded-full bg-primary-500"
        style={
          isHorizontal
            ? { bottom: "-8px", left: 0, opacity: 0 }
            : { left: "-8px", top: 0, opacity: 0 }
        }
      />

      {Array.from({ length: totalSlides }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            wrapperRefs.current[index] = el;
          }}
          onClick={() => onSlideClick?.(index)}
          onMouseEnter={() => handleMouseEnter(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          className={cn(
            "relative flex cursor-pointer",
            isHorizontal ? "px-2 -mx-2 items-end" : "py-2 -my-2 items-center",
          )}
        >
          <div
            ref={(el) => {
              stemRefs.current[index] = el;
            }}
            className={
              isHorizontal ? "w-0.5 bg-neutral-950" : "h-0.5 bg-neutral-950"
            }
          />
        </div>
      ))}

      {labels && showLabel && (
        <SliderLabel
          labels={labels}
          activeIndex={hoveredIndex}
          position={labelPosition}
          orientation={orientation}
          className={cn(
            "absolute text-sm border border-neutral-950/10 bg-neutral-50/66 backdrop-blur-3xl rounded-xl",
            isHorizontal
              ? "bottom-16 -translate-x-1/2"
              : "left-16 -translate-y-1/2",
          )}
        />
      )}
    </div>
  );
};

export default SliderIndicator;
