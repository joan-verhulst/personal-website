"use client";

import { useRef, useEffect, type PropsWithChildren } from "react";
import { usePathname } from "next/navigation";
import {
  TRANSITION_KEY,
  TRANSITION_DIRECTION_KEY,
  type TransitionDirection,
  enterInwardAnimation,
  enterOutwardAnimation,
} from "~/utils/page-transition";
import Header from "~components/layout/header";

const Template = ({ children }: PropsWithChildren) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Show back button on all pages except home
  const showBackButton = pathname !== "/";

  useEffect(() => {
    if (!containerRef.current) return;

    // Only animate if coming from a transition (not initial page load)
    const isTransition = sessionStorage.getItem(TRANSITION_KEY) === "true";
    const direction =
      (sessionStorage.getItem(
        TRANSITION_DIRECTION_KEY,
      ) as TransitionDirection) || "inward";

    if (!isTransition) {
      // No transition, just make visible immediately
      containerRef.current.style.visibility = "visible";
      return;
    }

    // Clear the flags
    sessionStorage.removeItem(TRANSITION_KEY);
    sessionStorage.removeItem(TRANSITION_DIRECTION_KEY);

    // Play the appropriate enter animation
    if (direction === "inward") {
      enterInwardAnimation(containerRef.current);
    } else {
      enterOutwardAnimation(containerRef.current);
    }
  }, []);

  return (
    <>
      <Header showBackButton={showBackButton} />
      <div
        ref={containerRef}
        data-page-transition
        className="min-h-screen"
        style={{ visibility: "hidden" }}
      >
        {children}
      </div>
    </>
  );
};

export default Template;
