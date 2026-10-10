"use client";

import { gsap } from "gsap";
import { type RefObject, useEffect, useRef } from "react";
import { OPEN_FOOTER_EVENT, scrollerOf } from "~/utils/footer";

// Room the footer keeps above what the open page uncovers: the page's
// rounded corners show it, and so does a spring that overshoots
export const CURTAIN_ROOM = 96;

// The page's bottom corners round as it lifts, up to this
const RADIUS = 40;

// How stiff the pull is, like iOS overscroll: the further it's pulled, the
// less it gives. Lower is stiffer
const BAND = 0.6;

// How far the page has to be stretched, as a share of the way, before it
// pops open or closed. Let go before that and it springs back
const POP_AT = 0.2;

// A wheel gesture ends after this much quiet. Momentum keeps one going
const GESTURE_GAP = 150;

// After this much quiet a pull that didn't pop springs back
const RELEASE_DELAY = 180;

// How far the footer's content rises into place as it's uncovered
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
}

/** A scrollable element between the target and the page that can still scroll down. */
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
 * The page as a curtain over the footer. At the end of the page, scrolling
 * on stretches the page up off the footer like a rubber band, the further
 * the stiffer. Stretched past POP_AT it pops open with a spring, let go
 * before that and it springs back. Open, scrolling back works the same way
 * the other way round.
 *
 * One gesture does one thing: a scroll that started higher up the page, or
 * the momentum after a pop, never pulls.
 *
 * Elements that take touches for gestures of their own are marked with
 * data-gestures; they open the footer with openFooter instead. Their wheel
 * handlers leave the event alone while the footer isn't closed, see
 * isFooterClosed.
 */
export const useCurtain = ({
  pageRef,
  footerRef,
  contentRef,
  animationsEnabled,
  onPop,
}: Options) => {
  const controls = useRef<Controls | null>(null);
  // Read in the listeners, which shouldn't be rebound when these change
  const animateRef = useRef(animationsEnabled);
  animateRef.current = animationsEnabled;
  const onPopRef = useRef(onPop);
  onPopRef.current = onPop;

  useEffect(() => {
    const page = pageRef.current;
    const footer = footerRef.current;
    const content = contentRef.current;
    if (!page || !footer || !content) return;

    const scroller = scrollerOf(page);
    const target: HTMLElement | Window = scroller ?? window;

    // How far the page lifts to show all of the footer. Kept up to date by
    // the resize observer, so drawing never has to measure
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

    // ── Drawing ──────────────────────────────────────────────────────────────

    // Where the page is now, animated through gsap
    const position = { lift: 0 };
    let radius = -1;

    const draw = () => {
      const { lift } = position;
      const open = openOffset();
      const shown = open ? Math.min(Math.max(lift / open, 0), 1) : 0;
      page.style.transform = lift ? `translate3d(0, ${-lift}px, 0)` : "";
      content.style.transform = `translate3d(0, ${(1 - shown) * RISE}px, 0)`;

      // Square while it covers the footer, round once there's a gap to show.
      // Only set when it changes, since it repaints the page. The property
      // isn't inherited (global.css), so it doesn't restyle what's in it
      const next = Math.round(Math.min(Math.max(lift, 0) / 2, RADIUS));
      if (next !== radius) {
        radius = next;
        page.style.setProperty("--curtain-radius", `${next}px`);
      }
    };

    const moveTo = (lift: number, vars: gsap.TweenVars) => {
      gsap.to(position, { lift, overwrite: true, onUpdate: draw, ...vars });
    };

    // ── State ────────────────────────────────────────────────────────────────

    let state: State = "closed";
    // How far the current pull has gone, before the band takes its share
    let pull = 0;
    let isSpringing = false;
    let releaseTimer: ReturnType<typeof setTimeout> | undefined;

    const setState = (next: State) => {
      state = next;
      page.dataset.footer = next;
    };
    setState("closed");

    // The rubber band, and its inverse to pick up a pull mid spring
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

    // The rest of a gesture that popped is spent
    let isSpent = false;

    const pop = () => {
      isSpent = true;
      onPopRef.current?.();
      settle(isOpen() ? "closed" : "open", true);
    };

    /**
     * Pulls by a distance toward the other state, or back with a negative
     * one. Smooth for the wheel's steps, direct for a finger.
     */
    const pullBy = (distance: number, smooth: boolean) => {
      const limit = openOffset();
      if (!limit) return;

      // Caught mid spring: carry on from where the page is
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
      // Glides over a mouse wheel's steps. A trackpad sends many small ones,
      // which a glide would only trail behind
      if (smooth) moveTo(lift, { duration: 0.12, ease: "power2.out" });
      else {
        gsap.killTweensOf(position);
        position.lift = lift;
        draw();
      }
    };

    // A pull that didn't pop springs back to where it started
    const release = () => {
      if (isSpringing || pull === 0) return;
      settle(isOpen() ? "open" : "closed");
    };

    // ── Wheel ────────────────────────────────────────────────────────────────

    let lastWheelAt = 0;
    let startedAtEnd = false;

    const handleWheel = (event: WheelEvent) => {
      // Panned by the photo table, zoomed, or in a modal over the page
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

      // Open, the page stays put: scrolling only pulls it back down
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

    // ── Touch ────────────────────────────────────────────────────────────────

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
      // Up the screen is down the page
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

    // ── Keys, and everything else ────────────────────────────────────────────

    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, shiftKey, target: keyTarget } = event;
      // Home stays under a section that's open over it, out of reach
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

    // Scrolled some other way, like by its scrollbar or the layer resetting
    // to the top: the page can't stay lifted away from its end
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
      delete page.dataset.footer;
      controls.current = null;
    };
  }, [pageRef, footerRef, contentRef]);

  return controls;
};
