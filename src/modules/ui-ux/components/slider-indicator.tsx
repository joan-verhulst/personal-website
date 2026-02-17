"use client";

import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { gsap } from "gsap";
import cn from "~/utils/cn";
import SliderLabel from "./slider-label";

interface Props {
  totalSlides: number;
  activeIndex: number;
  onSlideClick?: (index: number) => void;
  labels?: string[];
  className?: string;
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
  className,
}: Props) => {
  const stemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const wrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const dotRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [labelTop, setLabelTop] = useState<number>(0);

  // Get target width and opacity for a stem
  const getStemStyles = (index: number) => {
    if (hoveredIndex !== null) {
      if (index === hoveredIndex)
        return { width: STEM_HOVER_WIDTH, opacity: 1 };
      if (index === hoveredIndex - 1 || index === hoveredIndex + 1)
        return { width: STEM_ADJACENT_WIDTH, opacity: 0.5 };
    }
    return index === activeIndex
      ? { width: STEM_ACTIVE_WIDTH, opacity: 1 }
      : { width: STEM_INACTIVE_WIDTH, opacity: 0.25 };
  };

  // Initial setup without animation
  useLayoutEffect(() => {
    stemRefs.current.forEach((stem, index) => {
      if (stem) gsap.set(stem, getStemStyles(index));
    });

    const activeWrapper = wrapperRefs.current[activeIndex];
    if (dotRef.current && activeWrapper) {
      gsap.set(dotRef.current, {
        top: activeWrapper.offsetTop + activeWrapper.offsetHeight / 2 - 1.5,
        opacity: 1,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate stems and dot on any state change
  useEffect(() => {
    stemRefs.current.forEach((stem, index) => {
      if (stem) {
        gsap.to(stem, {
          ...getStemStyles(index),
          duration: ANIMATION_DURATION,
          ease: "power2.out",
        });
      }
    });

    const activeWrapper = wrapperRefs.current[activeIndex];
    if (dotRef.current && activeWrapper) {
      gsap.to(dotRef.current, {
        top: activeWrapper.offsetTop + activeWrapper.offsetHeight / 2 - 1.5,
        duration: ANIMATION_DURATION,
        ease: "power2.out",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, hoveredIndex]);

  const handleMouseEnter = (index: number) => {
    setHoveredIndex(index);
    const wrapper = wrapperRefs.current[index];
    if (wrapper) setLabelTop(wrapper.offsetTop + wrapper.offsetHeight / 2);
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "fixed left-16 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-40",
        className,
      )}
    >
      <div
        ref={dotRef}
        className="absolute w-0.75 h-0.75 rounded-full bg-primary-500"
        style={{ left: "-8px", top: 0, opacity: 0 }}
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
          className="relative flex items-center py-2 -my-2 cursor-pointer"
        >
          <div
            ref={(el) => {
              stemRefs.current[index] = el;
            }}
            className="h-0.5 bg-neutral-950"
          />
        </div>
      ))}

      {labels && (
        <SliderLabel
          labels={labels}
          activeIndex={hoveredIndex}
          top={labelTop}
          className="absolute left-16 -translate-y-1/2 px-3 text-sm border border-neutral-950/10 w-40 bg-neutral-50/66 backdrop-blur-3xl rounded-xl"
        />
      )}
    </div>
  );
};

export default SliderIndicator;
