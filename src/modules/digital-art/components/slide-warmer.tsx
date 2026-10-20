"use client";

import { useEffect } from "react";
import { type Artwork, warmSlides } from "~/modules/digital-art/utils/slide-image";

interface Props {
  artworks: Artwork[];
}

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
