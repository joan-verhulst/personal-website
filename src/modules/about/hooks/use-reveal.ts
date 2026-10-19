"use client";

import { type RefObject, useLayoutEffect } from "react";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";

// What rises into place: the headings and the paragraphs, not the demos
const REVEALED = ":scope > :is(h2, p)";

// A CSS transition, so it stays smooth while the room and the film keep the
// main thread busy
const TRANSITION =
  "opacity 0.6s ease-out, translate 0.6s cubic-bezier(0.22, 1, 0.36, 1)";

/**
 * The headings and paragraphs in the element rise into place as they come
 * on screen, once each. With animations off they're just there. Hidden
 * before the first paint and left to the observer, not measured: a section
 * opening from home is scaled while it grows, and its scroller already
 * clips what isn't in view.
 */
const useReveal = (ref: RefObject<HTMLElement | null>) => {
  const { animationsEnabled } = useAnimationPreference();

  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || !animationsEnabled) return;
    const items = Array.from(root.querySelectorAll<HTMLElement>(REVEALED));
    for (const item of items) {
      item.style.opacity = "0";
      item.style.translate = "0 12px";
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const item = entry.target as HTMLElement;
          observer.unobserve(item);
          item.style.transition = TRANSITION;
          item.style.opacity = "";
          item.style.translate = "";
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const item of items) observer.observe(item);

    return () => {
      observer.disconnect();
      for (const item of items) {
        item.style.transition = "";
        item.style.opacity = "";
        item.style.translate = "";
      }
    };
  }, [ref, animationsEnabled]);
};

export default useReveal;
