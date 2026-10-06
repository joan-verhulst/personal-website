"use client";

import { getImageProps } from "next/image";
import { useEffect } from "react";
import { useContent } from "~/modules/content/components/content-provider";
import type { Content } from "~/modules/content/types";
import { getSlideSizes } from "~/modules/digital-art/utils/slide-image";
import { mediaImageProps } from "~/modules/media/utils/media-url";
import { getTableImageSizes } from "~/modules/photography/utils/print-layouts";

// Waited after the page has loaded, so the home intro plays with the network
// to itself
const START_AFTER_MS = 2500;

// Loaded at once. Low enough that whatever the visitor opens still gets
// through first
const AT_ONCE = 4;

// What the record player and the About modal ask for, see vinyl.tsx and
// about-modal.tsx
const RECORD_SIZES = "200px";
const ABOUT_SIZES = "(min-width: 896px) 848px, 100vw";

// Kept, so the browser holds on to what it loaded
const preloaded: HTMLImageElement[] = [];

interface NetworkInformation {
  saveData?: boolean;
  effectiveType?: string;
}

/** A visitor who asked to save data, or on a slow connection, isn't preloaded for. */
const isSparingData = () => {
  const connection = (navigator as Navigator & { connection?: NetworkInformation })
    .connection;
  return Boolean(
    connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? ""),
  );
};

// An image as its section shows it: with the same sizes, the browser picks
// the same stored width it will pick there. Without sizes, the file itself
interface Preload {
  src: string;
  sizes?: string;
}

/**
 * Every image a section shows, in the order the sections are likeliest to be
 * opened. Videos are left out: they're too large to load for everyone.
 */
const preloadsOf = (content: Content): Preload[] => {
  // The wall and its modals show the files themselves, for sharp screenshots
  const wallImages = [
    ...content.wall.flatMap((block) => block.items),
    ...content.experiments,
  ]
    .filter((item) => item.media.type === "image")
    .map((item) => ({ src: item.media.src }));

  const all: (Preload | null)[] = [
    // The photo table is how the page opens
    ...content.photos.map((print) => ({
      src: print.image,
      sizes: getTableImageSizes(print),
    })),
    ...content.artworks.map((artwork) => ({
      src: artwork.image,
      sizes: getSlideSizes(artwork),
    })),
    ...wallImages,
    ...content.records.map((record) => ({
      src: record.cover,
      sizes: RECORD_SIZES,
    })),
    content.about.image ? { src: content.about.image, sizes: ABOUT_SIZES } : null,
  ];

  const seen = new Set<string>();
  return all.filter((preload): preload is Preload => {
    if (!preload || seen.has(preload.src)) return false;
    seen.add(preload.src);
    return true;
  });
};

const preload = ({ src, sizes }: Preload) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.onload = () => resolve();
    image.onerror = () => resolve();

    if (sizes) {
      const { props } = getImageProps({
        src,
        alt: "",
        fill: true,
        sizes,
        ...mediaImageProps(src),
      });
      // Sizes first, they decide which file the browser picks from the set
      if (props.sizes) image.sizes = props.sizes;
      if (props.srcSet) image.srcset = props.srcSet;
      image.src = props.src;
    } else {
      image.src = src;
    }
    preloaded.push(image);
  });

/**
 * Loads every section's images in the background once the page has settled,
 * so opening Photography, Digital art or the wall shows them right away
 * instead of one by one. They come straight from R2, at the stored size the
 * section will ask for, so this costs the visitor some data but nobody any
 * money.
 */
const MediaPreloader = () => {
  const content = useContent();

  useEffect(() => {
    if (isSparingData()) return;

    const queue = preloadsOf(content);
    let isCancelled = false;
    let timer: number | undefined;
    let idle: number | undefined;

    const run = async () => {
      let next = 0;
      const worker = async () => {
        while (!isCancelled && next < queue.length) {
          await preload(queue[next++]);
        }
      };
      await Promise.all(Array.from({ length: AT_ONCE }, worker));
    };

    const start = () => {
      timer = window.setTimeout(() => {
        if ("requestIdleCallback" in window) {
          idle = window.requestIdleCallback(() => run(), { timeout: 3000 });
        } else {
          run();
        }
      }, START_AFTER_MS);
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });

    return () => {
      isCancelled = true;
      window.removeEventListener("load", start);
      window.clearTimeout(timer);
      if (idle !== undefined) window.cancelIdleCallback(idle);
    };
  }, [content]);

  return null;
};

export default MediaPreloader;
