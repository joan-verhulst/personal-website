import Image from "next/image";
import type { WallItemRow } from "~/modules/content/utils/rows";
import { mediaUrl } from "~/modules/media/utils/media-url";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";
import cn from "~/utils/cn";

interface MediaThumbProps {
  /** Empty shows a grey placeholder, for a slot nothing is picked for yet. */
  item?: Pick<WallItemRow, "media" | "media_type" | "background">;
  /** The rendered width, so next/image picks a fitting file. */
  sizes?: string;
  className?: string;
}

/**
 * A wall item's image or video on its own background. Size it with
 * className: it's 4:3 and fills the width it gets. Its rounded box clips the
 * media, so it needs no wrapper to round it.
 *
 * @example
 * <MediaThumb item={item} sizes="80px" className="w-20" />
 */
const MediaThumb = ({ item, sizes = "320px", className }: MediaThumbProps) => (
  <span
    className={cn(
      "relative block aspect-4/3 shrink-0 overflow-hidden rounded-lg",
      !item && "bg-neutral-100",
      className,
    )}
  >
    {item && (
      // The background stays a pixel inside the box. Painted right up to the
      // rounded edge, a dark gradient shows as a hairline around the corners
      // of a light image, where the browser blends both along the clip.
      <span
        aria-hidden
        className="absolute inset-px rounded-[7px]"
        style={{ background: wallBackgrounds[item.background] }}
      />
    )}
    {/* An item whose file was deleted from Media shows its background only */}
    {item?.media && item.media_type === "image" && (
      <Image
        src={mediaUrl(item.media)}
        alt=""
        fill
        sizes={sizes}
        className="object-cover object-left-top"
      />
    )}
    {item?.media && item.media_type === "video" && (
      <video
        src={mediaUrl(item.media)}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 size-full object-cover"
      />
    )}
  </span>
);

export default MediaThumb;
