"use client";

import { useRef, useEffect } from "react";
import { gsap } from "gsap";

interface Props {
  labels: string[];
  activeIndex: number | null;
  top?: number;
  className?: string;
}

const ANIMATION_DURATION = 0.3;
const LABEL_HEIGHT = 40; // Height of each label item in pixels

const SliderLabel = ({ labels, activeIndex, top, className }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const prevActiveIndex = useRef<number | null>(null);
  const isFirstRender = useRef(true);

  // Animate vertical position (following hovered stem)
  useEffect(() => {
    if (containerRef.current && top !== undefined) {
      gsap.to(containerRef.current, {
        top,
        duration: ANIMATION_DURATION,
        ease: "power2.inOut",
      });
    }
  }, [top]);

  // Animate list translateY and visibility
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevActiveIndex.current = activeIndex;

      // Set initial state
      if (containerRef.current) {
        gsap.set(containerRef.current, {
          opacity: activeIndex !== null ? 1 : 0,
        });
      }
      if (listRef.current && activeIndex !== null) {
        gsap.set(listRef.current, { y: -activeIndex * LABEL_HEIGHT });
      }
      return;
    }

    const hasActive = activeIndex !== null;
    const hadActive = prevActiveIndex.current !== null;

    // Handle visibility
    if (hasActive && !hadActive) {
      // Show container and set initial list position
      if (listRef.current) {
        gsap.set(listRef.current, { y: -activeIndex * LABEL_HEIGHT });
      }
      gsap.to(containerRef.current, {
        opacity: 1,
        duration: ANIMATION_DURATION,
        ease: "power2.inOut",
      });
    } else if (!hasActive && hadActive) {
      // Instantly hide
      gsap.set(containerRef.current, { opacity: 0 });
    } else if (hasActive && hadActive) {
      // Animate list to new position
      gsap.to(listRef.current, {
        y: -activeIndex * LABEL_HEIGHT,
        duration: ANIMATION_DURATION,
        ease: "power2.inOut",
      });
    }

    prevActiveIndex.current = activeIndex;
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        opacity: 0,
        top: top ?? 0,
        height: LABEL_HEIGHT,
        overflow: "hidden",
      }}
    >
      <div ref={listRef} className="flex flex-col">
        {labels.map((label, index) => (
          <div
            key={index}
            className="flex items-center"
            style={{ height: LABEL_HEIGHT }}
          >
            <span className="truncate">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SliderLabel;
