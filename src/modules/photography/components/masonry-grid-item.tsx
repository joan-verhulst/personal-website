import type { PhotographyProject } from "~/data/photography-projects";
import { useRef, useCallback, useEffect, use } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const FROM_SCALE = 0.65;
const FROM_Y = 180;

const FROM_X_BY_COL: Record<number, number> = {
  0: -120,
  1: 0,
  2: 120,
};

interface GridItemProps {
  item: PhotographyProject & { _flatIndex: number };
  colIndex: number;
  onClick: () => void;
}

const MasonryGridItem = ({ item, colIndex, onClick }: GridItemProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // ── Global batch queue ────────────────────────────────────────────────────────
  // Collects all cards that enter the viewport in the same scroll "burst" and
  // staggers them so they don't all fire at once.

  useEffect(() => {
    ScrollTrigger.batch("[data-masonry-item]", {
      onEnter: (elements) => {
        gsap.to(elements, {
          x: 0,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: "power3.out",
        });
      },
      start: "top 85%",
      once: true,
    });
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const fromX = FROM_X_BY_COL[colIndex] ?? 0;

    // Skip items already visible on load
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return;

    gsap.set(el, { x: fromX, y: FROM_Y, scale: FROM_SCALE });
  }, [colIndex]);

  // ── Hover ──────────────────────────────────────────────────────────────────

  const handleMouseEnter = useCallback(() => {
    gsap.to(wrapperRef.current, {
      scale: 0.95,
      duration: 0.4,
      ease: "power2.inOut",
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    gsap.to(wrapperRef.current, {
      scale: 1,
      duration: 0.4,
      ease: "power2.inOut",
    });
  }, []);

  return (
    <div
      ref={wrapperRef}
      data-masonry-item
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group relative w-full overflow-hidden rounded-2xl cursor-pointer"
      aria-label={`Open ${item.title}`}
    >
      <img
        src={item.image}
        alt={item.title}
        className="w-full h-auto block will-change-transform"
        draggable={false}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-neutral-950/0 pointer-events-none" />
    </div>
  );
};

export default MasonryGridItem;
