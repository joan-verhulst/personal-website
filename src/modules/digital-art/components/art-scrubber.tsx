"use client";

import {
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useRef,
} from "react";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";

// Height of a stem, in pixels
const STEM = { shown: 14, active: 10, near: 9, rest: 6 };

interface Props {
  pieces: { id: string; title: string }[];
  activeIndex: number;
  // The piece a drag on the slider is heading for
  pendingIndex: number | null;
  // The piece under the pointer, or being scrubbed to
  pointedIndex: number | null;
  onPoint: (index: number | null) => void;
  onSelect: (index: number) => void;
}

/**
 * A stem for every piece, like the ticks on the island's dial. The blue one
 * is the piece that's showing. Hover or drag along them to point at another,
 * which the island names, and click or let go to go there.
 */
const ArtScrubber = ({
  pieces,
  activeIndex,
  pendingIndex,
  pointedIndex,
  onPoint,
  onSelect,
}: Props) => {
  const haptic = useHapticSound();
  const trackRef = useRef<HTMLDivElement>(null);
  const isScrubbing = useRef(false);
  // Pointer moves come faster than renders, this one is always current
  const pointed = useRef<number | null>(null);

  const shown = pointedIndex ?? pendingIndex ?? activeIndex;

  const getIndex = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return activeIndex;
    const index = Math.floor(
      ((clientX - rect.left) / rect.width) * pieces.length,
    );
    return Math.min(pieces.length - 1, Math.max(0, index));
  };

  const point = (index: number | null) => {
    if (index === pointed.current) return;
    pointed.current = index;
    // A tick for every stem it passes
    if (index !== null) haptic.onMouseEnter();
    onPoint(index);
  };

  const select = (index: number) => {
    haptic.onClick();
    onSelect(index);
  };

  const handlePointerDown = (event: ReactPointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    isScrubbing.current = true;
    point(getIndex(event.clientX));
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    if (event.pointerType === "mouse" || isScrubbing.current)
      point(getIndex(event.clientX));
  };

  const handlePointerUp = (event: ReactPointerEvent) => {
    if (!isScrubbing.current) return;
    isScrubbing.current = false;
    select(getIndex(event.clientX));
    // Without a pointer left hovering, nothing is pointed at anymore
    if (event.pointerType !== "mouse") point(null);
  };

  const handlePointerCancel = () => {
    isScrubbing.current = false;
    point(null);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    const last = pieces.length - 1;
    const next = {
      ArrowLeft: activeIndex - 1,
      ArrowDown: activeIndex - 1,
      ArrowRight: activeIndex + 1,
      ArrowUp: activeIndex + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;

    event.preventDefault();
    const index = Math.min(last, Math.max(0, next));
    if (index !== activeIndex) select(index);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label="Pieces"
      aria-valuemin={1}
      aria-valuemax={pieces.length}
      aria-valuenow={activeIndex + 1}
      aria-valuetext={pieces[activeIndex]?.title}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={() => {
        if (!isScrubbing.current) point(null);
      }}
      onKeyDown={handleKeyDown}
      className="flex h-5 cursor-pointer touch-none select-none items-end rounded-[4px] outline-none focus-visible:ring-1 focus-visible:ring-neutral-50/60"
    >
      {pieces.map(({ id }, index) => {
        const isNear = Math.abs(index - shown) === 1;
        const height =
          index === shown
            ? STEM.shown
            : index === activeIndex
              ? STEM.active
              : isNear
                ? STEM.near
                : STEM.rest;

        return (
          <span
            key={id}
            className="flex h-full flex-1 items-end justify-center"
          >
            <span
              className={cn(
                "w-[1.5px] rounded-full transition-[height,background-color] duration-300 ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none",
                index === activeIndex
                  ? "bg-primary"
                  : index === shown
                    ? "bg-neutral-50"
                    : isNear
                      ? "bg-neutral-50/60"
                      : "bg-neutral-50/30",
              )}
              style={{ height }}
            />
          </span>
        );
      })}
    </div>
  );
};

export default ArtScrubber;
