"use client";

import { type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { siteData } from "~/data/site";
import { Choice, Demo, Slider } from "~/modules/blog/components/demo";
import ShaderCanvas from "~/modules/blog/components/shader-canvas";
import { drawSky, fitCanvas, skyFrameAt } from "~/modules/blog/components/sky-cover";
import {
  COVERAGE_FRAGMENT,
  SCATTER_FRAGMENT,
} from "~/modules/blog/demos/sky-gl";
import {
  createSkyRenderer,
  SKY_DEFAULTS,
  type SkyRenderer,
} from "~/modules/core/utils/sky-shader";
import { LOOK_KEYS, SKY_STATES, type SkyWeather } from "~/modules/core/utils/weather";

const RADIANS = Math.PI / 180;
const INK = "#0f0f0f";
const PAPER = "#faf9f9";
const BLUE = "#3a9bd8";

// ── The scattering ──────────────────────────────────────────────────────────

/** The clear sky behind the clouds, with the sun wherever you put it. */
export const ScatteringDemo = () => {
  const [sun, setSun] = useState(4);

  return (
    <Demo
      className="aspect-2/1"
      caption="The sky with no clouds in it, from the horizon up. Drag the sun down past the horizon for the sunset and the blue hour."
      controls={
        <Slider label="Sun" value={sun} min={-10} max={50} step={0.1} onChange={setSun} format={(value) => `${value.toFixed(1)}°`} />
      }
    >
      <ShaderCanvas
        fragment={SCATTER_FRAGMENT}
        className="absolute inset-0"
        uniforms={{
          uSunElevation: sun * RADIANS,
          uSunX: 0.5,
          uSpan: 50 * RADIANS,
          uRayleigh: 1,
          uMie: 1,
          uOzone: 1,
        }}
      />
    </Demo>
  );
};

// ── Coverage as a threshold ─────────────────────────────────────────────────

const SHEET_STATS = { mean: 0.563, spread: 0.089 };
const HEAPS_STATS = { mean: 0.553, spread: 0.135 };

const thresholdFor = (coverage: number, mean: number, spread: number) => {
  const share = Math.min(Math.max(coverage, 0.02), 0.98);
  return mean + (spread * Math.log((1 - share) / share)) / 1.7;
};

const C_WIDTH = 960;
const C_HEIGHT = 140;

/** The noise from above, cut at the threshold for a coverage. */
export const CoverageDemo = () => {
  const [coverage, setCoverage] = useState(0.45);
  const [softness, setSoftness] = useState(0.15);
  const [billow, setBillow] = useState(0);

  const mean = SHEET_STATS.mean + (HEAPS_STATS.mean - SHEET_STATS.mean) * billow;
  const spread = SHEET_STATS.spread + (HEAPS_STATS.spread - SHEET_STATS.spread) * billow;
  const edge = thresholdFor(coverage, mean, spread);

  // The noise's values as a bell, from four spreads under the mean to four over
  const from = mean - 4 * spread;
  const to = mean + 4 * spread;
  const xOf = (value: number) => ((value - from) / (to - from)) * C_WIDTH;
  const bell = (value: number) => Math.exp(-(((value - mean) / spread) ** 2) / 2);
  const points: string[] = [];
  const tail: string[] = [`${xOf(Math.max(edge, from))},${C_HEIGHT}`];
  for (let i = 0; i <= 120; i++) {
    const value = from + ((to - from) * i) / 120;
    const y = C_HEIGHT - 10 - bell(value) * (C_HEIGHT - 30);
    points.push(`${xOf(value).toFixed(1)},${y.toFixed(1)}`);
    if (value >= edge) tail.push(`${xOf(value).toFixed(1)},${y.toFixed(1)}`);
  }
  tail.push(`${C_WIDTH},${C_HEIGHT}`);

  return (
    <Demo
      caption="One tile of the noise, 30 kilometers across, from straight above. The noise's values fall in a bell, so the threshold that leaves a given share of it over is worked out from its average and spread. Billow mixes the soft sheet with round heaps."
      controls={
        <>
          <Slider label="Coverage" value={coverage} min={0.02} max={0.98} onChange={setCoverage} format={(value) => `${Math.round(value * 100)}%`} />
          <Slider label="Softness" value={softness} min={0.01} max={0.4} onChange={setSoftness} />
          <Slider label="Billow" value={billow} min={0} max={1} onChange={setBillow} />
        </>
      }
    >
      <div className="relative aspect-2/1">
        <ShaderCanvas
          fragment={COVERAGE_FRAGMENT}
          className="absolute inset-0"
          uniforms={{ uCoverage: coverage, uSoftness: softness, uBillow: billow }}
        />
      </div>
      <svg
        viewBox={`0 0 ${C_WIDTH} ${C_HEIGHT}`}
        className="block w-full border-neutral-950/10 border-t"
        role="img"
        aria-label="The noise's values as a bell curve, with the share over the threshold shaded"
      >
        <rect width={C_WIDTH} height={C_HEIGHT} fill={PAPER} />
        <polygon points={tail.join(" ")} fill={BLUE} fillOpacity={0.25} />
        <polyline points={points.join(" ")} fill="none" stroke={INK} strokeWidth={2} />
        <line x1={xOf(edge)} y1={12} x2={xOf(edge)} y2={C_HEIGHT} stroke={BLUE} strokeWidth={2} />
        <text x={Math.min(xOf(edge) + 10, C_WIDTH - 130)} y={28} fontSize={14} fill={INK} fillOpacity={0.6}>
          {`threshold ${edge.toFixed(3)}`}
        </text>
      </svg>
    </Demo>
  );
};

// ── The real thing ──────────────────────────────────────────────────────────

const { home } = siteData.owner;

// Degrees of sky from the horizon to the top, as on the cover
const SPAN = 50;

/**
 * A canvas for the whole shader, with a renderer of its own once it's
 * scrolled into view. `paint` draws a frame with the latest values, and the
 * `draw` handed back calls it whenever one of them changes.
 */
const useSkyCanvas = (
  paint: (renderer: SkyRenderer, pixelRatio: number) => void,
) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SkyRenderer | null>(null);
  const ratioRef = useRef(1);
  const paintRef = useRef(paint);
  paintRef.current = paint;
  const [isSupported, setSupported] = useState(true);
  const [isInView, setInView] = useState(false);

  const draw = useCallback(() => {
    if (rendererRef.current) paintRef.current(rendererRef.current, ratioRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting);
      if (!entry.isIntersecting || rendererRef.current) return;
      rendererRef.current = createSkyRenderer(
        canvas,
        () => {
          rendererRef.current = null;
        },
        // Compiled in the background: drawn once it's ready
        draw,
      );
      if (!rendererRef.current) {
        setSupported(false);
        return;
      }
      ratioRef.current = fitCanvas(canvas);
      draw();
    });
    observer.observe(canvas);
    const resizeObserver = new ResizeObserver(() => {
      if (!rendererRef.current) return;
      ratioRef.current = fitCanvas(canvas);
      draw();
    });
    resizeObserver.observe(canvas);
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [draw]);

  return { canvasRef, isSupported, isInView, draw };
};

/** Where the whole shader draws, or a note where it can't. */
const SkyCanvas = ({
  canvasRef,
  isSupported,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isSupported: boolean;
}) => (
  <div className="relative aspect-2/1 bg-neutral-900">
    <canvas ref={canvasRef} aria-hidden className="absolute inset-0 block size-full" />
    {!isSupported && (
      <p className="absolute inset-0 flex items-center justify-center p-6 text-center font-light text-neutral-50/70 text-sm">
        This demo needs WebGL2, which this browser doesn't have.
      </p>
    )}
  </div>
);

// What falls from each sky, and whether it thunders
const weatherFor = (state: number): SkyWeather => ({
  state,
  look: { ...SKY_DEFAULTS.clouds[state] },
  falling: state >= 3 ? 1 : 0,
  thunder: state === 4,
  windX: -0.007,
  windY: -0.007,
});

// How bright a flash of lightning still is, this long after it struck
const flashAfter = (since: number) => (since < 1000 ? Math.exp(-since / 90) * 0.4 : 0);

// ── Lighting ────────────────────────────────────────────────────────────────

// The partly cloudy layer, with no high cloud over it
const LIT_LOOK = { ...SKY_DEFAULTS.clouds[1], veil: 0 };

/** A layer of cloud, as thick and as broken as you like, with the sun wherever you put it. */
export const LightingDemo = () => {
  const [sun, setSun] = useState(2);
  const [coverage, setCoverage] = useState(0.5);
  const [thickness, setThickness] = useState(5);

  const { canvasRef, isSupported, draw } = useSkyCanvas((renderer, pixelRatio) => {
    drawSky(renderer, {
      sunElevation: sun,
      sunX: 0.75,
      span: SPAN,
      starTurn: 0,
      weather: { ...weatherFor(1), look: { ...LIT_LOOK, coverage, thickness } },
      drift: [0, 0],
      time: 0,
      flash: 0,
      bolt: null,
      pixelRatio,
    });
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: redrawn whenever a control moves
  useEffect(() => {
    draw();
  }, [draw, sun, coverage, thickness]);

  return (
    <Demo
      caption="One layer of cloud with the sun low behind it. Thicker clouds hang darker. Close the gaps with coverage, and the orange goes from their undersides."
      controls={
        <>
          <Slider label="Sun" value={sun} min={-6} max={40} step={0.1} onChange={setSun} format={(value) => `${value.toFixed(1)}°`} />
          <Slider label="Coverage" value={coverage} min={0.2} max={1} onChange={setCoverage} format={(value) => `${Math.round(value * 100)}%`} />
          <Slider label="Thickness" value={thickness} min={1} max={30} step={0.1} onChange={setThickness} format={(value) => value.toFixed(1)} />
        </>
      }
    >
      <SkyCanvas canvasRef={canvasRef} isSupported={isSupported} />
    </Demo>
  );
};

// ── Five skies ──────────────────────────────────────────────────────────────

// How long the sky takes to ease into the next one here, in seconds: far
// sooner than the twenty the weather takes
const DEMO_EASE = 1.5;

/** The five skies, easing from one into the next. */
export const WeatherDemo = () => {
  const [state, setState] = useState(1);
  const valuesRef = useRef({
    look: { ...SKY_DEFAULTS.clouds[1] },
    time: 0,
    drift: 0,
    flashAt: -1e9,
  });

  const { canvasRef, isSupported, isInView, draw } = useSkyCanvas((renderer, pixelRatio) => {
    const { look, time, drift, flashAt } = valuesRef.current;
    drawSky(renderer, {
      sunElevation: 20,
      sunX: 0.6,
      span: SPAN,
      starTurn: 0,
      // Rain keeps falling until it has eased out
      weather: { ...weatherFor(state), look, falling: look.fall > 0.005 ? 1 : 0 },
      drift: [0, -drift],
      time,
      flash: flashAfter(performance.now() - flashAt),
      bolt: null,
      pixelRatio,
    });
  });

  // While in view: every number eases toward the sky picked, the wind
  // carries the clouds, rain falls and lightning strikes
  useEffect(() => {
    if (!isInView) return;
    let request = 0;
    let last = performance.now();
    let nextStrike = last + 3000;
    const goal = SKY_DEFAULTS.clouds[state];
    const loop = (now: number) => {
      const seconds = (now - last) / 1000;
      last = now;
      const values = valuesRef.current;
      const share = 1 - Math.exp(-seconds / DEMO_EASE);
      for (const key of LOOK_KEYS) {
        values.look[key] += (goal[key] - values.look[key]) * share;
      }
      values.time += seconds;
      values.drift += seconds * 0.04;
      if (state === 4 && now > nextStrike) {
        values.flashAt = now;
        nextStrike = now + 4000 + Math.random() * 6000;
      }
      draw();
      request = requestAnimationFrame(loop);
    };
    request = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(request);
  }, [isInView, state, draw]);

  return (
    <Demo
      caption="The five skies. Pick one and the clouds ease into it, here in a few seconds rather than twenty."
      controls={
        <Choice
          label="Sky"
          value={state}
          options={SKY_STATES.map((label, index) => ({ value: index, label }))}
          onChange={setState}
        />
      }
    >
      <SkyCanvas canvasRef={canvasRef} isSupported={isSupported} />
    </Demo>
  );
};

// ── All of it ───────────────────────────────────────────────────────────────

// Home's clock, made once rather than for every frame it's read in
const hourFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
  timeZone: home.timeZone,
});

// Home's hour now, so the slider starts there
const hourAtHome = () => {
  const parts = hourFormat.formatToParts(new Date());
  const hour = Number(parts.find(({ type }) => type === "hour")?.value ?? 12);
  const minute = Number(parts.find(({ type }) => type === "minute")?.value ?? 0);
  return hour + minute / 60;
};

const formatHour = (hour: number) =>
  `${String(Math.floor(hour) % 24).padStart(2, "0")}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}`;

/** The whole shader, with its time, sky and wind in your hands. */
export const SkyPlayground = () => {
  const [hour, setHour] = useState(12);
  const [state, setState] = useState(1);
  // What the slider shows, to the tenth it shows. The drift itself is in
  // valuesRef, where moving carries it on every frame without a render
  const [drift, setDrift] = useState(0);
  const [isMoving, setMoving] = useState<"still" | "moving">("still");
  const valuesRef = useRef({ hour, state, drift, time: 0, flashAt: -1e9 });
  valuesRef.current = { ...valuesRef.current, hour, state };

  // Dragged by hand, the drift is what the slider shows
  const moveDrift = (value: number) => {
    valuesRef.current.drift = value;
    setDrift(value);
  };

  useEffect(() => {
    setHour(hourAtHome());
  }, []);

  const { canvasRef, isSupported, isInView, draw } = useSkyCanvas((renderer, pixelRatio) => {
    const values = valuesRef.current;
    const date = new Date(Date.now() + (values.hour - hourAtHome()) * 3_600_000);
    drawSky(
      renderer,
      skyFrameAt(date, weatherFor(values.state), pixelRatio, {
        drift: [0, -values.drift],
        time: values.time,
        flash: flashAfter(performance.now() - values.flashAt),
      }),
    );
  });

  // Redrawn whenever a control moves, unless it's moving in view, when the
  // loop below draws every frame anyway
  // biome-ignore lint/correctness/useExhaustiveDependencies: redrawn whenever a control moves
  useEffect(() => {
    if (isMoving === "moving" && isInView) return;
    draw();
  }, [draw, hour, state, drift, isMoving, isInView]);

  // Moving: rain and snow fall, the wind carries the clouds, lightning
  // strikes. Only while in view, and drawn once a frame
  useEffect(() => {
    if (isMoving !== "moving" || !isInView) return;
    let request = 0;
    let last = performance.now();
    let nextStrike = last + 3000;
    // The slider follows in tenths of a kilometer, so it renders again
    // every few seconds rather than every frame
    let shown = Math.round(valuesRef.current.drift * 10);
    const loop = (now: number) => {
      const seconds = (now - last) / 1000;
      last = now;
      const values = valuesRef.current;
      values.time += seconds;
      values.drift = (values.drift + seconds * 0.04) % 30;
      if (Math.round(values.drift * 10) !== shown) {
        shown = Math.round(values.drift * 10);
        setDrift(shown / 10);
      }
      if (values.state === 4 && now > nextStrike) {
        values.flashAt = now;
        nextStrike = now + 4000 + Math.random() * 6000;
      }
      draw();
      request = requestAnimationFrame(loop);
    };
    request = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(request);
  }, [isMoving, isInView, draw]);

  return (
    <Demo
      caption="Everything above in one shader, with the clock and the sky handed to you. Set it moving to let the wind carry the clouds and the rain fall."
      controls={
        <>
          <Slider label="Time of day" value={hour} min={0} max={23.99} step={0.05} onChange={setHour} format={formatHour} />
          <Slider label="Wind has carried the clouds" value={drift} min={0} max={30} step={0.1} onChange={moveDrift} format={(value) => `${value.toFixed(1)} km`} />
          <Choice
            label="Sky"
            value={state}
            options={SKY_STATES.map((label, index) => ({ value: index, label }))}
            onChange={setState}
          />
          <Choice
            label="Weather"
            value={isMoving}
            options={[
              { value: "still", label: "Still" },
              { value: "moving", label: "Moving" },
            ]}
            onChange={setMoving}
          />
        </>
      }
    >
      <SkyCanvas canvasRef={canvasRef} isSupported={isSupported} />
    </Demo>
  );
};
