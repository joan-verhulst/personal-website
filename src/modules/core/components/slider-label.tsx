"use client";

import { gsap } from "gsap";
import { useCallback, useEffect, useRef } from "react";

interface Props {
  labels: string[];
  activeIndex: number | null;
  position?: number;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

const ANIMATION_DURATION = 0.3;
const LABEL_HEIGHT = 32;

const SliderLabel = ({
  labels,
  activeIndex,
  position,
  orientation = "vertical",
  className,
}: Props) => {
  const isHorizontal = orientation === "horizontal";
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasMounted = useRef(false);
  const prevActiveIndex = useRef<number | null>(null);

  const getItemWidths = useCallback(() => {
    return itemRefs.current.map((el) => el?.offsetWidth ?? 0);
  }, []);

  useEffect(() => {
    if (containerRef.current && position !== undefined) {
      const animate = hasMounted.current ? gsap.to : gsap.set;
      animate(containerRef.current, {
        [isHorizontal ? "left" : "top"]: position,
        duration: ANIMATION_DURATION,
        ease: "power2.inOut",
        overwrite: "auto",
      });
    }
  }, [position, isHorizontal]);

  useEffect(() => {
    const wasHidden = prevActiveIndex.current === null;
    const animate = hasMounted.current && !wasHidden ? gsap.to : gsap.set;
    const animProps = {
      duration: ANIMATION_DURATION,
      ease: "power2.inOut",
      overwrite: true,
    };

    if (activeIndex !== null) {
      if (isHorizontal) {
        const widths = getItemWidths();
        const translateX = widths
          .slice(0, activeIndex)
          .reduce((sum, w) => sum + w, 0);

        animate(listRef.current, { x: -translateX, ...animProps });
        animate(containerRef.current, {
          width: widths[activeIndex],
          opacity: 1,
          ...animProps,
        });
      } else {
        const widths = getItemWidths();
        animate(listRef.current, {
          y: -activeIndex * LABEL_HEIGHT,
          ...animProps,
        });
        animate(containerRef.current, {
          width: widths[activeIndex],
          opacity: 1,
          ...animProps,
        });
      }
    } else {
      gsap.killTweensOf(containerRef.current);
      gsap.set(containerRef.current, { opacity: 0 });
    }

    prevActiveIndex.current = activeIndex;
    hasMounted.current = true;
  }, [activeIndex, isHorizontal, getItemWidths]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        opacity: 0,
        [isHorizontal ? "left" : "top"]: position ?? 0,
        height: LABEL_HEIGHT,
        overflow: "hidden",
      }}
    >
      <div
        ref={listRef}
        className={isHorizontal ? "flex flex-row" : "flex flex-col items-start"}
      >
        {labels.map((label, index) => (
          <div
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
            className="flex shrink-0 items-center whitespace-nowrap pr-3 pl-2"
            style={{
              height: LABEL_HEIGHT,
            }}
          >
            <span className="w-full text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SliderLabel;
