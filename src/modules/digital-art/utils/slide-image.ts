import { getImageProps } from "next/image";
import type { Artwork } from "~/modules/content/types";

export type { Artwork };

export const SLIDE_HEIGHT = 384;
export const FIRST_SLIDES = 6;

// Slides cover their card at a fixed height, also when collapsed, so the
// rendered width follows from the proportions
export const getSlideSizes = ({ width, height }: Artwork) =>
  `(min-width: 768px) ${Math.round((SLIDE_HEIGHT * width) / height)}px, calc(100vw - 6rem)`;

const warmed: HTMLImageElement[] = [];

export const warmSlides = (artworks: Artwork[]) => {
  if (warmed.length > 0) return;

  for (const artwork of artworks) {
    const { props } = getImageProps({
      src: artwork.image,
      alt: "",
      width: artwork.width,
      height: artwork.height,
      sizes: getSlideSizes(artwork),
    });

    const image = new Image();
    if (props.sizes) image.sizes = props.sizes;
    if (props.srcSet) image.srcset = props.srcSet;
    image.src = props.src;
    warmed.push(image);
  }
};
