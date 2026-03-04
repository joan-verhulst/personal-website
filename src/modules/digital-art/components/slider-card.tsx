"use client";

import { Maximize } from "lucide-react";
import { useState } from "react";
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
  onOpenPopover: () => void;
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
  onOpenPopover,
}: SlideCardProps) => {
  return (
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
      <div
        className={cn("h-full", !isActive ? "w-[130%] -ml-[15%]" : "w-full")}
      >
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
        <div className="absolute bottom-0 left-0 right-0 px-5 py-5 bg-linear-to-t from-black/60 to-transparent flex items-center justify-between">
          <p className="text-white text-sm font-medium truncate">
            {item.title}
          </p>
          <button onClick={onOpenPopover}>
            <Maximize
              className="text-neutral-50 mt-1 hover:scale-90 hover:text-neutral-50/50 duration-200"
              size={18}
            />
          </button>
        </div>
      )}
    </div>
  );
};

export default SlideCard;
