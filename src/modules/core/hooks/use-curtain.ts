"use client";

import { gsap } from "gsap";
import { type RefObject, useEffect, useRef } from "react";
import { OPEN_FOOTER_EVENT, scrollerOf } from "~/utils/footer";

export const CURTAIN_ROOM = 96;

const RADIUS = 40;

// Rubber-band stiffness, like iOS overscroll; lower is stiffer
const BAND = 0.6;

const POP_AT = 0.2;

const GESTURE_GAP = 150;

const RELEASE_DELAY = 180;

const RISE = 48;

type State = "closed" | "pulling" | "open";

interface Controls {
  open: () => void;
  close: () => void;
  isOpen: () => boolean;
}

interface Options {
  pageRef: RefObject<HTMLElement | null>;
  footerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  animationsEnabled: boolean;
  onPop?: () => void;
  onOpen?: () => void;
  onDraw?: (isShown: boolean) => void;
}

const canScrollDown = (from: EventTarget | null, page: HTMLElement) => {
  for (
    let element = from instanceof Element ? from : null;
    element && element !== page;
    element = element.parentElement
  ) {
    const { overflowY } = getComputedStyle(element);
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      element.scrollTop + element.clientHeight < element.scrollHeight - 1
    ) {
      return true;
    }
  }
  return false;
};

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));

/**
 * The page as a curtain over the footer, with rubber-band resistance and a pop
 * past POP_AT. A scroll that started higher up, or momentum after a pop, never pulls.
 * data-gestures elements use openFooter; their wheel handlers defer while the
 * footer is open, see isFooterClosed.
 */
export const useCurtain = ({
  pageRef,
  footerRef,
  contentRef,
  animationsEnabled,
  onPop,
  onOpen,
  onDraw,
}: Options) => {
  const controls = useRef<Controls | null>(null);
  const animateRef = useRef(animationsEnabled);
  animateRef.current = animationsEnabled;
  const onPopRef = useRef(onPop);
  onPopRef.current = onPop;
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const onDrawRef = useRef(onDraw);
  onDrawRef.current = onDraw;

  useEffect(() => {
    const page = pageRef.current;
    const footer = footerRef.current;
    const content = contentRef.current;
    if (!page || !footer || !content) return;

    const scroller = scrollerOf(page);
    const target: HTMLElement | Window = scroller ?? window;

    // Kept current by the resize observer so drawing never measures
    let openLift = Math.max(0, footer.offsetHeight - CURTAIN_ROOM);
    const openOffset = () => openLift;

    const isAtEnd = () =>
      scroller
        ? scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 1
        : window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 1;

    const isOurs = (eventTarget: EventTarget | null) =>
      eventTarget instanceof Node &&
      (page.contains(eventTarget) || footer.contains(eventTarget));

    const position = { lift: 0 };
    let radius = -1;
    let isShown: boolean | null = null;

    const draw = () => {
      const { lift } = position;
      const open = openOffset();
      const shown = open ? Math.min(Math.max(lift / open, 0), 1) : 0;
      page.style.transform = lift ? `translate3d(0, ${-lift}px, 0)` : "";
      content.style.transform = `translate3d(0, ${(1 - shown) * RISE}px, 0)`;

      const next = Math.round(Math.min(Math.max(lift, 0) / 2, RADIUS));
      if (next !== radius) {
        radius = next;
        page.style.setProperty("--curtain-radius", `${next}px`);
      }

      // Not drawn while the page covers it: Chrome on macOS can drop a frame of
      // the page while it repaints, and the dark sky flashed through
      const nextShown = lift > 0.5;
      if (nextShown !== isShown) {
        isShown = nextShown;
        footer.style.opacity = nextShown ? "" : "0";
      }
      onDrawRef.current?.(nextShown);
    };

    const moveTo = (lift: number, vars: gsap.TweenVars) => {
      gsap.to(position, { lift, overwrite: true, onUpdate: draw, ...vars });
    };

    let state: State = "closed";
    let pull = 0;
    let isSpringing = false;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;

    const setState = (next: State) => {
      state = next;
      page.dataset.footer = next;
      document.documentElement.dataset.footer = next;
    };
    setState("closed");

    const stretch = (distance: number, limit: number) =>
      limit * (1 - 1 / ((distance * BAND) / limit + 1));
    const unstretch = (stretched: number, limit: number) => {
      const share = Math.min(Math.max(stretched / limit, 0), 0.99);
      return (limit / BAND) * (1 / (1 - share) - 1);
    };

    const isOpen = () => state === "open";

    const settle = (next: "closed" | "open", isPop = false) => {
      clearTimeout(releaseTimer);
      pull = 0;
      if (next === "open" && state !== "open") onOpenRef.current?.();
      setState(next);
      isSpringing = true;
      const lift = next === "open" ? openOffset() : 0;
      moveTo(lift, {
        ...(animateRef.current
          ? {
              duration: isPop ? 0.9 : 0.8,
              ease: isPop ? "elastic.out(1, 0.55)" : "elastic.out(1, 0.45)",
            }
          : { duration: 0.15, ease: "power2.out" }),
        onComplete: () => {
          isSpringing = false;
        },
      });
    };

    let isSpent = false;

    const pop = () => {
      isSpent = true;
      onPopRef.current?.();
      settle(isOpen() ? "closed" : "open", true);
    };

    const pullBy = (distance: number, smooth: boolean) => {
      const limit = openOffset();
      if (!limit) return;

      if (isSpringing) {
        isSpringing = false;
        const fromRest = isOpen() ? limit - position.lift : position.lift;
        pull = unstretch(fromRest, limit);
      }

      pull = Math.max(0, pull + distance);
      const stretched = stretch(pull, limit);
      if (stretched >= limit * POP_AT) {
        pop();
        return;
      }

      if (state === "closed" && pull > 0) setState("pulling");
      if (state === "pulling" && pull === 0) setState("closed");

      const lift = isOpen() ? limit - stretched : stretched;
      if (smooth) moveTo(lift, { duration: 0.12, ease: "power2.out" });
      else {
        gsap.killTweensOf(position);
        position.lift = lift;
        draw();
      }
    };

    const release = () => {
      if (isSpringing || pull === 0) return;
      settle(isOpen() ? "open" : "closed");
    };

    let lastWheelAt = 0;
    let startedAtEnd = false;

    const handleWheel = (event: WheelEvent) => {
      if (event.defaultPrevented || event.ctrlKey || !isOurs(event.target))
        return;

      const unit =
        event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? window.innerHeight
            : 1;
      const deltaY = event.deltaY * unit;
      if (Math.abs(deltaY) < Math.abs(event.deltaX * unit)) return;

      const now = performance.now();
      if (now - lastWheelAt > GESTURE_GAP) {
        isSpent = false;
        startedAtEnd = state !== "closed" || isAtEnd();
      }
      lastWheelAt = now;

      if (isSpent || state === "open") event.preventDefault();
      if (isSpent) return;

      if (state === "closed") {
        const canPull =
          deltaY > 0 &&
          startedAtEnd &&
          isAtEnd() &&
          !canScrollDown(event.target, page);
        if (!canPull) return;
      }

      event.preventDefault();
      pullBy(isOpen() ? -deltaY : deltaY, Math.abs(deltaY) >= 50);
      clearTimeout(releaseTimer);
      releaseTimer = setTimeout(release, RELEASE_DELAY);
    };

    let touch: { y: number; startedAtEnd: boolean } | null = null;

    const handleTouchStart = (event: TouchEvent) => {
      const owned =
        event.target instanceof Element &&
        event.target.closest("[data-gestures]");
      if (event.touches.length > 1 || !isOurs(event.target) || owned) {
        touch = null;
        return;
      }
      isSpent = false;
      touch = {
        y: event.touches[0].clientY,
        startedAtEnd: state !== "closed" || isAtEnd(),
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!touch) return;
      const y = event.touches[0].clientY;
      const deltaY = touch.y - y;
      touch.y = y;

      if (isSpent || state === "open") event.preventDefault();
      if (isSpent) return;

      if (state === "closed") {
        const canPull =
          deltaY > 0 &&
          touch.startedAtEnd &&
          isAtEnd() &&
          !canScrollDown(event.target, page);
        if (!canPull) return;
      }

      event.preventDefault();
      pullBy(isOpen() ? -deltaY : deltaY, false);
    };

    const handleTouchEnd = () => {
      if (!touch) return;
      touch = null;
      release();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, shiftKey, target: keyTarget } = event;
      if (page.closest("[inert]")) return;
      const onPage = keyTarget === document.body || isOurs(keyTarget);
      if (!onPage || isTyping(keyTarget) || event.defaultPrevented) return;

      const isDown =
        key === "PageDown" || key === "End" || (key === " " && !shiftKey);
      const isUp =
        key === "PageUp" ||
        key === "Home" ||
        key === "ArrowUp" ||
        (key === " " && shiftKey);

      if (state !== "open" && isDown && isAtEnd()) {
        event.preventDefault();
        settle("open");
      } else if (state === "open" && isUp) {
        event.preventDefault();
        settle("closed");
      }
    };

    const handleScroll = () => {
      if (state === "open" && !isAtEnd()) settle("closed");
    };

    const handleResize = () => {
      openLift = Math.max(0, footer.offsetHeight - CURTAIN_ROOM);
      if (state === "open" && !isSpringing) {
        position.lift = openOffset();
        draw();
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(footer);

    const handleOpenRequest = () => {
      if (state !== "open") pop();
    };

    controls.current = {
      open: () => {
        if (state !== "open") settle("open");
      },
      close: () => {
        if (state !== "closed") settle("closed");
      },
      isOpen,
    };

    const active = { passive: false };
    target.addEventListener("wheel", handleWheel as EventListener, active);
    target.addEventListener("touchstart", handleTouchStart as EventListener, {
      passive: true,
    });
    target.addEventListener("touchmove", handleTouchMove as EventListener, active);
    target.addEventListener("touchend", handleTouchEnd);
    target.addEventListener("touchcancel", handleTouchEnd);
    target.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    page.addEventListener(OPEN_FOOTER_EVENT, handleOpenRequest);
    draw();

    return () => {
      clearTimeout(releaseTimer);
      gsap.killTweensOf(position);
      resizeObserver.disconnect();
      target.removeEventListener("wheel", handleWheel as EventListener);
      target.removeEventListener(
        "touchstart",
        handleTouchStart as EventListener,
      );
      target.removeEventListener("touchmove", handleTouchMove as EventListener);
      target.removeEventListener("touchend", handleTouchEnd);
      target.removeEventListener("touchcancel", handleTouchEnd);
      target.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
      page.removeEventListener(OPEN_FOOTER_EVENT, handleOpenRequest);
      page.style.transform = "";
      page.style.removeProperty("--curtain-radius");
      footer.style.opacity = "";
      delete page.dataset.footer;
      delete document.documentElement.dataset.footer;
      controls.current = null;
    };
  }, [pageRef, footerRef, contentRef]);

  return controls;
};
