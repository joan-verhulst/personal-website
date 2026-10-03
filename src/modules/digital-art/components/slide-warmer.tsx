"use client";

import { useEffect } from "react";
import { type Artwork, warmSlides } from "~/modules/digital-art/utils/slide-image";

interface Props {
  // The slides that are on screen when the page opens
  artworks: Artwork[];
}

/**
 * Starts loading the first slides when a link to the page is hovered or
 * touched, so the page has its pictures by the time it opens. Listens on the
 * document, which covers the tile on the home screen and the link in the
 * about modal alike.
 */
const SlideWarmer = ({ artworks }: Props) => {
  useEffect(() => {
    const handlePointerOver = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (!event.target.closest('a[href="/digital-art"]')) return;

      warmSlides(artworks);
      document.removeEventListener("pointerover", handlePointerOver);
    };

    document.addEventListener("pointerover", handlePointerOver);
    return () => {
      document.removeEventListener("pointerover", handlePointerOver);
    };
  }, [artworks]);

  return null;
};

export default SlideWarmer;
