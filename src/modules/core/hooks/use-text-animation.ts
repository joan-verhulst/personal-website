"use client";

import { gsap } from "gsap/all";
import { useEffect, useRef, useCallback } from "react";

type TriggerMode = "load" | "hover" | "manual";

interface Options {
  delay?: number;
  duration?: number;
  stagger?: number;
  trigger?: TriggerMode;
  hoverRef?: React.RefObject<HTMLElement | null>;
  animationsEnabled?: boolean;
}

interface UseTextAnimationReturn {
  ref: React.RefObject<HTMLElement | null>;
  triggerAnimation: () => void;
  resetAnimation: () => void;
  resplit: () => void;
}

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

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion || !animationsEnabled) return;

    const text = element.textContent || "";
    const words = text.split(/\s+/).filter((w) => w.length > 0);

    if (words.length === 0) return;

    // Built as DOM nodes, not HTML: CMS text may hold a < or an &
    const wordElements = words.map((word) => {
      const span = document.createElement("span");
      span.className = "word-measure";
      span.style.display = "inline";
      span.textContent = word;
      return span;
    });
    element.replaceChildren(
      ...wordElements.flatMap((span, index) =>
        index === 0 ? [span] : [document.createTextNode(" "), span],
      ),
    );

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

  const replayAnimation = useCallback(() => {
    if (!isSetup.current) return;

    gsap.set(lineSpansRef.current, { yPercent: 100 });

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setupAnimation();

      if (trigger === "load" || trigger === "hover") {
        triggerAnimation();
      }
    }, 10);

    return () => {
      clearTimeout(timer);
      lineSpansRef.current.forEach((span) => gsap.killTweensOf(span));
    };
  }, [setupAnimation, triggerAnimation, trigger]);

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
