import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { gsap } from "gsap";

// Storage keys for transition state
export const TRANSITION_KEY = "page-transition-active";
export const TRANSITION_DIRECTION_KEY = "page-transition-direction";

export type TransitionDirection = "inward" | "outward";

// ============================================
// 1. EXIT ANIMATIONS (current page leaving)
// ============================================
export const exitAnimations = {
  /** Scale current page down to 0.9 */
  scaleDown: (element: Element) =>
    gsap.to(element, {
      y: "-100%",
      scale: 0.9,
      duration: 0.8,
      ease: "power2.inOut",
    }),

  /** Slide current page out to the top */
  slideOutTop: (element: Element) =>
    gsap.to(element, {
      y: "-100%",
      scale: 0.9,
      duration: 0.8,
      ease: "power2.inOut",
    }),
};

// ============================================
// 2. ENTER INWARD (new page sliding in)
// ============================================
export const enterInwardAnimation = (element: HTMLElement) => {
  gsap.set(element, {
    y: "100%",
    scale: 0.9,
    visibility: "visible",
  });

  return gsap.to(element, {
    y: 0,
    scale: 1,
    duration: 0.8,
    ease: "power2.inOut",
  });
};

// ============================================
// 3. ENTER OUTWARD (page revealed underneath)
// ============================================
export const enterOutwardAnimation = (element: HTMLElement) => {
  gsap.set(element, {
    scale: 0.9,
    y: "100%",
    visibility: "visible",
  });

  return gsap.to(element, {
    scale: 1,
    y: 0,
    duration: 0.8,
    ease: "power2.inOut",
  });
};

// ============================================
// Navigation helper
// ============================================
export const navigateWithTransition = (
  href: string,
  router: AppRouterInstance,
  direction: TransitionDirection = "inward",
) => {
  const pageContainer = document.querySelector("[data-page-transition]");

  if (!pageContainer) {
    router.push(href);
    return;
  }

  // Set flags so the new page knows which enter animation to play
  sessionStorage.setItem(TRANSITION_KEY, "true");
  sessionStorage.setItem(TRANSITION_DIRECTION_KEY, direction);

  // Choose exit animation based on direction
  const exitAnimation =
    direction === "inward"
      ? exitAnimations.scaleDown(pageContainer)
      : exitAnimations.slideOutTop(pageContainer);

  exitAnimation.then(() => {
    router.push(href);
  });
};
