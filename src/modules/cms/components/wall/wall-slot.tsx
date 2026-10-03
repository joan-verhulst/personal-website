"use client";

import { Play, Plus, X } from "lucide-react";
import Image from "next/image";
import { type DragEvent, useState } from "react";
import {
  SLOT_LABELS,
  type SlotSize,
} from "~/modules/cms/components/wall/wall-layouts";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";
import { mediaUrl } from "~/modules/supabase/utils/media";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";
import cn from "~/utils/cn";

export interface WallSlotProps {
  item?: WallItemRow;
  tag?: WallTagRow;
  size: SlotSize;
  /** Where the slot is, like "Row 2", for screen readers. */
  rowLabel: string;
  /** Whether the dragged item may go here. */
  accepts: (id: string) => boolean;
  /** The id of the item being dragged, or null when nothing is. */
  dragging: () => string | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDrop: () => void;
  /** Click or Enter: shows the slot's item, or asks for one when empty. */
  onOpen: () => void;
  onRemove: () => void;
  /** Placement in the row's grid. */
  className?: string;
}

interface MediaProps {
  item: WallItemRow;
  /** The rendered width, so next/image picks a fitting file. */
  sizes: string;
}

/**
 * A wall item roughly framed the way the site's wall shows it, small enough
 * for a slot. A video shows its first frame. The item's dialog and page show
 * the real card, with <WallCardPreview />.
 */
const WallMedia = ({ item, sizes }: MediaProps) => {
  const media =
    item.media_type === "video" ? (
      <video
        src={mediaUrl(item.media)}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 size-full object-cover object-left-top"
      />
    ) : (
      <Image
        src={mediaUrl(item.media)}
        alt=""
        fill
        sizes={sizes}
        className="object-cover object-left-top"
      />
    );

  // Reels fill the card, screenshots sit in a frame that runs off the edges
  // like on the site
  return item.bare ? (
    <span className="absolute inset-0">{media}</span>
  ) : (
    <span className="absolute top-[28%] right-0 bottom-0 left-[10%] overflow-hidden rounded-tl-lg border-white/25 border-t-4 border-l-4 bg-neutral-50 bg-clip-padding">
      {media}
    </span>
  );
};

/**
 * One slot of a wall row: a drop target and, when filled, something to drag
 * elsewhere. A click opens the slot's item, or the picker when it's empty.
 */
const WallSlot = ({
  item,
  tag,
  size,
  rowLabel,
  accepts,
  dragging,
  onDragStart,
  onDragEnd,
  onDrop,
  onOpen,
  onRemove,
  className,
}: WallSlotProps) => {
  const [hover, setHover] = useState<"over" | "reject" | null>(null);
  const sizeLabel = SLOT_LABELS[size];

  const onDragOver = (event: DragEvent) => {
    const id = dragging();
    if (!id) return;
    // Dropping a refused item is still allowed, so it can say why it failed
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setHover(accepts(id) ? "over" : "reject");
  };

  const label = item
    ? `${rowLabel}, ${sizeLabel.toLowerCase()} slot: ${item.title || "Untitled"}. Open its details.`
    : `${rowLabel}, empty ${sizeLabel.toLowerCase()} slot. Choose an item for it.`;

  return (
    <div
      className={cn(
        "group @container relative aspect-4/3 min-h-0 min-w-0 overflow-hidden rounded-xl transition-[background-color,border-color] duration-150",
        item
          ? "bg-neutral-100"
          : "border-[1.5px] border-neutral-950/15 border-dashed bg-neutral-50 hover:border-primary-500/60 hover:bg-primary-50/50",
        hover === "over" &&
          (item
            ? "outline-3 outline-primary-500 -outline-offset-3"
            : "border-primary-500 bg-primary-50"),
        hover === "reject" &&
          (item
            ? "outline-3 outline-error-500 -outline-offset-3"
            : "border-error-500 bg-error-50"),
        className,
      )}
      style={item ? { background: wallBackgrounds[item.background] } : undefined}
      draggable={Boolean(item)}
      onDragStart={(event) => {
        if (!item) return;
        // Firefox only starts a drag that carries data
        event.dataTransfer.setData("text/plain", item.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={(event) => {
        // Moving onto the slot's own children counts as leaving it too
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setHover(null);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setHover(null);
        onDrop();
      }}
    >
      {/* A div acting as a button, since Firefox won't start a drag from a
          real <button>, and this covers the whole draggable slot */}
      {/* biome-ignore lint/a11y/useSemanticElements: see above */}
      <div
        role="button"
        tabIndex={0}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={onOpen}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          // Space would scroll the page otherwise
          event.preventDefault();
          onOpen();
        }}
        className={cn(
          "absolute inset-0 flex size-full cursor-pointer select-none flex-col items-center justify-center gap-0.5 rounded-xl p-1 text-center focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:-outline-offset-2",
          item && "active:cursor-grabbing",
        )}
      >
        {item ? (
          <>
            <WallMedia
              item={item}
              sizes={size === "large" ? "640px" : "360px"}
            />
            <span className="absolute top-2 pointer-coarse:right-12 right-9 left-2 @min-[8rem]:flex hidden items-center gap-1.5">
              <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-neutral-950/55 px-2 py-0.5 text-white text-xs backdrop-blur-sm">
                {tag && (
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: tag.color }}
                  />
                )}
                <span className="truncate">{item.title || "Untitled"}</span>
              </span>
            </span>
            <span className="absolute bottom-2 left-2 @min-[6rem]:flex hidden items-center gap-1 rounded-full bg-neutral-950/55 px-2 py-0.5 text-white text-xs">
              {item.media_type === "video" && (
                <Play size={10} aria-hidden className="fill-current" />
              )}
              {sizeLabel}
            </span>
          </>
        ) : (
          <>
            <Plus
              size={16}
              aria-hidden
              className="@min-[6rem]:block hidden text-neutral-400"
            />
            <span className="font-medium text-neutral-950 text-xs">
              {sizeLabel}
            </span>
            <span className="@min-[7rem]:block hidden text-neutral-600 text-xs">
              Drop or click to add
            </span>
          </>
        )}
      </div>

      {item && (
        <button
          type="button"
          aria-label={`Remove ${item.title || "Untitled"} from the wall`}
          onClick={onRemove}
          className="absolute top-1.5 right-1.5 flex pointer-coarse:size-9 size-6 cursor-pointer items-center justify-center rounded-full bg-neutral-950/60 text-white opacity-0 pointer-coarse:opacity-100 transition-opacity duration-150 hover:bg-neutral-950/80 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-primary-500 group-hover:opacity-100"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
};

export default WallSlot;
