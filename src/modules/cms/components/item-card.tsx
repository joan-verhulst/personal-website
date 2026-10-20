import { ImageOff, Play } from "lucide-react";
import type { ReactNode } from "react";
import MediaThumb from "~/modules/cms/components/media-thumb";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";
import cn from "~/utils/cn";

type Tag = Pick<WallTagRow, "label" | "color">;

export const TagDot = ({ color }: { color?: string }) => (
  <span
    aria-hidden
    className="size-2 shrink-0 rounded-full bg-neutral-400"
    style={color ? { backgroundColor: color } : undefined}
  />
);

export const TagLabel = ({
  tag,
  className,
}: {
  tag?: Tag;
  className?: string;
}) => (
  <span className={cn("flex min-w-0 items-center gap-1.5", className)}>
    <TagDot color={tag?.color} />
    <span className="truncate">{tag?.label ?? "No tag"}</span>
  </span>
);

export const MediaTypeBadge = ({
  type,
  className,
}: {
  type: WallItemRow["media_type"];
  className?: string;
}) =>
  type === "video" ? (
    <span
      className={cn(
        "absolute right-1.5 bottom-1.5 flex size-5 items-center justify-center rounded-full bg-neutral-950/60 text-white",
        className,
      )}
    >
      <Play size={10} aria-hidden className="fill-current" />
      <span className="sr-only">Video</span>
    </span>
  ) : null;

export const itemCardClass =
  "flex min-w-0 flex-col rounded-xl border border-neutral-950/10 bg-white p-1";

interface ItemCardProps {
  item?: Pick<WallItemRow, "title" | "media" | "media_type" | "background">;
  tag?: Tag;
  sizes: string;
  emptyTitle?: string;
  overlay?: ReactNode;
  note?: ReactNode;
  corner?: ReactNode;
  /** Greys the card out, for one that can't be picked. */
  isDimmed?: boolean;
  children?: ReactNode;
}

const ItemCard = ({
  item,
  tag,
  sizes,
  emptyTitle = "Nothing picked yet",
  overlay,
  note,
  corner,
  isDimmed,
  children,
}: ItemCardProps) => (
  <>
    <span className={cn("relative block", isDimmed && "opacity-50")}>
      {item ? (
        <MediaThumb item={item} sizes={sizes} className="w-full" />
      ) : (
        <span className="flex aspect-4/3 w-full items-center justify-center rounded-lg border-[1.5px] border-neutral-950/15 border-dashed bg-neutral-50 text-neutral-400">
          <ImageOff size={20} aria-hidden />
        </span>
      )}
      {item && <MediaTypeBadge type={item.media_type} />}
      {overlay}
    </span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5 px-2 pt-2 pb-1.5">
      <span className="flex min-w-0 items-start justify-between gap-2">
        <span
          className={cn(
            "truncate font-medium text-xs",
            isDimmed ? "text-neutral-600" : "text-neutral-950",
          )}
        >
          {item ? item.title || "Untitled" : emptyTitle}
        </span>
        {corner}
      </span>
      {item && (
        <span className="flex min-w-0 items-center gap-1.5 text-neutral-600 text-xs">
          <TagLabel tag={tag} />
          {note && <span className="ml-auto shrink-0 tabular-nums">{note}</span>}
        </span>
      )}
      {children}
    </span>
  </>
);

export default ItemCard;
