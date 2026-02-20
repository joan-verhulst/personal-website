"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";

interface Props {
  labels: string[];
  activeIndex: number | null;
  position?: number;
  orientation?: "vertical" | "horizontal";
  className?: string;
}

const ANIMATION_DURATION = 0.3;
const LABEL_HEIGHT = 32;
const LABEL_WIDTH = 128;

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
  const hasMounted = useRef(false);

  // Animate position (following hovered stem)
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

  // Animate list translation and visibility
  useEffect(() => {
    const animate = hasMounted.current ? gsap.to : gsap.set;
    const offset = isHorizontal ? LABEL_WIDTH : LABEL_HEIGHT;
    const animProps = {
      duration: ANIMATION_DURATION,
      ease: "power2.inOut",
      overwrite: true,
    };

    if (activeIndex !== null) {
      animate(listRef.current, {
        [isHorizontal ? "x" : "y"]: -activeIndex * offset,
        ...animProps,
      });
      animate(containerRef.current, { opacity: 1, ...animProps });
    } else {
      gsap.killTweensOf(containerRef.current);
      gsap.set(containerRef.current, { opacity: 0 });
    }

    hasMounted.current = true;
  }, [activeIndex, isHorizontal]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        opacity: 0,
        [isHorizontal ? "left" : "top"]: position ?? 0,
        width: isHorizontal ? LABEL_WIDTH : undefined,
        height: LABEL_HEIGHT,
        overflow: "hidden",
      }}
    >
      <div
        ref={listRef}
        className={isHorizontal ? "flex flex-row" : "flex flex-col"}
      >
        {labels.map((label, index) => (
          <div
            key={index}
            className="flex items-center shrink-0 px-2"
            style={{
              width: isHorizontal ? LABEL_WIDTH : undefined,
              height: LABEL_HEIGHT,
            }}
          >
            <span className="truncate w-full text-center">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SliderLabel;
