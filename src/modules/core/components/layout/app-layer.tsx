"use client";

import { usePathname } from "next/navigation";
import {
  type PropsWithChildren,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import { closeLayer, connect, getState, subscribe } from "~/utils/app-layer";

interface Props {
  // The parallel route that holds the section that's open, if any
  slot: ReactNode;
}

/**
 * The home screen, with a layer over it for the section that's open. Home
 * stays mounted underneath. The animation itself lives in ~/utils/app-layer.
 */
const AppLayer = ({ children, slot }: PropsWithChildren<Props>) => {
  const { phase, screen } = useSyncExternalStore(subscribe, getState, getState);
  const pathname = usePathname();
  const stageRef = useRef<HTMLDivElement>(null);
  const layerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const snapshotRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const elements = {
      stage: stageRef.current,
      layer: layerRef.current,
      screen: screenRef.current,
      scroller: scrollerRef.current,
      snapshot: snapshotRef.current,
      icon: iconRef.current,
    };
    const { stage, layer, scroller, snapshot, icon } = elements;
    if (!stage || !layer || !elements.screen || !scroller || !snapshot || !icon)
      return;

    return connect({
      stage,
      layer,
      screen: elements.screen,
      scroller,
      snapshot,
      icon,
    });
  }, []);

  // Back on the home screen, by the back button or the browser: the section
  // closes into its tile
  useEffect(() => {
    if (pathname === "/") closeLayer();
  }, [pathname]);

  return (
    <>
      {/* Out of reach while a section covers it */}
      <div
        ref={stageRef}
        data-app-stage
        inert={phase !== "closed"}
        className="min-h-screen"
      >
        {children}
      </div>

      {slot}

      {/* Under the island (z-10), which floats over whatever is open */}
      <div ref={layerRef} className="invisible fixed inset-0 z-5 bg-neutral-50">
        <div ref={screenRef} className="absolute inset-0 origin-top-left">
          <div
            ref={scrollerRef}
            data-section-scroll
            className="h-full overflow-y-auto overscroll-contain"
          >
            {screen}
          </div>
          <div
            ref={snapshotRef}
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden empty:hidden"
          />
        </div>
        <div
          ref={iconRef}
          aria-hidden
          className="pointer-events-none absolute inset-0"
        />
      </div>
    </>
  );
};

export default AppLayer;
