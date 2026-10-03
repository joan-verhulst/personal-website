"use client";

import { gsap } from "gsap/all";
import { useEffect, useRef, useCallback } from "react";

type TriggerMode = "load" | "hover" | "manual";

interface Options {
  delay?: number;
  duration?: number;
  stagger?: number;
  trigger?: TriggerMode;
  /** For hover mode: optionally provide a parent element ref to listen for hover */
  hoverRef?: React.RefObject<HTMLElement | null>;
  /** Whether animations are enabled. When false, text is shown without animation. */
  animationsEnabled?: boolean;
}

interface UseTextAnimationReturn {
  ref: React.RefObject<HTMLElement | null>;
  triggerAnimation: () => void;
  resetAnimation: () => void;
  resplit: () => void;
}

/**
 * A hook that animates the text content of an HTML element by lines.
 *
 * @param options - An optional object with animation options.
 * @param options.delay - The delay in seconds before the animation starts. Default is 0.
 * @param options.duration - The duration in seconds of each line's animation. Default is 0.5.
 * @param options.stagger - The delay between each line's animation. Default is 0.08.
 * @param options.trigger - When to trigger the animation: "load" (on mount), "hover" (on mouseenter), or "manual". Default is "load".
 * @param options.hoverRef - For hover mode: optionally provide a parent element ref to listen for hover events.
 * @returns An object with the ref, triggerAnimation function for manual triggering, and resetAnimation to reset state.
 */

const useTextAnimation = ({
  delay = 0,
  duration = 0.5,
  stagger = 0.08,
  trigger = "load",
  hoverRef,
  animationsEnabled = true,
}: Options = {}): UseTextAnimationReturn => {
  const ref = useRef<HTMLElement | null>(null);
  const hasAnimated = useRef(false);
  const isSetup = useRef(false);
  const lineSpansRef = useRef<Element[]>([]);

  const setupAnimation = useCallback(() => {
    const element = ref.current;
    if (!element || isSetup.current) return;

    // Check if user has preference for reduced motion or animations are disabled
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !animationsEnabled) return;

    // First, wrap each word in a span to measure positions
    const text = element.textContent || "";
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (words.length === 0) return;

    // Temporarily wrap words to measure their positions. Built as elements,
    // never as an HTML string: the text comes from the CMS and may hold a <
    // or an &, which would otherwise be read as markup
    const wordElements = words.map((word) => {
      const span = document.createElement("span");
      span.className = "word-measure";
      span.style.display = "inline";
      span.textContent = word;
      return span;
    });
    // Spaces between the spans keep the line breaks where the text had them
    element.replaceChildren(
      ...wordElements.flatMap((span, index) =>
        index === 0 ? [span] : [document.createTextNode(" "), span],
      ),
    );

    // Get the bounding rects to determine which words are on which line
    const lines: string[][] = [];
    let currentLine: string[] = [];
    let currentTop: number | null = null;

    wordElements.forEach((wordEl, index) => {
      const rect = wordEl.getBoundingClientRect();
      if (currentTop === null || Math.abs(rect.top - currentTop) < 5) {
        currentLine.push(words[index]);
        if (currentTop === null) currentTop = rect.top;
      } else {
        lines.push(currentLine);
        currentLine = [words[index]];
        currentTop = rect.top;
      }
    });

    if (currentLine.length > 0) {
      lines.push(currentLine);
    }

    // Now wrap each line in animatable spans
    const lineSpans = lines.map((lineWords) => {
      const inner = document.createElement("span");
      inner.className = "animation-line block";
      inner.textContent = lineWords.join(" ");
      return inner;
    });
    element.replaceChildren(
      ...lineSpans.map((inner) => {
        const outer = document.createElement("span");
        outer.className = "block overflow-hidden";
        outer.append(inner);
        return outer;
      }),
    );

    // Set the initial state of all line spans
    lineSpansRef.current = lineSpans;
    gsap.set(lineSpansRef.current, { yPercent: 100 });

    isSetup.current = true;
  }, []);

  const resplit = useCallback(() => {
    isSetup.current = false;
    hasAnimated.current = false;
    setupAnimation();
  }, [setupAnimation]);

  const triggerAnimation = useCallback(() => {
    const element = ref.current;
    if (!element || hasAnimated.current || !isSetup.current) return;

    hasAnimated.current = true;

    gsap
      .to(lineSpansRef.current, {
        duration,
        stagger,
        yPercent: 0,
        ease: "power2.out",
      })
      .delay(delay);
  }, [delay, duration, stagger]);

  // Force re-trigger: reset then animate (for hover replay)
  const replayAnimation = useCallback(() => {
    if (!isSetup.current) return;

    // Instantly hide
    gsap.set(lineSpansRef.current, { yPercent: 100 });

    // Animate back in (no delay for hover replay)
    gsap.to(lineSpansRef.current, {
      duration,
      stagger,
      yPercent: 0,
      ease: "power2.out",
    });
  }, [duration, stagger]);

  const resetAnimation = useCallback(() => {
    if (!isSetup.current) return;
    hasAnimated.current = false;
    gsap.set(lineSpansRef.current, { yPercent: 100 });
  }, []);

  // Setup on mount
  useEffect(() => {
    // Small delay to ensure element is rendered
    const timer = setTimeout(() => {
      setupAnimation();

      // For both "load" and "hover" modes, animate on initial load
      if (trigger === "load" || trigger === "hover") {
        triggerAnimation();
      }
    }, 10);

    return () => {
      clearTimeout(timer);
      lineSpansRef.current.forEach((span) => gsap.killTweensOf(span));
    };
  }, [setupAnimation, triggerAnimation, trigger]);

  // Handle hover trigger - replay animation on hover
  useEffect(() => {
    if (trigger !== "hover") return;

    const hoverElement = hoverRef?.current ?? ref.current;
    if (!hoverElement) return;

    const handleMouseEnter = () => {
      replayAnimation();
    };

    hoverElement.addEventListener("mouseenter", handleMouseEnter);

    return () => {
      hoverElement.removeEventListener("mouseenter", handleMouseEnter);
    };
  }, [trigger, replayAnimation, hoverRef]);

  return { ref, triggerAnimation, resetAnimation, resplit };
};

export default useTextAnimation;
