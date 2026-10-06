"use client";

import Image from "next/image";
import type { CSSProperties, FocusEvent } from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import type { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import {
  getPrintTint,
  PAPER_BORDER,
  PAPER_LABEL,
  type Print,
} from "~/modules/photography/utils/print-layouts";
import cn from "~/utils/cn";

export type PhotoView = "table" | "grid";

const formatNumber = (value: number) => String(value).padStart(2, "0");

interface Props {
  print: Print;
  number: number;
  view: PhotoView;
  // Rendered width of the photo, so Next sends a copy big enough
  sizes: string;
  haptic: ReturnType<typeof useHapticSound>;
  cardRef: (element: HTMLButtonElement | null) => void;
  onOpen: () => void;
  onFocus: (event: FocusEvent<HTMLButtonElement>) => void;
}

/**
 * A photo printed on white paper with its caption below. The card is
 * positioned and sized by the table, or by the grid as a tinted tile, and
 * the paper fits itself inside whatever box it gets.
 */
const PrintCard = ({
  print,
  number,
  view,
  sizes,
  haptic,
  cardRef,
  onOpen,
  onFocus,
}: Props) => {
  const { animationsEnabled } = useAnimationPreference();
  const aspect = print.width / print.height;
  const isGrid = view === "grid";

  return (
    <button
      ref={cardRef}
      type="button"
      data-print
      aria-label={`Open ${print.title}`}
      // The table decides whether it was a click or the end of a drag
      onClick={onOpen}
      onMouseEnter={haptic.onMouseEnter}
      onFocus={onFocus}
      className={cn(
        "group flex cursor-pointer items-center justify-center [container-type:size] focus-visible:outline-2 focus-visible:outline-neutral-950 focus-visible:outline-offset-4",
        isGrid
          ? "relative aspect-square rounded-2xl p-[6%]"
          : "absolute top-0 left-0 hover:z-10 focus-visible:z-10",
      )}
      style={
        isGrid
          ? {
              backgroundColor: getPrintTint(print),
            }
          : undefined
      }
    >
      {/* Straightens out of the table's tilt when picked up */}
      <span
        className={cn(
          // An outline rather than a border, so it doesn't change the paper's size
          "flex flex-col rounded-2xl bg-white px-1.5 pt-1.5 outline outline-neutral-950/10 -outline-offset-1",
          animationsEnabled &&
            "transition-[scale,rotate] duration-300 ease-out group-hover:rotate-(--tilt) group-hover:scale-105",
        )}
      >
        <span
          // Inner radius is the paper's minus its border, so the corners run parallel
          className="relative block overflow-hidden rounded-[10px] bg-neutral-200"
          style={
            {
              aspectRatio: `${print.width} / ${print.height}`,
              width: `min(100cqw - ${PAPER_BORDER * 2}px, ${aspect} * (100cqh - ${PAPER_BORDER + PAPER_LABEL}px))`,
            } as CSSProperties
          }
        >
          <Image
            src={print.image}
            unoptimized
            alt={print.title}
            fill
            sizes={sizes}
            quality={90}
            className="object-cover"
            draggable={false}
          />
        </span>
        {/* Zero width with full min width, so a long title truncates instead of widening the paper */}
        <span
          className="flex w-0 min-w-full items-center gap-1.5 text-[0.625rem] text-neutral-500"
          style={{ height: PAPER_LABEL }}
        >
          <span className="tabular-nums opacity-60">{formatNumber(number)}</span>
          <span className="truncate">{print.title}</span>
        </span>
      </span>
    </button>
  );
};

export default PrintCard;
