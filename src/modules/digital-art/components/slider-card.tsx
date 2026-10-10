"use client";

import { Maximize } from "lucide-react";
import Image from "next/image";
import { memo } from "react";
import cn from "~/utils/cn";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import {
  type Artwork,
  FIRST_SLIDES,
  getSlideSizes,
} from "~/modules/digital-art/utils/slide-image";

interface SlideCardProps {
  item: Artwork;
  index: number;
  isActive: boolean;
  isHovered: boolean;
  isVertical: boolean;
  // Take the index, so the slider can hand every card the same functions
  slideRef: (index: number, el: HTMLDivElement | null) => void;
  imgRef: (index: number, el: HTMLImageElement | null) => void;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
  onOpenPopover: () => void;
}

const SlideCard = ({
  item,
  index,
  isActive,
  isHovered,
  isVertical,
  slideRef,
  imgRef,
  onSelect,
  onHover,
  onOpenPopover,
}: SlideCardProps) => {
  const haptic = useHapticSound();

  return (
    <div
      ref={(el) => slideRef(index, el)}
      className={cn(
        // The background stands in until the picture has loaded
        "relative shrink-0 overflow-hidden rounded-2xl bg-neutral-200",
        isVertical ? "w-full" : "h-full",
        !isActive && "cursor-pointer",
      )}
      onClick={() => {
        haptic.onClick();
        onSelect(index);
      }}
      onMouseEnter={() => {
        haptic.onMouseEnter();
        onHover(index);
      }}
      onMouseLeave={() => onHover(null)}
    >
      <div
        className={cn("h-full", !isActive ? "w-[130%] -ml-[15%]" : "w-full")}
      >
        <Image
          ref={(el) => imgRef(index, el)}
          src={item.image}
          alt={item.title}
          width={item.width}
          height={item.height}
          sizes={getSlideSizes(item)}
          // The first slides are on screen when the page opens, the rest
          // load as they come near
          loading={index < FIRST_SLIDES ? "eager" : "lazy"}
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
          <button
            onClick={() => {
              haptic.onClick();
              onOpenPopover();
            }}
            onMouseEnter={haptic.onMouseEnter}
          >
            <Maximize
              className="mt-1 text-neutral-50 duration-200 hover:scale-90 hover:text-neutral-300"
              size={18}
            />
          </button>
        </div>
      )}
    </div>
  );
};

// Dragging re-renders the slider whenever the slide it's heading for changes.
// Only the cards whose own state changed need to follow
export default memo(SlideCard);
