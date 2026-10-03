"use client";

import { Maximize } from "lucide-react";
import Image from "next/image";
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
  slideRef: (el: HTMLDivElement | null) => void;
  imgRef: (el: HTMLImageElement | null) => void;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
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
  onClick,
  onMouseEnter,
  onMouseLeave,
  onOpenPopover,
}: SlideCardProps) => {
  const haptic = useHapticSound();

  return (
    <div
      ref={slideRef}
      className={cn(
        // The background stands in until the picture has loaded
        "relative shrink-0 overflow-hidden rounded-2xl bg-neutral-200",
        isVertical ? "w-full" : "h-full",
        !isActive && "cursor-pointer",
      )}
      onClick={() => {
        haptic.onClick();
        onClick();
      }}
      onMouseEnter={() => {
        haptic.onMouseEnter();
        onMouseEnter();
      }}
      onMouseLeave={onMouseLeave}
    >
      <div
        className={cn("h-full", !isActive ? "w-[130%] -ml-[15%]" : "w-full")}
      >
        <Image
          ref={imgRef}
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
