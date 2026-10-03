"use client";

import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import {
  ALUMINIUM,
  BRASS,
  CHROME,
  GRAIN,
  PLINTH,
} from "~/modules/favorites/utils/textures";
import cn from "~/utils/cn";

/**
 * How far the tonearm is turned from pointing straight down the deck, in
 * degrees: parked on its rest, at the first groove, and at the last one before
 * the label. Worked out from where the pivot and the platter sit below.
 */
export const ARM = { rest: 12, outer: 27.5, inner: 47.5 };

// Dots around the platter's rim, the kind a strobe light holds still at 33⅓
const STROBE =
  "repeating-conic-gradient(rgb(0 0 0 / 0.5) 0deg 0.8deg, transparent 0.8deg 2.25deg)";
const STROBE_MASK =
  "radial-gradient(circle closest-side, transparent 93.5%, #000 94% 98.5%, transparent 99%)";

const COUNTERWEIGHT =
  "linear-gradient(90deg, #2c2c2e, #8b8b8d 38%, #4a4a4c 62%, #1d1d1f)";

const ROUND_BUTTON =
  "flex shrink-0 cursor-pointer items-center justify-center rounded-full focus-visible:outline-2 focus-visible:outline-[#d7b97a] focus-visible:outline-offset-2";
const SKIP_BUTTON = cn(
  ROUND_BUTTON,
  "size-[max(6.6cqw,2rem)] bg-linear-to-b from-[#3a3a3d] to-[#1b1b1d] text-neutral-50/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_2px_4px_rgb(0_0_0/0.5)] transition-colors duration-200 hover:text-neutral-50 active:translate-y-px",
);
const ICON = "size-[max(2.8cqw,0.8125rem)]";

interface Props {
  // Turned by the player, to follow the record
  armRef: RefObject<HTMLDivElement | null>;
  isPlaying: boolean;
  // Volume as the fader's position, 0 to 1
  level: number;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLevel: (level: number) => void;
  onMute: () => void;
  // The record, set on the platter
  children: ReactNode;
}

/**
 * The deck: a lacquered plinth with an aluminium platter, a tonearm and its
 * controls. Everything on it is sized from the deck's own width.
 */
const Turntable = ({
  armRef,
  isPlaying,
  level,
  onToggle,
  onPrevious,
  onNext,
  onLevel,
  onMute,
  children,
}: Props) => {
  const haptic = useHapticSound();
  const VolumeIcon = level === 0 ? VolumeX : level < 0.5 ? Volume1 : Volume2;

  return (
    <div className="@container w-full">
      <div
        className="relative aspect-[100/90] rounded-[5.5cqw] shadow-[inset_0_1px_0_rgb(255_255_255/0.14),inset_0_-2px_0_rgb(0_0_0/0.5),0_18px_26px_-18px_rgb(0_0_0/0.6)] max-md:aspect-square"
        style={{ background: PLINTH }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[5.5cqw] opacity-30 mix-blend-overlay"
          style={{ backgroundImage: GRAIN }}
        />
        {/* A brass line set into the lacquer */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[1.6cqw] rounded-[4.2cqw] border border-[#d7b97a]/25"
        />

        {/* Platter */}
        <div
          className="absolute top-[4cqw] left-[4cqw] size-[68cqw] rounded-full shadow-[0_1.4cqw_2.6cqw_rgb(0_0_0/0.55),inset_0_0_0_1px_rgb(255_255_255/0.3)]"
          style={{ background: ALUMINIUM }}
        >
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background: STROBE,
              maskImage: STROBE_MASK,
              WebkitMaskImage: STROBE_MASK,
            }}
          />
          {/* Mat */}
          <div className="absolute inset-[2.6cqw] rounded-full bg-[#0a0a0a] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]" />
          <div className="absolute inset-[3cqw]">{children}</div>
        </div>

        {/* Arm rest */}
        <div
          aria-hidden
          className="absolute top-[41.6cqw] left-[76.6cqw] h-[3.6cqw] w-[5.6cqw] rounded-[1cqw] bg-linear-to-b from-[#3a3a3d] to-[#151517] shadow-[inset_0_1px_0_rgb(255_255_255/0.14),0_0.4cqw_0.8cqw_rgb(0_0_0/0.5)]"
        />

        {/* Pivot */}
        <div
          aria-hidden
          className="absolute top-[11cqw] left-[79cqw] size-[12cqw] rounded-full bg-linear-to-b from-[#3d3d40] to-[#131315] shadow-[inset_0_1px_0_rgb(255_255_255/0.16),0_0.8cqw_1.6cqw_rgb(0_0_0/0.55)]"
        >
          <div
            className="absolute inset-[1.4cqw] rounded-full opacity-80"
            style={{ background: ALUMINIUM }}
          />
        </div>

        {/* Tonearm, drawn pointing down the deck and turned about its pivot */}
        <div
          ref={armRef}
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-[17cqw] left-[85cqw] size-0 transition-[filter] duration-500",
            // Lifted off the record, its shadow falls further away
            isPlaying
              ? "[filter:drop-shadow(0.4cqw_0.7cqw_0.5cqw_rgb(0_0_0/0.55))]"
              : "[filter:drop-shadow(1cqw_1.8cqw_1.1cqw_rgb(0_0_0/0.4))]",
          )}
          style={{ transform: `rotate(${ARM.rest}deg)` }}
        >
          {/* Counterweight, behind the pivot */}
          <div
            className="absolute top-[-13.5cqw] left-[-2.8cqw] h-[7.5cqw] w-[5.6cqw] rounded-[1cqw]"
            style={{ background: COUNTERWEIGHT }}
          />
          <div
            className="absolute top-[-7cqw] left-[-0.7cqw] h-[7cqw] w-[1.4cqw]"
            style={{ background: CHROME }}
          />
          {/* Tube */}
          <div
            className="absolute top-0 left-[-0.7cqw] h-[38.5cqw] w-[1.4cqw] rounded-b-full"
            style={{ background: CHROME }}
          />
          {/* Headshell, angled so the cartridge sits square in the groove */}
          <div className="absolute top-[37.5cqw] left-0 size-0 rotate-[22deg]">
            <div className="absolute top-0 left-[-2.3cqw] h-[8.6cqw] w-[4.6cqw] rounded-[0.9cqw] bg-linear-to-b from-[#4a4a4d] to-[#161618] shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]">
              {/* Cartridge */}
              <div className="absolute inset-x-[0.7cqw] bottom-[0.7cqw] h-[4.2cqw] rounded-[0.5cqw] bg-linear-to-b from-primary-400 to-primary-600" />
            </div>
            {/* Finger lift */}
            <div
              className="absolute top-[1.6cqw] left-[1.8cqw] h-[0.9cqw] w-[3cqw] rounded-full"
              style={{ background: CHROME }}
            />
          </div>
          {/* Pivot cap */}
          <div
            className="absolute top-[-2.6cqw] left-[-2.6cqw] size-[5.2cqw] rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.25)]"
            style={{ background: BRASS }}
          />
        </div>

        {/* Controls, along the front edge */}
        {/* The buttons keep a minimum size on small decks, so the row grows with
            them and keeps its distance from the trim instead of running into it */}
        <div className="absolute inset-x-[max(5cqw,1.25rem)] bottom-[max(3.2cqw,1.25rem)] flex h-[max(10cqw,2.5rem)] items-center gap-[max(2.4cqw,0.5rem)]">
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={onToggle}
            onMouseEnter={haptic.onMouseEnter}
            className={cn(
              ROUND_BUTTON,
              "relative size-[max(9cqw,2.5rem)] shadow-[0_2px_5px_rgb(0_0_0/0.55)] active:translate-y-px",
            )}
            style={{ background: BRASS }}
          >
            <span className="absolute inset-[max(0.7cqw,3px)] flex items-center justify-center rounded-full bg-linear-to-b from-[#2f2f32] to-[#111112] text-neutral-50 shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]">
              {isPlaying ? (
                <Pause className={ICON} fill="currentColor" />
              ) : (
                <Play className={ICON} fill="currentColor" />
              )}
            </span>
          </button>
          {/* Lit while the platter is driven */}
          <span
            aria-hidden
            className={cn(
              "size-[max(1.3cqw,5px)] shrink-0 rounded-full transition-[background-color,box-shadow] duration-300",
              isPlaying
                ? "bg-primary-500 shadow-[0_0_8px_1px_rgb(58_155_216/0.8)]"
                : "bg-neutral-700",
            )}
          />
          <button
            type="button"
            aria-label="Previous record"
            onClick={onPrevious}
            onMouseEnter={haptic.onMouseEnter}
            className={SKIP_BUTTON}
          >
            <SkipBack className={ICON} fill="currentColor" />
          </button>
          <button
            type="button"
            aria-label="Next record"
            onClick={onNext}
            onMouseEnter={haptic.onMouseEnter}
            className={SKIP_BUTTON}
          >
            <SkipForward className={ICON} fill="currentColor" />
          </button>

          <span
            aria-hidden
            className="ml-auto @sm:block hidden text-[#d7b97a]/70 text-[max(2.1cqw,0.625rem)] uppercase tracking-[0.2em]"
          >
            33⅓
          </span>

          <button
            type="button"
            aria-label={level === 0 ? "Unmute" : "Mute"}
            onClick={onMute}
            onMouseEnter={haptic.onMouseEnter}
            className="@sm:ml-0 ml-auto shrink-0 cursor-pointer text-neutral-50/60 transition-colors duration-200 hover:text-neutral-50 focus-visible:outline-2 focus-visible:outline-[#d7b97a] focus-visible:outline-offset-2"
          >
            <VolumeIcon className="size-[max(3cqw,0.875rem)]" />
          </button>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.01}
            value={level}
            onChange={(event) => onLevel(Number(event.target.value))}
            className="deck-fader w-[24cqw] min-w-0 shrink"
            style={{ "--fader-fill": `${level * 100}%` } as CSSProperties}
          />
        </div>
      </div>
    </div>
  );
};

export default Turntable;
