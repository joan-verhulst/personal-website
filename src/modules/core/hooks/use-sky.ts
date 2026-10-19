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

// Which sky the footer draws: the shader, or the gradient it falls back to
// where there's no WebGL2. Both follow the sun the same way, only the shader
// has weather and glass
const SKY = "shader" as "shader" | "gradient";

const { home } = siteData.owner;

// Degrees of sky from the footer's bottom edge, the horizon, to its top
const SPAN = 50;

// Facing south, the sun's compass direction this far either side of south
// reaches this far from the middle toward either edge: east on the left
const REACH = 120;
const EDGE = 0.42;

// The canvas has at most this many pixels, on a large screen with a high
// pixel ratio. Below that it matches the screen
const PIXEL_BUDGET = 3_000_000;

// How soon the weather is asked for again after an answer that didn't come,
// doubling each time it doesn't until it's as long as the usual wait, see
// WEATHER_MS
const WEATHER_RETRY_MS = 30_000;

// How long the sky takes to settle into new weather, in seconds, and in a
// played day, which goes by too fast for that
const WEATHER_EASE = 20;
const PLAYED_EASE = 0.4;

// How much of a played day the clouds drift through. All of it would be a
// blur
const TIMELAPSE = 0.01;

// How long a played day takes
const PLAY_SECONDS = 7;

const DAY = 86_400_000;

// How often the clouds are drawn while they drift. They move slowly, while
// rain, snow and lightning are drawn every frame
const CLOUD_FPS = 20;

// Lightning: at most this bright, once every few seconds, sometimes with a
// second, fainter flash just after, and with the bolt itself showing for
// this share of strikes. Never fast enough to strobe
const FLASH = 0.4;
const STRIKE_GAP_MS = [4000, 12000];
const BOLT_SHARE = 0.45;
const FLASH_MS = 1000;

// The page drops frames when they come further apart than this, and after
// this long of that the weather stops moving
const SLOW_FRAME_MS = 40;
const SLOW_FOR_MS = 2000;

// The first sky is drawn this long after the footer mounts, so it's there
// when the page lifts off it, without competing with the page's own start
const FIRST_DRAW_MS = 1200;

// Below this, in degrees, the sun has set as far as the status is
// concerned, and the moon stands in for it
const NIGHT_FROM = -5;

// Asked to save data: the weather holds still
const savesData = () =>
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData === true;

// Kept for the visit, so a device that was too slow doesn't try again on
// the next page
let holdsStill: boolean | undefined;

interface Options {
  // Takes the gradient as its background, and the sky's canvas while this
  // footer draws, see shared-sky.ts. Elements marked data-glass next to it,
  // in the footer, are drawn as glass
  skyRef: RefObject<HTMLElement | null>;
  // Shows the sky's time, kept up to date without rendering
  clockRef: RefObject<HTMLElement | null>;
  // Without them, the weather holds still and there's no lightning
  animationsEnabled: boolean;
  // Each hour that passes while a day plays
  onHour?: () => void;
}

/**
 * The sky behind the footer, as it is now at home: the sun
 * rises, sets and stands where it does there, see utils/sun.ts, and the
 * clouds, rain and snow are one of five skies for the weather, see
 * utils/weather.ts, eased from one into the next. Redrawn every minute, and
 * while the footer shows as often as the weather moves. `play` runs it
 * through the last 24 hours, back to now. Only the time moves: the weather
 * stays today's, so the clouds keep their look while the light goes round.
 *
 * One renderer draws the sky for every footer, see shared-sky.ts: its
 * shaders compile once, in the background, and the gradient stands in until
 * they're ready. The canvas comes to the footer that draws, which is the
 * one on the page that's open.
 *
 * Nothing is drawn while the page covers the footer, and the weather only
 * moves while the footer shows. When the page drops frames, with animations
 * off or when the visitor saves data, it holds still and is drawn once a
 * minute.
 *
 * The shader also draws the footer's glass, under the elements marked
 * data-glass. It can't see them move, so `refresh` draws the glass again
 * where they are now, for the curtain to call as the footer's content
 * rises. The curtain also says whether the footer shows, which starts and
 * stops the weather.
 *
 * For the footer's status it also says what the sky would be called and
 * whether it's night, which change rarely, and writes the time into the
 * clock itself, which changes every frame while a day plays.
 */
export const useSky = ({
  skyRef,
  clockRef,
  animationsEnabled,
  onHour,
}: Options) => {
  const [isPlaying, setPlaying] = useState(false);
  const [hasGlass, setGlass] = useState(false);
  const [condition, setCondition] = useState<SkyCondition>("clear");
  const [isNight, setNight] = useState(false);
  const playRef = useRef<(() => void) | null>(null);
  const refreshRef = useRef<((isShown?: boolean) => void) | null>(null);
  // The sky as it's drawn now
  const weatherRef = useRef<SkyWeather>(
    skyWeather(null, SKY_DEFAULTS.clouds),
  );
  const stillRef = useRef(false);
  // Read in the drawing, which shouldn't be set up again when these change
  const onHourRef = useRef(onHour);
  onHourRef.current = onHour;
  const animateRef = useRef(animationsEnabled);

  useEffect(() => {
    const sky = skyRef.current;
    const footer = sky?.parentElement;
    if (!sky || !footer) return;

    holdsStill ??= savesData();
    stillRef.current = holdsStill;

    // How far behind the clock the sky is, while a day plays
    const time = { offset: 0 };
    let playing = false;
    let lastHour = -1;
    // Home's time, in the visitor's own way of writing it
    const clockFormat = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: home.timeZone,
    });

    // Only the shader has weather and glass. It's shared with every
    // footer, so it's ready as soon as it has compiled once
    const useShader = SKY === "shader";
    const isReady = () => useShader && isSkyReady();
    // The canvas, in pixels: what it's sized to when this footer draws
    let pixelRatio = 1;
    let canvasWidth = 1;
    let canvasHeight = 1;
    let lastFrame: SkyFrame | null = null;
    let isShown = false;
    // Whether the sky has changed since it was drawn. Nothing is drawn while
    // the page covers the footer: it's drawn when the footer shows
    let isDirty = true;
    // The first draw has had its turn, see FIRST_DRAW_MS
    let isSettledIn = false;

    const isMoving = () =>
      isShown && animateRef.current && !stillRef.current;

    // ── Status ───────────────────────────────────────────────────────────────

    const showClock = (now: Date) => {
      const clock = clockRef.current;
      if (clock) clock.textContent = clockFormat.format(now);
    };

    const showNight = (sunElevation: number) => {
      setNight(sunElevation < NIGHT_FROM);
    };

    // What the weather says the sky is, not what it has eased to yet
    let lastCondition: SkyCondition | null = null;
    const showCondition = (goal: SkyWeather) => {
      const next = conditionOf(goal);
      if (next === lastCondition) return;
      lastCondition = next;
      setCondition(next);
    };

    // The glass elements as the shader takes them: canvas pixels, from the
    // bottom left. Their corners are read from their styles once, and again
    // when they're laid out anew, see resize
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

    // ── Weather ──────────────────────────────────────────────────────────────

    // The latest report, null until it's in, and when the sky last moved
    // toward it
    let report: WeatherReport | null = null;
    let lastSettle = performance.now();

    // The sky to move toward: the weather's now, in a played day too
    const goalWeather = () => skyWeather(report, SKY_DEFAULTS.clouds);

    /**
     * Moves the sky toward the one for the weather: every number of its
     * look eases, so a deck thickens into rain rather than clouds swapping.
     * What falls switches as soon as something does, and stays until the
     * last of it has fallen.
     */
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

    // Only the shader has clouds to draw the weather with. Asked for again
    // and again, sooner when an answer didn't come. Not while the tab is
    // hidden: a tab left open would ask every five minutes for nobody, each
    // a request on Vercel. It asks once it shows again instead
    let weatherTimer: ReturnType<typeof setTimeout> | undefined;
    let retryIn = WEATHER_RETRY_MS;
    let isWeatherDue = false;
    // Gone: an answer still on its way doesn't ask again
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
        // The first report is the sky as it is, not one to settle into
        if (isFirst) weatherRef.current = goalWeather();
        showCondition(goalWeather());
        isDirty = true;
        if (isShown) redraw(true);
      }
      const wait = next ? WEATHER_MS : retryIn;
      if (!next) retryIn = Math.min(retryIn * 2, WEATHER_MS);
      weatherTimer = setTimeout(updateWeather, wait);
    };

    // How far the wind has carried the clouds, in kilometers, and how long
    // the weather has been moving, in seconds: on with the clock while it
    // moves, and the clouds through a played day
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

    // Lightning in a thunderstorm, while the weather moves: when the last
    // strike was and where, whether it flashes twice, and when the next one
    // comes
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

    // ── Drawing ──────────────────────────────────────────────────────────────

    // Draws a frame on the shared canvas, which comes to this footer for
    // it. Nothing is drawn while another footer, on a page over this one,
    // has the sky: it's drawn again when this one is back on top. True when
    // it drew
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
          // The stars turn with the sky, the way the sun goes
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
        // Until the shaders are ready, and for good where there are none
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

    // The same sky, with the weather where it's moved to and the glass where
    // its elements are. Cheap: the costly scattering only redraws when the
    // sun moves, and the clouds only when asked
    const redraw = (clouds: boolean) => {
      if (!lastFrame) return;
      const now = Date.now() + time.offset;
      settle();
      advance();
      // The clock's element may be new, when the status was rendered again
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

    // ── Moving ───────────────────────────────────────────────────────────────

    let frameRequest = 0;
    let lastClouds = 0;
    let lastTick = 0;
    let slowFor = 0;

    // Too slow for this device: the weather holds still for the rest of the
    // visit
    const holdStill = () => {
      holdsStill = true;
      stillRef.current = true;
      updateLoop();
    };

    // While the footer shows and the weather may move: the clouds as often
    // as they drift, rain, snow and lightning every frame. A played day
    // draws its own frames
    const loop = (now: number) => {
      // Back from a hidden tab, which isn't the page being slow
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

    // The footer shows or is covered, and its content has moved. Only the
    // glass follows the content as it rises. The weather is the loop's, or
    // holds still
    refreshRef.current = (shown) => {
      if (shown !== undefined && shown !== isShown) {
        isShown = shown;
        if (shown && isDirty) draw();
      }
      updateLoop();
      if (isShown) redraw(false);
    };

    // No sky from the shaders, after the GPU dropped the canvas or they
    // didn't compile: the gradient takes over, without weather or glass
    const fallBack = () => {
      setGlass(false);
      updateLoop();
      draw();
    };

    // This footer's turn with the shared sky, see shared-sky.ts
    const host: SkyHost = {
      element: sky,
      onReady: () => {
        setGlass(true);
        isDirty = true;
        updateLoop();
        // Drawn now if it's needed, or once the first draw has had its turn
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

    // The status, before the first sky is drawn
    showClock(new Date());
    showNight(sunAt(new Date(), home).elevation);
    showCondition(goalWeather());

    // The canvas is sized to the footer when this one draws, see claimSky.
    // The glass can change size inside it, and is drawn again where it is
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
    // The footer, and the glass, which can change size inside it
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(sky);
    for (const element of footer.querySelectorAll("[data-glass]")) {
      resizeObserver.observe(element);
    }
    resize();

    // The first sky, before the page is pulled off the footer
    const firstDrawTimer = setTimeout(() => {
      isSettledIn = true;
      if (isDirty && !isShown) draw();
    }, FIRST_DRAW_MS);

    // On the minute, while no day is playing: the sun has moved
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
      // From this time yesterday, so it starts as it is and lands on now. The
      // clouds drift from where they are
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
  }, [skyRef, clockRef]);

  // Animations turned on or off: the weather starts or stops
  useEffect(() => {
    animateRef.current = animationsEnabled;
    refreshRef.current?.();
  }, [animationsEnabled]);

  return {
    play: () => playRef.current?.(),
    // For the curtain, after it moves the page or the footer's content
    refresh: (isShown?: boolean) => refreshRef.current?.(isShown),
    isPlaying,
    hasGlass,
    // For the footer's status
    condition,
    isNight,
  };
};
