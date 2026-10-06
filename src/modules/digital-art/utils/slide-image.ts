import { getImageProps } from "next/image";
import type { Artwork } from "~/modules/content/types";
import { mediaImageProps } from "~/modules/media/utils/media-url";

export type { Artwork };

// Height of a slide on desktop. On phones slides span the screen instead
export const SLIDE_HEIGHT = 384;
// The slides on screen when the page opens. These load right away, and are
// warmed up from the home screen
export const FIRST_SLIDES = 6;

// Slides cover their card at a fixed height, also when collapsed, so the
// rendered width follows from the proportions
export const getSlideSizes = ({ width, height }: Artwork) =>
  `(min-width: 768px) ${Math.round((SLIDE_HEIGHT * width) / height)}px, calc(100vw - 6rem)`;

// Kept, so the browser holds on to what it loaded
const warmed: HTMLImageElement[] = [];

/**
 * Loads slides ahead of the page, so they're there when it opens. Asks for
 * exactly what the slide itself will ask for, or it would load twice.
 */
export const warmSlides = (artworks: Artwork[]) => {
  if (warmed.length > 0) return;

  for (const artwork of artworks) {
    const { props } = getImageProps({
      src: artwork.image,
      alt: "",
      width: artwork.width,
      height: artwork.height,
      sizes: getSlideSizes(artwork),
      // Like the slide: the stored size that fits, straight from R2
      ...mediaImageProps(artwork.image),
    });

    const image = new Image();
    // Sizes first, they decide which file the browser picks from the set
    if (props.sizes) image.sizes = props.sizes;
    if (props.srcSet) image.srcset = props.srcSet;
    image.src = props.src;
    warmed.push(image);
  }
};
