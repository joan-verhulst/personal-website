"use client";

import { useEffect } from "react";
import { useContent } from "~/modules/content/components/content-provider";
import type { Content } from "~/modules/content/types";

// Waited after the page has loaded, so the home intro plays with the network
// to itself
const START_AFTER_MS = 2500;

// Loaded at once. Low enough that whatever the visitor opens still gets
// through first
const AT_ONCE = 4;

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

/**
 * Every image a section shows, in the order the sections are likeliest to be
 * opened. The same URLs the sections ask for, or they'd load twice. Videos
 * are left out: they're too large to load for everyone.
 */
const sourcesOf = (content: Content) => {
  const wallImages = [
    ...content.wall.flatMap((block) => block.items),
    ...content.experiments,
  ]
    .filter((item) => item.media.type === "image")
    .map((item) => item.media.src);

  return [
    ...new Set([
      ...content.photos.map((print) => print.image),
      ...content.artworks.map((artwork) => artwork.image),
      ...wallImages,
      ...content.records.map((record) => record.cover),
      content.about.image,
    ]),
  ].filter((source): source is string => Boolean(source));
};

const preload = (source: string) =>
  new Promise<void>((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = source;
    preloaded.push(image);
  });

/**
 * Loads every section's images in the background once the page has settled,
 * so opening Photography, Digital art or the wall shows them right away
 * instead of one by one. They come from R2, already at the size they show,
 * so this costs the visitor some data but nobody any money.
 */
const MediaPreloader = () => {
  const content = useContent();

  useEffect(() => {
    if (isSparingData()) return;

    const sources = sourcesOf(content);
    let isCancelled = false;
    let timer: number | undefined;
    let idle: number | undefined;

    const run = async () => {
      let next = 0;
      const worker = async () => {
        while (!isCancelled && next < sources.length) {
          await preload(sources[next++]);
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
