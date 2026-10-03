"use client";

import { gsap } from "gsap";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import cn from "~/utils/cn";

interface Props {
  // Every cover is rendered and stacked, so switching never waits on a load
  covers: { id: string; src: string; alt: string }[];
  activeId: string;
  sizes: string;
  // Seconds per turn: 1.8 is a real 33⅓ rpm
  speed?: number;
  // A stopped record runs down and comes to rest, it doesn't snap back
  playing?: boolean;
  className?: string;
}

// Fine grooves across the whole record
const GROOVES =
  "repeating-radial-gradient(circle at center, #0e0e0e 0 0.6px, #1b1b1b 0.6px 1.8px)";

// What breaks the grooves up, in shares of the radius: the smooth run-out
// around the label, the gaps between songs and the lead-in at the edge
const BANDS =
  "radial-gradient(circle closest-side, transparent 36%, rgb(0 0 0 / 0.6) 36.5% 41%, transparent 41.5% 56.6%, rgb(255 255 255 / 0.07) 57% 57.6%, transparent 58% 72.6%, rgb(255 255 255 / 0.07) 73% 73.6%, transparent 74% 86.6%, rgb(255 255 255 / 0.06) 87% 87.5%, transparent 88% 95.5%, rgb(0 0 0 / 0.55) 96% 100%)";

// Light catching the grooves. Sits on top and doesn't spin, so the shine stays
// put while the record turns underneath it.
const SHEEN =
  "conic-gradient(from 32deg, transparent 0deg, rgb(255 255 255 / 0.03) 10deg, rgb(255 255 255 / 0.17) 24deg, rgb(255 255 255 / 0.03) 40deg, transparent 62deg, transparent 180deg, rgb(255 255 255 / 0.03) 190deg, rgb(255 255 255 / 0.13) 204deg, rgb(255 255 255 / 0.03) 220deg, transparent 242deg)";
// Vinyl shines, the paper label doesn't
const SHEEN_MASK =
  "radial-gradient(circle closest-side, transparent 36%, #000 37%)";

const SPINDLE =
  "radial-gradient(circle at 35% 30%, #ffffff, #c4c4c4 45%, #6e6e6e)";

const Vinyl = ({
  covers,
  activeId,
  sizes,
  speed = 1.8,
  playing = true,
  className,
}: Props) => {
  const { animationsEnabled } = useAnimationPreference();
  const spinRef = useRef<HTMLDivElement>(null);
  const isFirstRun = useRef(true);

  // A platter has weight: it takes a moment to get up to speed, and longer
  // to run down
  // biome-ignore lint/correctness/useExhaustiveDependencies: the animation is only there while animations are on
  useEffect(() => {
    const [animation] = spinRef.current?.getAnimations?.() ?? [];
    if (!animation) return;

    const target = playing ? 1 : 0;
    if (isFirstRun.current) {
      isFirstRun.current = false;
      animation.playbackRate = target;
      return;
    }

    const rate = { value: animation.playbackRate };
    const tween = gsap.to(rate, {
      value: target,
      duration: playing ? 0.9 : 1.5,
      ease: playing ? "power2.out" : "power3.out",
      onUpdate: () => {
        animation.playbackRate = rate.value;
      },
    });

    return () => {
      tween.kill();
    };
  }, [playing, animationsEnabled]);

  return (
    <div
      className={cn(
        "relative aspect-square rounded-full shadow-[0_16px_32px_-12px_rgb(0_0_0/0.35)]",
        className,
      )}
    >
      <div
        ref={spinRef}
        className={cn(
          "absolute inset-0 overflow-hidden rounded-full",
          animationsEnabled && "animate-spin motion-reduce:animate-none",
        )}
        style={{ background: GROOVES, animationDuration: `${speed}s` }}
      >
        <div className="absolute inset-0" style={{ background: BANDS }} />

        {/* Label */}
        <div className="absolute inset-[32%] overflow-hidden rounded-full">
          {covers.map((cover) => (
            <Image
              key={cover.id}
              src={cover.src}
              alt={cover.alt}
              fill
              sizes={sizes}
              className={cn(
                "object-cover transition-opacity duration-300",
                cover.id === activeId ? "opacity-100" : "opacity-0",
              )}
              draggable={false}
            />
          ))}
          {/* Pressed into the record, so its edge sits in shadow */}
          <div className="absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.4),inset_0_0_8px_rgb(0_0_0/0.35)]" />
        </div>
      </div>

      <div
        className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)]"
        style={{
          background: SHEEN,
          maskImage: SHEEN_MASK,
          WebkitMaskImage: SHEEN_MASK,
        }}
      />
      {/* Spindle */}
      <div
        className="absolute top-1/2 left-1/2 size-[3.4%] min-h-1.5 min-w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_2px_rgb(0_0_0/0.6)]"
        style={{ background: SPINDLE }}
      />
    </div>
  );
};

export default Vinyl;
