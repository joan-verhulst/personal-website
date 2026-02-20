"use client";

import { useEffect } from "react";
import type { DigitalArtProject } from "~/data/digital-art-projects";
import cn from "~/utils/cn";

interface SlideCardProps {
  item: DigitalArtProject;
  index: number;
  isActive: boolean;
  isHovered: boolean;
  isVertical: boolean;
  slideRef: (el: HTMLDivElement | null) => void;
  imgRef: (el: HTMLImageElement | null) => void;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

const SlideCard = ({
  item,
  isActive,
  isHovered,
  isVertical,
  slideRef,
  imgRef,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: SlideCardProps) => (
  <div
    ref={slideRef}
    className={cn(
      "relative shrink-0 overflow-hidden rounded-2xl",
      isVertical ? "w-full" : "h-full",
      !isActive && "cursor-pointer",
    )}
    onClick={onClick}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    <div className={cn("h-full", !isActive ? "w-[130%] -ml-[15%]" : "w-full")}>
      <img
        ref={imgRef}
        src={item.image}
        alt={item.title}
        className={cn(
          "w-full h-full object-cover pointer-events-none transition-[filter] duration-300",
          !isActive && !isHovered && "grayscale",
          !isActive && isHovered && "grayscale-40",
        )}
        draggable={false}
      />
    </div>

    {isActive && (
      <div className="absolute bottom-0 left-0 right-0 px-5 py-5 bg-linear-to-t from-black/60 to-transparent">
        <p className="text-white text-sm font-medium truncate">{item.title}</p>
      </div>
    )}
  </div>
);

export default SlideCard;
