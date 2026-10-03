"use client";

import { Plus } from "lucide-react";
import type { CSSProperties } from "react";
import type { WallItem } from "~/modules/content/types";
import { getWallBackground } from "~/modules/ui-ux/utils/wall-backgrounds";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import WallMedia from "~/modules/ui-ux/components/wall-media";
import WallTag from "~/modules/ui-ux/components/wall-tag";
import cn from "~/utils/cn";

// Padding scales with the card width, the card being an inline-size container
const PADDING_X = "px-[clamp(1.25rem,6cqw,3rem)]";
const PADDING_LEFT = "pl-[clamp(1.25rem,6cqw,3rem)]";
const PADDING_TOP = "pt-[clamp(1.25rem,6cqw,3rem)]";

interface Props {
  item: WallItem;
  sizes: string;
  // Placement and sizing within the block, set by the wall
  className?: string;
  // The big slot of a block, which gets a rounder media corner
  isLarge?: boolean;
  onOpen?: () => void;
}

const WallTile = ({ item, sizes, className, isLarge, onOpen }: Props) => {
  const haptic = useHapticSound();
  const { animationsEnabled } = useAnimationPreference();
  const isClickable = onOpen !== undefined;
  // Neutral cards and light reels get a dark header
  const isNeutral = item.background === "neutral";

  const tileStyle = {
    background: getWallBackground(item),
    "--media-aspect": item.media.width / item.media.height,
  } as CSSProperties;

  // Scales up from the bottom left so the media stays anchored to the card.
  // No overshoot, which would dip below 1 on the way back and open a gap.
  const hoverScale =
    isClickable &&
    animationsEnabled &&
    "origin-bottom-left transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]";

  const header = (
    <span
      className={cn(
        "flex items-start gap-2 pb-[clamp(0.75rem,3cqw,1.25rem)]",
        PADDING_X,
        PADDING_TOP,
      )}
    >
      {/* The tag wraps below the title on narrow cards */}
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5">
        <span
          className={cn(
            "min-w-0 max-w-full truncate text-[clamp(0.875rem,2.5cqw,1.125rem)]",
            isNeutral ? "text-neutral-950" : "text-neutral-50",
          )}
        >
          {item.title}
        </span>
        <WallTag
          tag={item.tag}
          className={isNeutral ? "text-neutral-50" : "bg-neutral-50"}
          style={
            isNeutral
              ? { backgroundColor: item.tag.color }
              : { color: item.tag.color }
          }
        />
      </span>
      {isClickable && (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-300",
            isNeutral
              ? "border-neutral-950/10 text-neutral-950 group-hover:bg-neutral-950/5"
              : "border-neutral-50/20 text-neutral-50 group-hover:bg-neutral-50/15",
          )}
        >
          <Plus className="size-4" />
        </span>
      )}
    </span>
  );

  const content = item.bare ? (
    // Reels are the card: the wall sizes it to their aspect ratio, so nothing is cropped
    <>
      <span className={cn("absolute inset-0 overflow-hidden", hoverScale)}>
        <WallMedia item={item} sizes={sizes} />
      </span>
      {!isNeutral && (
        <span className="pointer-events-none absolute inset-x-0 top-0 h-1/3 bg-linear-to-b from-neutral-950/50 to-transparent" />
      )}
      <span className="absolute inset-x-0 top-0">{header}</span>
    </>
  ) : (
    // Screenshots fill the space below the header and run off the right and
    // bottom edges, so they read as intentionally cut off
    <span className="flex h-full flex-col">
      {header}
      <span className={cn("flex lg:min-h-0 lg:flex-1", PADDING_LEFT)}>
        <span className="relative w-full">
          <span
            className={cn(
              // bg-clip-padding lets the card show through the translucent rim
              "relative block aspect-(--media-aspect) w-full overflow-hidden border-t-6 border-l-6 bg-neutral-50 bg-clip-padding lg:absolute lg:inset-0 lg:aspect-auto",
              isLarge ? "rounded-tl-3xl" : "rounded-tl-2xl",
              isNeutral ? "border-neutral-950/5" : "border-neutral-50/20",
              hoverScale,
            )}
          >
            <WallMedia item={item} sizes={sizes} />
          </span>
        </span>
      </span>
    </span>
  );

  // Stacks at its natural height on mobile, the wall sizes it on desktop.
  // inset-border sits over the media, so screenshots running off the edge
  // still have a visible edge against the page.
  const tileClassName = cn(
    "group @container relative inset-border block w-full overflow-hidden rounded-4xl text-left",
    // Grid items with an aspect ratio don't stretch, so drop it on desktop
    item.bare && "aspect-(--media-aspect) lg:aspect-auto",
    className,
  );

  if (!isClickable) {
    return (
      <div className={tileClassName} style={tileStyle}>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Open ${item.title}`}
      onClick={() => {
        haptic.onClick();
        onOpen();
      }}
      onMouseEnter={haptic.onMouseEnter}
      onMouseLeave={haptic.onMouseLeave}
      className={cn(
        tileClassName,
        "cursor-pointer focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
      )}
      style={tileStyle}
    >
      {content}
    </button>
  );
};

export default WallTile;
