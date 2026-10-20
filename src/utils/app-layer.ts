import { gsap } from "gsap";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReactNode } from "react";
import { pathOf } from "~/data/pages";
import type { Events } from "~/utils/eyes";


export type Phase = "closed" | "opening" | "open" | "closing";

interface State {
  phase: Phase;
  // The section in the layer. It stays here while the layer closes, after its
  // route is already gone
  screen: ReactNode;
}

export interface Elements {
  stage: HTMLElement;
  layer: HTMLElement;
  screen: HTMLElement;
  scroller: HTMLElement;
  snapshot: HTMLElement;
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

export const connect = (next: Elements) => {
  elements = next;
  return () => {
    elements = null;
  };
};

const progress = { value: 0 };
let tween: gsap.core.Tween | null = null;
let origin: Outline | null = null;
let originTile: HTMLElement | null = null;
let href = "";
let iconSize: { width: number; height: number } | null = null;
let iconOpacity = 0;
let isOverHome = true;

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

const straighten = (tile: HTMLElement) => {
  gsap.killTweensOf(tile, "rotation");
  gsap.set(tile, { rotation: 0 });
};

const reveal = (tile: HTMLElement) => {
  const { top, bottom } = tile.getBoundingClientRect();
  if (bottom < 0 || top > window.innerHeight)
    tile.scrollIntoView({ block: "center", behavior: "instant" });
};

const findTile = () => {
  if (originTile?.isConnected) return originTile;

  const link = document.querySelector<HTMLElement>(
    `[data-app-stage] a[href="${href}"]`,
  );
  if (!link) return null;
  return link.querySelector<HTMLElement>("[data-tile]") ?? link;
};

const cover = (card: Outline, width: number, height: number) => {
  const scale = Math.max(card.width / width, card.height / height);
  const x = card.x + (card.width - width * scale) / 2;
  const y = card.y + (card.height - height * scale) / 2;
  return { scale, transform: `translate(${x}px, ${y}px) scale(${scale})` };
};

const clamp = (value: number) => Math.min(1, Math.max(0, value));

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
    translate: "none",
    rotate: "none",
    scale: "none",
    willChange: "transform",
  });
  icon.appendChild(copy);
};

// Tells the browser the section is about to be scaled, so it keeps the
// layer it drew rather than drawing it again at every size on the way.
const prepareScreen = (isMoving: boolean) => {
  if (elements) elements.screen.style.willChange = isMoving ? "transform" : "";
};

const show = () => {
  if (!elements) return;
  elements.layer.style.visibility = "visible";
  elements.layer.style.pointerEvents = "none";
  document.documentElement.setAttribute("data-app-open", "");
};

const settle = () => {
  if (!elements) return;
  const { stage, layer, screen } = elements;

  tween = null;
  setIcon(null);
  layer.style.clipPath = "";
  layer.style.pointerEvents = "";
  // A leftover transform would keep fixed elements in the section off the screen
  screen.style.transform = "";
  prepareScreen(false);
  // Home isn't drawn while the section covers it. Chrome on macOS can drop
  // a frame of the layer while it repaints, and home flashed through
  stage.style.visibility = "hidden";
  progress.value = 1;
  setState({ phase: "open" });
};

const unhideStage = () => {
  if (elements) elements.stage.style.visibility = "";
};

const hide = () => {
  if (!elements) return;
  const { layer, screen, scroller, snapshot } = elements;

  tween?.kill();
  tween = null;
  gsap.killTweensOf(scroller);
  setIcon(null);
  unhideStage();
  snapshot.replaceChildren();
  layer.style.visibility = "";
  layer.style.clipPath = "";
  layer.style.pointerEvents = "";
  screen.style.transform = "";
  prepareScreen(false);
  scroller.style.opacity = "";
  scroller.scrollTop = 0;
  document.documentElement.removeAttribute("data-app-open");
  origin = null;
  originTile = null;
  progress.value = 0;
  setState({ phase: "closed", screen: null });
};

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
  prepareScreen(true);
  progress.value = 0;
  render();
  setState({ phase: "opening" });
  animate(1);
};

const skipIntro = () => {
  try {
    sessionStorage.setItem("has-seen-intro", "true");
  } catch {}
};

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

type OpenedFrom = Exclude<Events["Section Opened"]["from"], "direct">;

let opening: { to: string; from: OpenedFrom; isSwap: boolean } | null = null;

export const takeOpened = (pathname: string) => {
  const opened = opening?.to === pathname ? opening : null;
  opening = null;
  return opened;
};

export const openApp = (
  to: string,
  router: AppRouterInstance,
  from: OpenedFrom,
  link?: HTMLElement,
) => {
  if (state.phase !== "closed") return;

  opening = { to: pathOf(to), from, isSwap: false };
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
  router.push(to, { scroll: false });
};

export const visitApp = (
  to: string,
  router: AppRouterInstance,
  from: OpenedFrom,
) => {
  if (state.phase === "closed") {
    openApp(to, router, from);
    return;
  }

  if (state.phase !== "open") return;
  if (location.pathname === pathOf(to)) {
    if (to !== pathOf(to) && `${location.pathname}${location.hash}` !== to) {
      const oldURL = location.href;
      history.replaceState(history.state, "", to);
      window.dispatchEvent(
        new HashChangeEvent("hashchange", { oldURL, newURL: location.href }),
      );
    }
    return;
  }
  opening = { to: pathOf(to), from, isSwap: true };
  router.replace(to, { scroll: false });
};

export const closeApp = (router: AppRouterInstance) => {
  if (state.phase === "closing") return;

  if (state.phase !== "closed") {
    if (isOverHome) {
      router.back();
      return;
    }

    skipIntro();
    router.push("/");
    return;
  }

  if (elements && shouldAnimate()) hold();
  router.push("/");
};

let isLeaving = false;

export const showScreen = (screen: ReactNode) => {
  const { phase } = state;
  const isNew = state.screen === null;
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

export const leaveScreen = () => {
  isLeaving = true;
  queueMicrotask(() => {
    if (!isLeaving) return;
    isLeaving = false;
    closeLayer();
  });
};

export const closeLayer = () => {
  if (!elements) return;
  if (state.phase === "closed" || state.phase === "closing") return;

  if (!shouldAnimate()) {
    hide();
    return;
  }

  unhideStage();
  const tile = findTile();
  if (tile) {
    reveal(tile);
    straighten(tile);
  }
  origin = tile ? measure(tile) : (origin ?? getFallback());
  setIcon(tile);
  prepareScreen(true);
  elements.layer.style.pointerEvents = "none";
  render();
  setState({ phase: "closing" });
  animate(0);
};
