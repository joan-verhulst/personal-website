import Image from "next/image";
import type { ReactNode } from "react";
import { mediaUrl } from "~/modules/media/utils/media-url";
import cn from "~/utils/cn";

interface Props {
  image: string;
  alt: string;
  sizes: string;
  fit?: "cover" | "contain";
  priority?: boolean;
  className?: string;
}

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
  children?: ReactNode;
}

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
