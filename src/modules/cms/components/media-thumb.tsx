import Image from "next/image";
import type { WallItemRow } from "~/modules/content/utils/rows";
import { mediaUrl } from "~/modules/media/utils/media-url";
import { wallBackgrounds } from "~/modules/ui-ux/utils/wall-backgrounds";
import cn from "~/utils/cn";

interface MediaThumbProps {
  item?: Pick<WallItemRow, "media" | "media_type" | "background">;
  sizes?: string;
  className?: string;
}

const MediaThumb = ({ item, sizes = "320px", className }: MediaThumbProps) => (
  <span
    className={cn(
      "relative block aspect-4/3 shrink-0 overflow-hidden rounded-lg",
      !item && "bg-neutral-100",
      className,
    )}
  >
    {item && (
      <span
        aria-hidden
        className="absolute inset-px rounded-[7px]"
        style={{ background: wallBackgrounds[item.background] }}
      />
    )}
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
