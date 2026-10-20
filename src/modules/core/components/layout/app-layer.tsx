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
import { ownPages, sectionAt } from "~/data/pages";
import {
  closeLayer,
  connect,
  getState,
  subscribe,
  takeOpened,
} from "~/utils/app-layer";
import { track, useEyes } from "~/utils/eyes";

interface Props {
  slot: ReactNode;
}

const AppLayer = ({ children, slot }: PropsWithChildren<Props>) => {
  const { phase, screen } = useSyncExternalStore(subscribe, getState, getState);
  const pathname = usePathname();
  const { page } = useEyes();
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

  useEffect(() => {
    if (pathname === "/") closeLayer();
  }, [pathname]);

  useEffect(() => {
    const opened = takeOpened(pathname);
    if (opened?.isSwap) page();

    const section = sectionAt(pathname);
    if (section) {
      track("Section Opened", { section, from: opened?.from ?? "direct" });
    } else if (
      pathname.startsWith(`${ownPages.blog.path}/`) &&
      opened?.from !== "blog"
    ) {
      track("Section Opened", {
        section: "blog",
        from: opened?.from ?? "direct",
      });
    }
  }, [pathname, page]);

  return (
    <>
      <div
        ref={stageRef}
        data-app-stage
        inert={phase !== "closed"}
        className="min-h-screen"
      >
        {children}
      </div>

      {slot}

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
