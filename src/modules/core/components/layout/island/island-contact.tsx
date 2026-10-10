"use client";

import { gsap } from "gsap";
import { Mail } from "lucide-react";
import { useEffect, useRef } from "react";
import StatusDot from "~/modules/contact/components/status-dot";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import cn from "~/utils/cn";
import { openContact } from "~/utils/open-contact";

/**
 * The pill's width and the gap before it. The island leaves this much room
 * on both sides, so it stays centered and the pill stays on screen.
 */
export const CONTACT_ROOM = "2.5rem";

// When the pill first rings, and how often after that
const FIRST_RING = 4000;
const RING_EVERY = 14000;

interface Props {
  // The island's width as CSS, the pill keeps to its right edge
  islandWidth: string;
}

/**
 * The way to get in touch from every page: a pill on the island's right that
 * opens the contact modal. It follows the island as it grows, on the same
 * spring but at its own size, and rings now and then to be noticed.
 */
const IslandContact = ({ islandWidth }: Props) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isPointingRef = useRef(false);
  const { animationsEnabled } = useAnimationPreference();
  const haptic = useHapticSound();

  useEffect(() => {
    const button = buttonRef.current;
    if (!button || !animationsEnabled) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let tween: gsap.core.Tween | null = null;
    // A short shake, like a bell. Not while it's pointed at or out of sight
    const ring = () => {
      if (isPointingRef.current || document.hidden) return;
      tween?.kill();
      tween = gsap.to(button, {
        keyframes: { rotation: [0, -14, 11, -8, 5, -2, 0] },
        duration: 0.7,
        ease: "power1.inOut",
        clearProps: "rotate",
      });
    };

    const first = setTimeout(ring, FIRST_RING);
    const interval = setInterval(ring, RING_EVERY);
    return () => {
      clearTimeout(first);
      clearInterval(interval);
      tween?.kill();
      gsap.set(button, { clearProps: "rotate" });
    };
  }, [animationsEnabled]);

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label="Contact"
      onClick={() => {
        haptic.onClick();
        openContact({ from: "pill" });
      }}
      onPointerEnter={() => {
        isPointingRef.current = true;
      }}
      onPointerLeave={() => {
        isPointingRef.current = false;
      }}
      onMouseEnter={haptic.onMouseEnter}
      className={cn(
        // Level with the island, over the open section and under modals
        "fixed top-3 z-10 flex size-9 cursor-pointer items-center justify-center rounded-full bg-primary-500 text-neutral-50 hover:bg-primary-600 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
        animationsEnabled
          ? "[transition:left_550ms_cubic-bezier(0.34,1.4,0.64,1),background-color_200ms] motion-reduce:transition-none"
          : "transition-colors duration-200",
      )}
      style={{ left: `calc(50% + ${islandWidth} / 2 + 0.25rem)` }}
    >
      <Mail className="size-4" />
      <StatusDot className="absolute top-0.5 right-0.5" />
    </button>
  );
};

export default IslandContact;
