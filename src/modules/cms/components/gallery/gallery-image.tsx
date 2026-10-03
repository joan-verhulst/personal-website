import Image from "next/image";
import type { ReactNode } from "react";
import { mediaUrl } from "~/modules/supabase/utils/media";
import cn from "~/utils/cn";

interface Props {
  image: string;
  alt: string;
  sizes: string;
  /**
   * "cover" crops the piece to fill the box, so every card is the same
   * size. "contain" shows all of it, for previews.
   */
  fit?: "cover" | "contain";
  priority?: boolean;
  className?: string;
}

/**
 * A gallery piece in a fixed 4:3 box, whatever its own shape. SVGs are
 * stored without a size, so a box that doesn't depend on it suits them too.
 */
const GalleryImage = ({
  image,
  alt,
  sizes,
  fit = "cover",
  priority,
  className,
}: Props) => (
  <div className={cn("relative aspect-4/3 w-full overflow-hidden", className)}>
    <Image
      src={mediaUrl(image)}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={fit === "cover" ? "object-cover" : "object-contain"}
    />
  </div>
);

interface PreviewProps {
  image: string;
  alt: string;
  priority?: boolean;
  /** Laid over the image, like the Cover badge. */
  children?: ReactNode;
}

/**
 * The whole piece, as the new and edit dialogs show it above their fields.
 * It has a fixed height instead of a shape, so a full-width preview doesn't
 * push the fields out of view.
 */
export const GalleryPreview = ({
  image,
  alt,
  priority,
  children,
}: PreviewProps) => (
  <div className="relative overflow-hidden rounded-xl border border-neutral-950/10 bg-neutral-100">
    <GalleryImage
      image={image}
      alt={alt}
      fit="contain"
      sizes="(min-width: 768px) 672px, 100vw"
      priority={priority}
      className="aspect-auto h-56"
    />
    {children}
  </div>
);

export default GalleryImage;
