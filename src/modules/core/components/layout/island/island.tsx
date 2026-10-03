"use client";

import { Undo2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import {
  type FocusEvent as ReactFocusEvent,
  type PointerEvent as ReactPointerEvent,
  type PropsWithChildren,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import IslandButton from "~components/layout/island/island-button";
import IslandCounter from "~components/layout/island/island-counter";
import IslandDial from "~components/layout/island/island-dial";
import IslandTicker from "~components/layout/island/island-ticker";
import IslandTray from "~components/layout/island/island-tray";
import { getSections } from "~/data/sections";
import { siteData } from "~/data/site";
import { useContent } from "~/modules/content/components/content-provider";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useHapticSound } from "~/modules/core/hooks/use-haptic-sound";
import { closeApp, visitApp } from "~/utils/app-layer";
import cn from "~/utils/cn";
import {
  getServerState,
  getState,
  setSlot,
  subscribe,
} from "~/utils/island-controls";
import { openWidget } from "~/utils/open-widget";

type Unfold = "widgets" | "dial";

// What the island unfolds into when it's clicked. Both are built, to try
// them out in place: the home screen in miniature, or a tuning dial
const UNFOLD = "widgets" as Unfold;

// The island at rest, and unfolded, in pixels
const SIZES = {
  home: { width: 172, height: 36 },
  section: { width: 252, height: 36 },
  widgets: { width: 284, height: 244 },
  dial: { width: 480, height: 48 },
};

// The dial stays open for a moment, to show its cursor arrive
const DIAL_LINGER = 1100;

type Reveal = "always" | "hover";

// When a page's controls show under the label. Both are built, to try them
// out in place: always, or while the pointer is on the island. Without a
// pointer that can hover, they always show
const REVEAL = "always" as Reveal;
// The controls stay a moment after the pointer leaves, so a slip doesn't
// fold them away
const REVEAL_LINGER = 400;

interface LayerProps {
  isActive: boolean;
}

// One face of the island. Only the active one can be seen and used
const Layer = ({ isActive, children }: PropsWithChildren<LayerProps>) => {
  return (
    <div
      inert={!isActive}
      className={cn(
        "absolute inset-0 transition-opacity duration-200 motion-reduce:transition-none",
        isActive ? "opacity-100 delay-100" : "opacity-0",
      )}
    >
      {children}
    </div>
  );
};

/**
 * The header: a small island at the top that names where you are, and
 * unfolds into the navigation when clicked. It floats, so pages run up
 * underneath it.
 */
const Island = () => {
  const router = useRouter();
  const pathname = usePathname();
  const haptic = useHapticSound();
  const { animationsEnabled } = useAnimationPreference();
  const islandRef = useRef<HTMLElement>(null);
  const lingerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [controlsHeight, setControlsHeight] = useState(0);
  const [canHover, setCanHover] = useState(true);
  const [isPointing, setIsPointing] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const store = useSyncExternalStore(subscribe, getState, getServerState);

  const content = useContent();
  const section = getSections(content).find(({ href }) => href === pathname);
  const isHome = !section;
  // A section that's closing keeps its controls until it's gone, home has none
  const controls = isHome ? null : store.controls;
  const isRevealed =
    REVEAL === "always" || !canHover || isPointing || isFocused;
  const showControls = controls !== null && !isOpen && isRevealed;

  const fold = useCallback(() => {
    if (lingerRef.current) clearTimeout(lingerRef.current);
    setIsOpen(false);
  }, []);

  const unfold = () => {
    haptic.onClick();
    if (lingerRef.current) clearTimeout(lingerRef.current);
    setIsOpen(true);
  };

  const visit = (href: string) => {
    haptic.onClick();
    if (href !== pathname) {
      if (href === "/") closeApp(router);
      else visitApp(href, router);
    }

    if (UNFOLD === "dial") {
      if (lingerRef.current) clearTimeout(lingerRef.current);
      lingerRef.current = setTimeout(fold, DIAL_LINGER);
    } else fold();
  };

  const openFromTray = (id: string) => {
    haptic.onClick();
    // These live on the home screen. Without one under this page, go there
    if (!openWidget(id)) router.push("/");
    fold();
  };

  // Folds back on a click anywhere else, and on Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (islandRef.current?.contains(event.target as Node)) return;
      fold();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") fold();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, fold]);

  useEffect(() => {
    return () => {
      if (lingerRef.current) clearTimeout(lingerRef.current);
      if (revealRef.current) clearTimeout(revealRef.current);
    };
  }, []);

  // Hands the slot to pages, and grows the island to fit what they put there
  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    setSlot(slot);
    const observer = new ResizeObserver(() =>
      setControlsHeight(slot.offsetHeight),
    );
    observer.observe(slot);

    return () => {
      observer.disconnect();
      setSlot(null);
    };
  }, []);

  useEffect(() => {
    const query = window.matchMedia("(hover: hover)");
    const update = () => setCanHover(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const handlePointerEnter = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    if (revealRef.current) clearTimeout(revealRef.current);
    setIsPointing(true);
  };

  const handlePointerLeave = (event: ReactPointerEvent) => {
    if (event.pointerType !== "mouse") return;
    revealRef.current = setTimeout(() => setIsPointing(false), REVEAL_LINGER);
  };

  const handleBlur = (event: ReactFocusEvent) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false);
  };

  const rest = isHome ? SIZES.home : SIZES.section;
  const size = isOpen
    ? SIZES[UNFOLD]
    : {
        width: rest.width,
        height: rest.height + (showControls ? controlsHeight : 0),
      };
  const label = section?.label ?? siteData.owner.name;
  const count = controls?.count ?? section?.count;

  return (
    <nav
      ref={islandRef}
      aria-label="Site"
      className={cn(
        // Over the open section (z-5), under modals (z-50)
        "fixed top-3 left-1/2 z-10 -translate-x-1/2 overflow-hidden rounded-[22px] bg-neutral-950 text-neutral-50 shadow-[0_8px_22px_rgb(15_15_15/0.22)]",
        animationsEnabled &&
          "transition-[width,height] duration-[550ms] ease-[cubic-bezier(0.34,1.4,0.64,1)] motion-reduce:transition-none",
      )}
      style={{
        width: `min(${size.width}px, calc(100vw - 1.5rem))`,
        height: size.height,
      }}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={() => setIsFocused(true)}
      onBlur={handleBlur}
    >
      {/* At rest: who this is, or where you are */}
      <Layer isActive={!isOpen}>
        <div className="flex h-9 items-center gap-1.5 px-1.5">
          {!isHome && (
            <IslandButton label="Go back" onClick={() => visit("/")}>
              <Undo2 className="size-3" />
            </IslandButton>
          )}
          <button
            type="button"
            aria-label="Open navigation"
            aria-expanded={isOpen}
            onClick={unfold}
            onMouseEnter={haptic.onMouseEnter}
            className={cn(
              "flex h-full min-w-0 flex-1 cursor-pointer items-center gap-2 whitespace-nowrap px-1.5 text-[13px]",
              isHome ? "justify-center" : "justify-between",
            )}
          >
            {isHome && (
              <span className="size-1.5 shrink-0 rounded-full bg-primary" />
            )}
            {controls?.labels ? (
              <IslandTicker
                label={label}
                labels={controls.labels}
                pointed={controls.pointed ?? null}
              />
            ) : (
              <span className="truncate">{label}</span>
            )}
            {count !== undefined && <IslandCounter value={count} />}
          </button>
        </div>

        {/* The open page's controls, see IslandControls */}
        <div
          ref={slotRef}
          inert={!showControls}
          className={cn(
            "px-3 pb-2.5 transition-opacity duration-200 empty:hidden motion-reduce:transition-none",
            showControls ? "opacity-100 delay-100" : "opacity-0",
          )}
        />
      </Layer>

      <Layer isActive={isOpen}>
        {UNFOLD === "dial" ? (
          <IslandDial pathname={pathname} onVisit={visit} />
        ) : (
          <IslandTray
            pathname={pathname}
            isOpen={isOpen}
            onVisit={visit}
            onWidget={openFromTray}
            onClose={fold}
          />
        )}
      </Layer>
    </nav>
  );
};

export default Island;
