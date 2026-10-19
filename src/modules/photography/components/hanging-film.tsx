"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import type { Film } from "~/modules/photography/utils/film-scene";
import type { Print } from "~/modules/photography/utils/print-layouts";
import cn from "~/utils/cn";
import { scrollerOf } from "~/utils/footer";

// How much of it shows before the film is swung, as if just hung up
const SEEN_AT = 0.25;

// A frame is about 290 px tall in the film's texture, so this is plenty
const photoAddress = (image: string) =>
  `/_next/image?url=${encodeURIComponent(image)}&w=384&q=75`;

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Being hung up, on screen, or not possible here
type Mode = "building" | "ready" | "failed";

interface Props {
  // In the CMS's order, which the roll runs through
  prints: Print[];
  className?: string;
}

/**
 * Decoration: my photos as negatives, a roll cut into strips, hanging to
 * dry from a rail on the page, drawn with three.js, see film-scene.ts. The
 * strips sway, and swing where the pointer brushes past or pokes them.
 * Hung up once it's about a screen away, drawn only while it shows, and
 * left out where it can't be drawn. Drawn at a set size in its box's top
 * right corner, with the rest for its shadows: about 176 by 640 pixels
 * holds it all.
 */
const HangingFilm = ({ prints, className }: Props) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const filmRef = useRef<Film | null>(null);

  const [isNear, setIsNear] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [isSeen, setIsSeen] = useState(false);
  const [mode, setMode] = useState<Mode>("building");
  const { animationsEnabled } = useAnimationPreference();

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Opened over home, the page scrolls in the layer, which cuts off what's
    // past its edges, so a screen away is measured from there
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsNear(true);
        near.disconnect();
      },
      { root: scrollerOf(stage), rootMargin: "100% 0px" },
    );
    const inView = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
        if (entry.intersectionRatio >= SEEN_AT) setIsSeen(true);
      },
      { threshold: [0, SEEN_AT] },
    );
    near.observe(stage);
    inView.observe(stage);
    return () => {
      near.disconnect();
      inView.disconnect();
    };
  }, []);

  // Hung up when it's near, with the photos as they were then
  // biome-ignore lint/correctness/useExhaustiveDependencies: built once, see above
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isNear || !canvas) return;
    let film: Film | null = null;
    let isCancelled = false;

    (async () => {
      try {
        const { createFilm, STRIPS } = await import(
          "~/modules/photography/utils/film-scene"
        );
        if (isCancelled) return;
        const frames = STRIPS.reduce((sum, strip) => sum + strip.frames, 0);
        film = await createFilm(
          canvas,
          prints.slice(0, frames).map((print) => photoAddress(print.image)),
          () => setMode("failed"),
        );
      } catch {
        if (!isCancelled) setMode("failed");
        return;
      }
      if (isCancelled) {
        film.destroy();
        return;
      }
      filmRef.current = film;
      setMode("ready");
    })();

    return () => {
      isCancelled = true;
      film?.destroy();
      filmRef.current = null;
    };
  }, [isNear]);

  useEffect(() => {
    const film = filmRef.current;
    const stage = stageRef.current;
    if (mode !== "ready" || !film || !stage) return;
    const observer = new ResizeObserver(() => film.resize());
    observer.observe(stage);
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (mode === "ready") filmRef.current?.setVisible(isInView);
  }, [mode, isInView]);

  useEffect(() => {
    if (mode === "ready") {
      filmRef.current?.setMotion(animationsEnabled && !prefersReducedMotion());
    }
  }, [mode, animationsEnabled]);

  // Swung once, when it's first seen
  useEffect(() => {
    if (mode === "ready" && isSeen) filmRef.current?.hang();
  }, [mode, isSeen]);

  const at = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  if (mode === "failed") return null;

  return (
    <div ref={stageRef} aria-hidden className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        onPointerMove={(event) => {
          if (event.pointerType === "mouse") filmRef.current?.point(at(event));
        }}
        onPointerLeave={() => filmRef.current?.point(null)}
        onPointerUp={(event) => {
          if (event.button !== 0) return;
          const { x, y } = at(event);
          filmRef.current?.poke(x, y);
        }}
        className={cn(
          "block size-full transition-opacity duration-700",
          mode === "ready" ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
};

export default HangingFilm;
