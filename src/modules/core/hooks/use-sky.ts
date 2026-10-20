"use client";

import { gsap } from "gsap";
import { type RefObject, useEffect, useRef, useState } from "react";
import { siteData } from "~/data/site";
import {
  claimSky,
  hasSky,
  isSkyReady,
  registerSkyHost,
  type SkyHost,
  unregisterSkyHost,
} from "~/modules/core/utils/shared-sky";
import { skyGradient } from "~/modules/core/utils/sky-gradient";
import {
  type Bolt,
  type GlassShape,
  SKY_DEFAULTS,
  type SkyFrame,
} from "~/modules/core/utils/sky-shader";
import { sunAt } from "~/modules/core/utils/sun";
import {
  conditionOf,
  fetchWeather,
  LOOK_KEYS,
  type SkyCondition,
  type SkyWeather,
  skyWeather,
  WEATHER_MS,
  type WeatherReport,
} from "~/modules/core/utils/weather";

const SKY = "shader" as "shader" | "gradient";

const { home } = siteData.owner;

const SPAN = 50;

const REACH = 120;
const EDGE = 0.42;

const PIXEL_BUDGET = 3_000_000;

const WEATHER_RETRY_MS = 30_000;

const WEATHER_EASE = 20;
const PLAYED_EASE = 0.4;

const TIMELAPSE = 0.01;

const PLAY_SECONDS = 7;

const DAY = 86_400_000;

const CLOUD_FPS = 20;

// Never fast enough to strobe
const FLASH = 0.4;
const STRIKE_GAP_MS = [4000, 12000];
const BOLT_SHARE = 0.45;
const FLASH_MS = 1000;

const SLOW_FRAME_MS = 40;
const SLOW_FOR_MS = 2000;

const FIRST_DRAW_MS = 1200;

const NIGHT_FROM = -5;

const savesData = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData === true;

// Kept for the visit, so a slow device does not retry on every page
let holdsStill: boolean | undefined;

interface Options {
  skyRef: RefObject<HTMLElement | null>;
  clockRef: RefObject<HTMLElement | null>;
  animationsEnabled: boolean;
  isThreeD: boolean;
  onHour?: () => void;
}

/**
 * The sky behind the footer, driven by the sun (utils/sun.ts) and weather
 * (utils/weather.ts). Holds still, drawn once a minute, when frames drop, animations
 * are off or data saving is on. `refresh` redraws the glass under data-glass
 * elements, since the shader cannot see them move.
 */
export const useSky = ({
  skyRef,
  clockRef,
  animationsEnabled,
  isThreeD,
  onHour,
}: Options) => {
  const [isPlaying, setPlaying] = useState(false);
  const [hasGlass, setGlass] = useState(false);
  const [condition, setCondition] = useState<SkyCondition>("clear");
  const [isNight, setNight] = useState(false);
  const playRef = useRef<(() => void) | null>(null);
  const refreshRef = useRef<((isShown?: boolean) => void) | null>(null);
  const weatherRef = useRef<SkyWeather>(
    skyWeather(null, SKY_DEFAULTS.clouds),
  );
  const stillRef = useRef(false);
  const onHourRef = useRef(onHour);
  onHourRef.current = onHour;
  const animateRef = useRef(animationsEnabled);

  useEffect(() => {
    const sky = skyRef.current;
    const footer = sky?.parentElement;
    if (!sky || !footer) return;

    holdsStill ??= savesData();
    stillRef.current = holdsStill;

    const time = { offset: 0 };
    let playing = false;
    let lastHour = -1;
    const clockFormat = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: home.timeZone,
    });

    // Shared with every footer, so ready once compiled once
    const useShader = SKY === "shader" && isThreeD;
    const isReady = () => useShader && isSkyReady();
    let pixelRatio = 1;
    let canvasWidth = 1;
    let canvasHeight = 1;
    let lastFrame: SkyFrame | null = null;
    let isShown = false;
    let isDirty = true;
    let isSettledIn = false;

    const isMoving = () =>
      isShown && animateRef.current && !stillRef.current;

    const showClock = (now: Date) => {
      const clock = clockRef.current;
      if (clock) clock.textContent = clockFormat.format(now);
    };

    const showNight = (sunElevation: number) => {
      setNight(sunElevation < NIGHT_FROM);
    };

    let lastCondition: SkyCondition | null = null;
    const showCondition = (goal: SkyWeather) => {
      const next = conditionOf(goal);
      if (next === lastCondition) return;
      lastCondition = next;
      setCondition(next);
    };

    let radii = new WeakMap<HTMLElement, number>();
    const radiusOf = (element: HTMLElement) => {
      let radius = radii.get(element);
      if (radius === undefined) {
        radius =
          Number.parseFloat(getComputedStyle(element).borderTopLeftRadius) || 0;
        radii.set(element, radius);
      }
      return radius;
    };

    const measureGlass = () => {
      const bounds = sky.getBoundingClientRect();
      const shapes: GlassShape[] = [];
      for (const element of footer.querySelectorAll<HTMLElement>(
        "[data-glass]",
      )) {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        const halfWidth = (rect.width / 2) * pixelRatio;
        const halfHeight = (rect.height / 2) * pixelRatio;
        const radius = radiusOf(element) * pixelRatio;
        shapes.push({
          centerX: (rect.left + rect.width / 2 - bounds.left) * pixelRatio,
          centerY: (bounds.bottom - rect.top - rect.height / 2) * pixelRatio,
          halfWidth,
          halfHeight,
          radius: Math.min(radius, halfWidth, halfHeight),
        });
      }
      return shapes;
    };

    let report: WeatherReport | null = null;
    let lastSettle = performance.now();

    const goalWeather = () => skyWeather(report, SKY_DEFAULTS.clouds);

    const settle = () => {
      const now = performance.now();
      const seconds = (now - lastSettle) / 1000;
      lastSettle = now;
      const goal = goalWeather();
      showCondition(goal);
      const current = weatherRef.current;
      const share =
        1 - Math.exp(-seconds / (playing ? PLAYED_EASE : WEATHER_EASE));
      const ease = (from: number, to: number) => from + (to - from) * share;

      const look = { ...current.look };
      for (const key of LOOK_KEYS) {
        look[key] = ease(current.look[key], goal.look[key]);
      }
      weatherRef.current = {
        state: goal.state,
        look,
        falling: goal.falling || (look.fall > 0.01 ? current.falling : 0),
        thunder: goal.thunder,
        windX: ease(current.windX, goal.windX),
        windY: ease(current.windY, goal.windY),
      };
    };

    let weatherTimer: ReturnType<typeof setTimeout> | undefined;
    let retryIn = WEATHER_RETRY_MS;
    let isWeatherDue = false;
    let isStopped = false;

    const updateWeather = async () => {
      if (document.hidden) {
        isWeatherDue = true;
        return;
      }
      const next = await fetchWeather();
      if (isStopped) return;
      if (next) {
        const isFirst = report === null;
        report = next;
        retryIn = WEATHER_RETRY_MS;
        if (isFirst) weatherRef.current = goalWeather();
        showCondition(goalWeather());
        isDirty = true;
        if (isShown) redraw(true);
      }
      const wait = next ? WEATHER_MS : retryIn;
      if (!next) retryIn = Math.min(retryIn * 2, WEATHER_MS);
      weatherTimer = setTimeout(updateWeather, wait);
    };

    const drift: [number, number] = [0, 0];
    let moving = 0;
    let lastAdvance = performance.now();
    let lastOffset = 0;

    const advance = () => {
      const now = performance.now();
      const seconds = isMoving() || playing ? (now - lastAdvance) / 1000 : 0;
      const windSeconds = seconds + ((time.offset - lastOffset) / 1000) * TIMELAPSE;
      lastAdvance = now;
      lastOffset = time.offset;
      drift[0] += weatherRef.current.windX * windSeconds;
      drift[1] += weatherRef.current.windY * windSeconds;
      moving += seconds;
    };

    let strikeAt = Number.NEGATIVE_INFINITY;
    let isDouble = false;
    let nextStrike = 0;
    let bolt: Bolt | null = null;

    const strike = (now: number) => {
      const [shortest, longest] = STRIKE_GAP_MS;
      strikeAt = now;
      isDouble = Math.random() < 0.5;
      bolt = {
        x: 0.1 + Math.random() * 0.8,
        top: 0.3 + Math.random() * 0.4,
        seed: Math.floor(Math.random() * 1000),
        isVisible: Math.random() < BOLT_SHARE,
      };
      nextStrike = now + shortest + Math.random() * (longest - shortest);
    };

    const isFlashing = () => performance.now() - strikeAt < FLASH_MS;

    const flash = () => {
      const now = performance.now();
      if (weatherRef.current.thunder && isMoving()) {
        if (!nextStrike) nextStrike = now + STRIKE_GAP_MS[0] / 2;
        if (now >= nextStrike) strike(now);
      }
      if (!isFlashing()) return 0;
      const pulse = (since: number) => (since < 0 ? 0 : Math.exp(-since / 90));
      const since = now - strikeAt;
      return (
        Math.min(1, pulse(since) + (isDouble ? 0.6 * pulse(since - 220) : 0)) *
        FLASH
      );
    };

    const render = (frame: SkyFrame, clouds: boolean) => {
      const { renderer, isCleared } = claimSky(host, canvasWidth, canvasHeight);
      if (!renderer) return false;
      return renderer.draw(frame, measureGlass(), SKY_DEFAULTS, {
        clouds: clouds || isCleared,
      });
    };

    const draw = () => {
      const now = new Date(Date.now() + time.offset);
      const sun = sunAt(now, home);
      const sunX =
        0.5 + EDGE * Math.min(Math.max((sun.azimuth - 180) / REACH, -1), 1);

      settle();
      if (isReady()) {
        advance();
        lastFrame = {
          sunElevation: sun.elevation,
          sunX,
          span: SPAN,
          starTurn: ((now.getTime() / 3_600_000) * 15.041) % 360,
          weather: weatherRef.current,
          drift: [drift[0], drift[1]],
          time: moving,
          flash: flash(),
          bolt,
          pixelRatio,
        };
        isDirty = !render(lastFrame, true);
        if (!isDirty) sky.style.background = "";
      } else {
        isDirty = false;
        sky.style.background = skyGradient(
          sun.elevation,
          sunX,
          SPAN,
          weatherRef.current.look.coverage,
        );
      }
      showClock(now);
      showNight(sun.elevation);

      const hour = Math.floor(now.getTime() / 3_600_000);
      if (playing && hour !== lastHour) onHourRef.current?.();
      lastHour = hour;
    };

    // Cheap: the costly scattering only redraws when the sun moves
    const redraw = (clouds: boolean) => {
      if (!lastFrame) return;
      const now = Date.now() + time.offset;
      settle();
      advance();
      showClock(new Date(now));
      lastFrame = {
        ...lastFrame,
        weather: weatherRef.current,
        drift: [drift[0], drift[1]],
        time: moving,
        flash: flash(),
        bolt,
      };
      render(lastFrame, clouds);
    };

    let frameRequest = 0;
    let lastClouds = 0;
    let lastTick = 0;
    let slowFor = 0;

    // Too slow for this device: hold still for the rest of the visit
    const holdStill = () => {
      holdsStill = true;
      stillRef.current = true;
      updateLoop();
    };

    const loop = (now: number) => {
      const delta = now - lastTick;
      lastTick = now;
      if (delta < 250) {
        slowFor =
          delta > SLOW_FRAME_MS ? slowFor + delta : Math.max(0, slowFor - delta);
        if (slowFor > SLOW_FOR_MS) {
          slowFor = 0;
          holdStill();
          return;
        }
      }
      if (!playing) {
        const { falling } = weatherRef.current;
        const cloudsDue = now - lastClouds >= 1000 / CLOUD_FPS;
        if (cloudsDue) lastClouds = now;
        if (cloudsDue || falling > 0 || isFlashing() || weatherRef.current.thunder) {
          redraw(cloudsDue);
        }
      }
      frameRequest = requestAnimationFrame(loop);
    };

    const updateLoop = () => {
      const shouldRun = isMoving() && isReady();
      if (shouldRun && !frameRequest) {
        lastTick = performance.now();
        frameRequest = requestAnimationFrame(loop);
      } else if (!shouldRun && frameRequest) {
        cancelAnimationFrame(frameRequest);
        frameRequest = 0;
        // Holding still from here, without a flash caught halfway
        if (isShown) redraw(true);
      }
    };

    refreshRef.current = (shown) => {
      if (shown !== undefined && shown !== isShown) {
        isShown = shown;
        if (shown && isDirty) draw();
      }
      updateLoop();
      if (isShown) redraw(false);
    };

    // Shader unavailable: the gradient takes over
    const fallBack = () => {
      setGlass(false);
      updateLoop();
      draw();
    };

    const host: SkyHost = {
      element: sky,
      onReady: () => {
        setGlass(true);
        isDirty = true;
        updateLoop();
        if (isShown || isSettledIn) draw();
      },
      onInvalidate: () => {
        isDirty = true;
        if (isShown) draw();
      },
      onLost: fallBack,
    };
    if (useShader) registerSkyHost(host);
    setGlass(isReady());

    showClock(new Date());
    showNight(sunAt(new Date(), home).elevation);
    showCondition(goalWeather());

    const resize = () => {
      const width = sky.clientWidth;
      const height = sky.clientHeight;
      pixelRatio = Math.min(
        window.devicePixelRatio || 1,
        Math.sqrt(PIXEL_BUDGET / Math.max(1, width * height)),
      );
      canvasWidth = Math.max(1, Math.round(width * pixelRatio));
      canvasHeight = Math.max(1, Math.round(height * pixelRatio));
      radii = new WeakMap();
      if (isShown) redraw(false);
      else isDirty = true;
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(sky);
    for (const element of footer.querySelectorAll("[data-glass]")) {
      resizeObserver.observe(element);
    }
    resize();

    const firstDrawTimer = setTimeout(() => {
      isSettledIn = true;
      if (isDirty && !isShown) draw();
    }, FIRST_DRAW_MS);

    let minuteTimer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      if (!playing) {
        isDirty = true;
        if (isShown) draw();
      }
      minuteTimer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);
    };
    minuteTimer = setTimeout(tick, 60_000 - (Date.now() % 60_000) + 50);

    const handleVisibility = () => {
      if (document.hidden || !isWeatherDue) return;
      isWeatherDue = false;
      updateWeather();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    if (useShader && hasSky()) updateWeather();

    playRef.current = () => {
      if (playing) return;
      playing = true;
      setPlaying(true);
      lastOffset = -DAY;
      gsap.fromTo(
        time,
        { offset: -DAY },
        {
          offset: 0,
          duration: PLAY_SECONDS,
          ease: "sine.inOut",
          onUpdate: draw,
          onComplete: () => {
            playing = false;
            setPlaying(false);
            draw();
          },
        },
      );
    };

    return () => {
      clearTimeout(firstDrawTimer);
      clearTimeout(minuteTimer);
      clearTimeout(weatherTimer);
      isStopped = true;
      document.removeEventListener("visibilitychange", handleVisibility);
      cancelAnimationFrame(frameRequest);
      gsap.killTweensOf(time);
      resizeObserver.disconnect();
      if (useShader) unregisterSkyHost(host);
      sky.style.background = "";
      playRef.current = null;
      refreshRef.current = null;
    };
  }, [skyRef, clockRef, isThreeD]);

  useEffect(() => {
    animateRef.current = animationsEnabled;
    refreshRef.current?.();
  }, [animationsEnabled]);

  return {
    play: () => playRef.current?.(),
    refresh: (isShown?: boolean) => refreshRef.current?.(isShown),
    isPlaying,
    hasGlass,
    condition,
    isNight,
  };
};
