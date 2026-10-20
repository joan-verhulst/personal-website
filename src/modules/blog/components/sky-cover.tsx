"use client";

import { useEffect, useRef } from "react";
import { siteData } from "~/data/site";
import { useAnimationPreference } from "~/modules/core/context/animation-preference-context";
import { useThreeD } from "~/modules/core/hooks/use-three-d";
import { onSkyReady, paintSky } from "~/modules/core/utils/shared-sky";
import {
  createSkyRenderer,
  type GlassShape,
  SKY_DEFAULTS,
  type SkyFrame,
  type SkyRenderer,
} from "~/modules/core/utils/sky-shader";
import { sunAt } from "~/modules/core/utils/sun";
import { fetchWeather, type SkyWeather, skyWeather } from "~/modules/core/utils/weather";
import cn from "~/utils/cn";

const { home } = siteData.owner;

const SPAN = 50;
const REACH = 120;
const EDGE = 0.42;
const PIXEL_BUDGET = 1_500_000;

const DAY_PACE = 0.8;
const DUSK_PACE = 0.25;
const NIGHT_PACE = 3;
const CLOUD_PACE = 30;
// Frames a second while it plays, and how long it shows the sky as it is
// before it starts
const PLAY_FPS = 30;
const PLAY_AFTER_SECONDS = 1.2;
const FRAME_SLACK = 4;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

const smoothstep = (from: number, to: number, value: number) => {
  const t = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return t * t * (3 - 2 * t);
};

const paceAt = (elevation: number) =>
  elevation >= 0
    ? DUSK_PACE + (DAY_PACE - DUSK_PACE) * smoothstep(4, 16, elevation)
    : DUSK_PACE + (NIGHT_PACE - DUSK_PACE) * smoothstep(-6, -16, elevation);

export const skyFrameAt = (
  date: Date,
  weather: SkyWeather,
  pixelRatio: number,
  { drift = [0, 0], time = 0, flash = 0 }: { drift?: [number, number]; time?: number; flash?: number } = {},
): SkyFrame => {
  const sun = sunAt(date, home);
  return {
    sunElevation: sun.elevation,
    sunX: 0.5 + EDGE * Math.min(Math.max((sun.azimuth - 180) / REACH, -1), 1),
    span: SPAN,
    starTurn: ((date.getTime() / 3_600_000) * 15.041) % 360,
    weather,
    drift,
    time,
    flash,
    bolt: null,
    pixelRatio,
  };
};

export const fitCanvas = (canvas: HTMLCanvasElement) => {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const ratio = Math.min(
    window.devicePixelRatio || 1,
    Math.sqrt(PIXEL_BUDGET / Math.max(1, width * height)),
  );
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  return ratio;
};

export const drawSky = (
  renderer: SkyRenderer,
  frame: SkyFrame,
  glass: GlassShape[] = [],
) => renderer.draw(frame, glass, SKY_DEFAULTS, { clouds: true });

// A cover that plays draws every frame. On the footer's renderer that would
// take the canvas from the footer each time, see shared-sky.ts, so covers get their own.
let player: SkyRenderer | null | undefined;
let playerCanvas: HTMLCanvasElement | null = null;
const playerListeners = new Set<() => void>();

// After the GPU dropped the player, it's made again at most this many times
// a visit, so a GPU that keeps refusing isn't asked over and over
const MAX_REBUILDS = 3;
let rebuilds = 0;

const setUpPlayer = () => {
  if (player !== undefined) return;
  playerCanvas = document.createElement("canvas");
  player = createSkyRenderer(
    playerCanvas,
    () => {
      player?.destroy();
      player = null;
      playerCanvas = null;
      if (rebuilds < MAX_REBUILDS) {
        rebuilds += 1;
        player = undefined;
      }
    },
    () => {
      for (const listener of playerListeners) listener();
    },
  );
  if (!player) playerCanvas = null;
};

const isPlayerReady = () => player?.isReady() === true;

const paintPlayed = (context: CanvasRenderingContext2D, frame: SkyFrame) => {
  const { width, height } = context.canvas;
  if (!player?.isReady() || !playerCanvas || width === 0 || height === 0) {
    return false;
  }
  if (playerCanvas.width !== width || playerCanvas.height !== height) {
    playerCanvas.width = width;
    playerCanvas.height = height;
  }
  if (!drawSky(player, frame)) return false;
  context.drawImage(playerCanvas, 0, 0);
  return true;
};

interface Props {
  isPlaying?: boolean;
  className?: string;
}

const SkyCover = ({ isPlaying = false, className }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { animationsEnabled } = useAnimationPreference();
  const plays = isPlaying && animationsEnabled;
  // With the 3D turned off in the settings, the box's dark shows, as it
  // does without WebGL2
  const isThreeD = useThreeD();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!isThreeD) {
      canvas.style.visibility = "hidden";
      return;
    }
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) return;
    let weather = skyWeather(null, SKY_DEFAULTS.clouds);
    let ratio = 1;
    let isCancelled = false;
    let isSeen = false;
    let ahead = 0;
    const drift: [number, number] = [0, 0];
    let played = 0;

    const draw = () => {
      if (!isSeen) return;
      const frame = skyFrameAt(new Date(Date.now() + ahead), weather, ratio, {
        drift: [drift[0], drift[1]],
        time: played,
      });
      const isDrawn =
        plays && isPlayerReady()
          ? paintPlayed(context, frame)
          : paintSky(context, frame);
      if (isDrawn) canvas.style.visibility = "visible";
    };

    let request = 0;
    let last = 0;
    let shownFor = 0;
    const play = (now: number) => {
      request = requestAnimationFrame(play);
      if (now - last < 1000 / PLAY_FPS - FRAME_SLACK) return;
      const seconds = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      if (canvas.closest("[inert]")) return;
      shownFor += seconds;
      if (shownFor < PLAY_AFTER_SECONDS) return;
      setUpPlayer();
      if (!isPlayerReady()) return;
      const sun = sunAt(new Date(Date.now() + ahead), home);
      ahead = (ahead + seconds * paceAt(sun.elevation) * HOUR) % DAY;
      drift[0] += weather.windX * CLOUD_PACE * seconds;
      drift[1] += weather.windY * CLOUD_PACE * seconds;
      played += seconds;
      draw();
    };

    const observer = new IntersectionObserver(([entry]) => {
      isSeen = entry.isIntersecting;
      draw();
      cancelAnimationFrame(request);
      last = 0;
      if (isSeen && plays) request = requestAnimationFrame(play);
    });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(() => {
      ratio = fitCanvas(canvas);
      draw();
    });
    resizeObserver.observe(canvas);
    const stopListening = onSkyReady(draw);
    playerListeners.add(draw);
    fetchWeather().then((report) => {
      if (isCancelled || !report) return;
      weather = skyWeather(report, SKY_DEFAULTS.clouds);
      draw();
    });
    const timer = setInterval(draw, 60_000);

    return () => {
      isCancelled = true;
      observer.disconnect();
      resizeObserver.disconnect();
      stopListening();
      playerListeners.delete(draw);
      cancelAnimationFrame(request);
      clearInterval(timer);
    };
  }, [plays, isThreeD]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("block size-full bg-neutral-900", className)}
      style={{ visibility: "hidden" }}
    />
  );
};

export default SkyCover;
