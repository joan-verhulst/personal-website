import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactNode } from "react";
import { gsap } from "gsap";

/**
 * Sections open like apps: as a layer over the home screen, which stays
 * mounted underneath. The layer is a single card. Its outline grows from the
 * tile to the full screen, while the section inside is laid out at full size
 * from the start and only scaled to cover the card, so the two can't drift.
 */

export type Phase = "closed" | "opening" | "open" | "closing";

interface State {
  phase: Phase;
  // The section in the layer. It stays here while the layer closes, after its
  // route is already gone
  screen: ReactNode;
}

export interface Elements {
  // Holds the home screen, or a section that was loaded directly
  stage: HTMLElement;
  // The card, clipped to its outline
  layer: HTMLElement;
  // The section at full size, scaled to cover the card
  screen: HTMLElement;
  // Scrolls the section, as the page behind is locked
  scroller: HTMLElement;
  // Stands in for a page that was loaded directly, see `hold`
  snapshot: HTMLElement;
  // A copy of the tile, which fades into the section like an app icon
  icon: HTMLElement;
}

interface Outline {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

const OPEN_DURATION = 0.6;
const CLOSE_DURATION = 0.5;
// The corners keep their radius for most of the way, then square off
const SQUARE_OFF_FROM = 0.85;
// The tile copy fades as it grows, and is gone at this many times the tile's
// size. Any later and it shows blown up over the section, which reads as a flash
const ICON_GONE_AT = 1.75;
// Without a tile to grow out of, the card fades instead
const CARD_FADE_TO = 0.5;
const CONTENT_FADE = 0.2;

// A critically damped spring, like the iOS launch: an easy start, a quick
// middle and a long settle. Closing uses the same curve, not its mirror image.
const STIFFNESS = 8;
const SETTLED = 1 - (1 + STIFFNESS) * Math.exp(-STIFFNESS);
const spring = (time: number) =>
  (1 - (1 + STIFFNESS * time) * Math.exp(-STIFFNESS * time)) / SETTLED;

const shouldAnimate = () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
    return false;
  try {
    return localStorage.getItem("animations-enabled") !== "false";
  } catch {
    return true;
  }
};

// ── State ───────────────────────────────────────────────────────────────────

let state: State = { phase: "closed", screen: null };
const listeners = new Set<() => void>();

const setState = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

export const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getState = () => state;

let elements: Elements | null = null;

/** Hands the layer's elements over. Returns the cleanup. */
export const connect = (next: Elements) => {
  elements = next;
  return () => {
    elements = null;
  };
};

// 0 is the tile, 1 the full screen
const progress = { value: 0 };
let tween: gsap.core.Tween | null = null;
// Where the card grows out of, and shrinks back into
let origin: Outline | null = null;
// The tile that was clicked, and the section it opened
let originTile: HTMLElement | null = null;
let href = "";
// Size of the tile copy before scaling, if there is one
let iconSize: { width: number; height: number } | null = null;
// How much of the tile copy is still showing
let iconOpacity = 0;
// Whether the home screen is under the layer, and so one step back in history
let isOverHome = true;

// ── Geometry ────────────────────────────────────────────────────────────────

// Used when there's no tile on screen to grow out of or shrink into
const getFallback = (): Outline => {
  const width = window.innerWidth * 0.3;
  const height = window.innerHeight * 0.3;
  return {
    x: (window.innerWidth - width) / 2,
    y: (window.innerHeight - height) / 2,
    width,
    height,
    radius: 32,
  };
};

const measure = (tile: HTMLElement): Outline => {
  const rect = tile.getBoundingClientRect();
  // Hovered tiles are scaled down, and their corners with them
  const scale = tile.offsetWidth ? rect.width / tile.offsetWidth : 1;
  const radius =
    Number.parseFloat(getComputedStyle(tile).borderTopLeftRadius) || 0;

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    radius: radius * scale,
  };
};

// Tiles wiggle on hover. Stop that, so the tile is measured straight
const straighten = (tile: HTMLElement) => {
  gsap.killTweensOf(tile, "rotation");
  gsap.set(tile, { rotation: 0 });
};

// Home may have been left scrolled away from the tile
const reveal = (tile: HTMLElement) => {
  const { top, bottom } = tile.getBoundingClientRect();
  if (bottom < 0 || top > window.innerHeight)
    tile.scrollIntoView({ block: "center", behavior: "instant" });
};

// The tile on the home screen that opens the current section
const findTile = () => {
  if (originTile?.isConnected) return originTile;

  const link = document.querySelector<HTMLElement>(
    `[data-app-stage] a[href="${href}"]`,
  );
  if (!link) return null;
  return link.querySelector<HTMLElement>("[data-tile]") ?? link;
};

/**
 * Scales a box of `width` by `height` to cover the card, centred. The scale is
 * the same both ways, so nothing is stretched: what doesn't fit is clipped.
 */
const cover = (card: Outline, width: number, height: number) => {
  const scale = Math.max(card.width / width, card.height / height);
  const x = card.x + (card.width - width * scale) / 2;
  const y = card.y + (card.height - height * scale) / 2;
  return { scale, transform: `translate(${x}px, ${y}px) scale(${scale})` };
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

// ── Card ────────────────────────────────────────────────────────────────────

// Draws the card at the current progress
const render = () => {
  if (!elements || !origin) return;
  const { layer, screen, icon } = elements;
  const width = layer.offsetWidth;
  const height = layer.offsetHeight;
  const mix = (from: number, to: number) =>
    from + (to - from) * progress.value;

  const card: Outline = {
    x: mix(origin.x, 0),
    y: mix(origin.y, 0),
    width: mix(origin.width, width),
    height: mix(origin.height, height),
    radius:
      origin.radius * clamp((1 - progress.value) / (1 - SQUARE_OFF_FROM)),
  };

  const right = width - card.x - card.width;
  const bottom = height - card.y - card.height;
  layer.style.clipPath = `inset(${card.y}px ${right}px ${bottom}px ${card.x}px round ${card.radius}px)`;
  screen.style.transform = cover(card, width, height).transform;

  const copy = icon.firstElementChild as HTMLElement | null;
  if (copy && iconSize) {
    const fit = cover(card, iconSize.width, iconSize.height);
    // How much larger the copy is than the tile it was made from
    const growth =
      fit.scale / cover(origin, iconSize.width, iconSize.height).scale;
    copy.style.transform = fit.transform;
    iconOpacity = 1 - clamp((growth - 1) / (ICON_GONE_AT - 1));
    icon.style.opacity = String(iconOpacity);
  } else {
    iconOpacity = 0;
    layer.style.opacity = String(clamp(progress.value / CARD_FADE_TO));
  }
};

// Puts a copy of the tile in the card, or takes it out again
const setIcon = (tile: HTMLElement | null) => {
  if (!elements) return;
  const { icon, layer } = elements;

  icon.replaceChildren();
  icon.style.opacity = "";
  layer.style.opacity = "";
  iconSize = null;
  iconOpacity = 0;
  if (!tile) return;

  const copy = tile.cloneNode(true) as HTMLElement;
  copy.removeAttribute("data-tile");
  copy.removeAttribute("href");
  iconSize = { width: tile.offsetWidth, height: tile.offsetHeight };
  Object.assign(copy.style, {
    position: "absolute",
    top: "0",
    left: "0",
    width: `${iconSize.width}px`,
    height: `${iconSize.height}px`,
    margin: "0",
    transformOrigin: "0 0",
    // Its own hover transform is replaced by the card's
    translate: "none",
    rotate: "none",
    scale: "none",
  });
  icon.appendChild(copy);
};

const show = () => {
  if (!elements) return;
  elements.layer.style.visibility = "visible";
  // Nothing in the card can be used until it's open
  elements.layer.style.pointerEvents = "none";
  // Home stays where it is, so the tile is still there on the way back. Locked
  // from global.css: the image popover writes the overflow style itself
  document.documentElement.setAttribute("data-app-open", "");
};

// The card is open: from here on it's a plain full screen layer
const settle = () => {
  if (!elements) return;
  const { layer, screen } = elements;

  tween = null;
  setIcon(null);
  layer.style.clipPath = "";
  layer.style.pointerEvents = "";
  // A leftover transform would keep fixed elements in the section off the screen
  screen.style.transform = "";
  progress.value = 1;
  setState({ phase: "open" });
};

// The card is closed: the section leaves, home is usable again
const hide = () => {
  if (!elements) return;
  const { layer, screen, scroller, snapshot } = elements;

  tween?.kill();
  tween = null;
  gsap.killTweensOf(scroller);
  setIcon(null);
  snapshot.replaceChildren();
  layer.style.visibility = "";
  layer.style.clipPath = "";
  layer.style.pointerEvents = "";
  screen.style.transform = "";
  scroller.style.opacity = "";
  scroller.scrollTop = 0;
  document.documentElement.removeAttribute("data-app-open");
  origin = null;
  originTile = null;
  progress.value = 0;
  setState({ phase: "closed", screen: null });
};

// Picks up from wherever the card is, so opening and closing can interrupt
// each other
const animate = (to: 0 | 1) => {
  tween?.kill();
  tween = gsap.to(progress, {
    value: to,
    duration: to ? OPEN_DURATION : CLOSE_DURATION,
    ease: spring,
    onUpdate: render,
    onComplete: to ? settle : hide,
  });
};

// Opens the card out of `tile`. The section itself can arrive later.
const start = (tile: HTMLElement | null) => {
  if (!elements) return;

  originTile = tile;
  show();
  if (!shouldAnimate()) {
    settle();
    return;
  }

  if (tile) straighten(tile);
  origin = tile ? measure(tile) : getFallback();
  setIcon(tile);
  progress.value = 0;
  render();
  setState({ phase: "opening" });
  animate(1);
};

// Home shouldn't play its intro under a closing card
const skipIntro = () => {
  try {
    sessionStorage.setItem("has-seen-intro", "true");
  } catch {}
};

/**
 * Keeps a copy of a directly loaded page in the layer. There's no home screen
 * under such a page yet, so the copy covers the wait and then closes into the
 * tile like any other section.
 */
const hold = () => {
  if (!elements) return;
  const { stage, snapshot } = elements;

  const copy = stage.cloneNode(true) as HTMLElement;
  copy.removeAttribute("data-app-stage");
  Object.assign(copy.style, {
    position: "absolute",
    top: `${-window.scrollY}px`,
    left: "0",
    width: "100%",
  });
  snapshot.appendChild(copy);
  skipIntro();

  href = location.pathname;
  progress.value = 1;
  show();
  setState({ phase: "open" });
};

// ── Actions ─────────────────────────────────────────────────────────────────

/**
 * Opens a section out of the link that was clicked, or out of its tile on the
 * home screen when there's no link. The card starts right away, the section
 * is shown in it once its route has loaded.
 */
export const openApp = (
  to: string,
  router: AppRouterInstance,
  link?: HTMLElement,
) => {
  if (state.phase !== "closed") return;

  isOverHome = location.pathname === "/";
  if (elements) {
    href = to;
    originTile = null;
    start(
      link
        ? (link.querySelector<HTMLElement>("[data-tile]") ?? link)
        : findTile(),
    );
  }
  // Scrolling home to the top would move the tile away
  router.push(to, { scroll: false });
};

/**
 * Goes to a section from anywhere. From the home screen it opens out of its
 * tile, with another section open it takes that one's place.
 */
export const visitApp = (to: string, router: AppRouterInstance) => {
  if (state.phase === "closed") {
    openApp(to, router);
    return;
  }

  if (state.phase !== "open" || location.pathname === to) return;
  // Replaced, not pushed: the open section stays one step away from home, so
  // going back still closes the layer
  router.replace(to, { scroll: false });
};

/** Goes back to the home screen. The layer closes once the route is there. */
export const closeApp = (router: AppRouterInstance) => {
  if (state.phase === "closing") return;

  if (state.phase !== "closed") {
    if (isOverHome) {
      router.back();
      return;
    }

    // Opened over a page that was loaded directly, so home isn't one step
    // back. It loads under the layer, which then closes into its tile
    skipIntro();
    router.push("/");
    return;
  }

  if (elements && shouldAnimate()) hold();
  router.push("/");
};

// Set when a section's route is gone, cleared when another takes its place
let isLeaving = false;

/** Shows a section in the layer. Called when its route is on screen. */
export const showScreen = (screen: ReactNode) => {
  const { phase } = state;
  const isNew = state.screen === null;
  // Takes the place of the section that was open
  const isSwap = !isNew && isLeaving;
  isLeaving = false;
  setState({ screen });
  if (!elements) return;

  if (phase === "closed") {
    // Reached through the browser's history, so without a click
    href = location.pathname;
    const tile = findTile();
    isOverHome = tile !== null;
    start(tile);
  } else if (phase === "closing") {
    setState({ phase: "opening" });
    animate(1);
  }

  if (isSwap) {
    // Closing goes into the tile of the section that's open now
    href = location.pathname;
    originTile = null;
    elements.scroller.scrollTop = 0;
  }

  // Under the tile copy the section just appears, and the copy fading out is
  // the crossfade. It only fades in itself when it arrives after that, or
  // when it takes another section's place
  if ((isNew || isSwap) && shouldAnimate() && iconOpacity < 0.5)
    gsap.fromTo(
      elements.scroller,
      { opacity: 0 },
      {
        opacity: 1,
        duration: CONTENT_FADE,
        ease: "power1.out",
        clearProps: "opacity",
      },
    );
};

/**
 * A section's route is gone. Unless another section takes its place right
 * away, in the same update, the layer closes.
 */
export const leaveScreen = () => {
  isLeaving = true;
  queueMicrotask(() => {
    if (!isLeaving) return;
    isLeaving = false;
    closeLayer();
  });
};

/**
 * Closes the layer into its tile. Called when the route is back at the home
 * screen, by the back button or by the browser.
 */
export const closeLayer = () => {
  if (!elements) return;
  if (state.phase === "closed" || state.phase === "closing") return;

  if (!shouldAnimate()) {
    hide();
    return;
  }

  const tile = findTile();
  if (tile) {
    reveal(tile);
    straighten(tile);
  }
  // Measured again: the window or the layout may have changed since opening
  origin = tile ? measure(tile) : (origin ?? getFallback());
  setIcon(tile);
  elements.layer.style.pointerEvents = "none";
  render();
  setState({ phase: "closing" });
  animate(0);
};
