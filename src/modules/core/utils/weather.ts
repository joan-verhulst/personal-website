// The weather at home, and which sky the footer draws for it. See
// app/api/weather/route.ts for where it comes from

// One hour of weather, for the played day
export interface WeatherHour {
  // When the hour started, in milliseconds since the epoch
  time: number;
  // How much of the sky is cloud, 0 to 1, and how much of it high cloud
  cover: number;
  coverHigh: number;
  // The WMO weather code: 0 clear, 61 rain, 71 snow, 80 showers, 95 thunder
  code: number;
  // Millimeters that came down in the hour
  precipitation: number;
}

// What the weather route answers: the weather now, and by the hour for the
// last day and this one
export interface WeatherReport extends Omit<WeatherHour, "time"> {
  // The wind up where the clouds are, in meters a second, and the compass
  // direction it comes from
  windSpeed: number;
  windDirection: number;
  hours: WeatherHour[];
}

// The skies the footer draws, by their index in SkyWeather's state, the way
// a weather app names them. Each has a look of its own, see SKY_DEFAULTS in
// utils/sky-shader.ts
export const SKY_STATES = [
  "Clear",
  "Partly cloudy",
  "Cloudy",
  "Rain",
  "Storm",
] as const;

const [CLEAR, PARTLY_CLOUDY, CLOUDY, RAIN, STORM] = SKY_STATES.map(
  (_, index) => index,
);

// What comes down, by its index in SkyWeather's falling
export const FALLING = ["Nothing", "Rain", "Snow"] as const;

const [NOTHING, RAINING, SNOWING] = FALLING.map((_, index) => index);

/**
 * How a sky's clouds look. Every sky is one of these, and the sky moves
 * from one to the next by easing each number, so a deck thickens and
 * closes up into rain rather than one sky's clouds dissolving and another's
 * forming.
 */
export interface CloudLook {
  // How much of the sky the clouds cover, 0 to 1
  coverage: number;
  // How large the clouds are, against their natural size
  scale: number;
  // How high the layer hangs, in kilometers. Lower clouds loom larger
  height: number;
  // How thick the clouds are, as the depth of light they stop. Thin ones
  // glow white with the sun through them, thick ones hang dark
  thickness: number;
  // Heaped cumulus (1) or a flat sheet (0)
  billow: number;
  // Fine churn torn into the edges and the base
  ragged: number;
  // How soft the clouds' edges are
  softness: number;
  // Rain and mist thickening the air toward the horizon
  murk: number;
  // A veil of high, thin cloud over everything, 0 to 1, as far as the
  // weather reports high cloud
  veil: number;
  // How much rain or snow comes down, 0 to 1
  fall: number;
}

export const LOOK_KEYS = [
  "coverage",
  "scale",
  "height",
  "thickness",
  "billow",
  "ragged",
  "softness",
  "murk",
  "veil",
  "fall",
] as const satisfies readonly (keyof CloudLook)[];

// What the sky draws
export interface SkyWeather {
  // Which sky this is nearest to, see SKY_STATES
  state: number;
  look: CloudLook;
  // What comes down from the clouds, see FALLING, and whether there's
  // lightning
  falling: number;
  thunder: boolean;
  // Where the wind carries the clouds, facing south: x to the right, y away
  // from the viewer. In kilometers a second
  windX: number;
  windY: number;
}

// What a weather app would call the sky, for the footer's status
export type SkyCondition =
  | "clear"
  | "partly"
  | "cloudy"
  | "fog"
  | "rain"
  | "snow"
  | "thunder";

export const CONDITION_LABELS: Record<SkyCondition, string> = {
  clear: "Clear",
  partly: "Partly cloudy",
  cloudy: "Cloudy",
  fog: "Fog",
  rain: "Rain",
  snow: "Snow",
  thunder: "Thunder",
};

// Fog is the cloudy sky with at least this much murk, see skyWeather
const FOG_MURK = 0.9;

/** What to call a sky. */
export const conditionOf = ({
  state,
  falling,
  thunder,
  look,
}: SkyWeather): SkyCondition => {
  if (thunder) return "thunder";
  if (falling === SNOWING) return "snow";
  if (falling === RAINING) return "rain";
  if (state === CLOUDY) return look.murk >= FOG_MURK ? "fog" : "cloudy";
  if (state === PARTLY_CLOUDY) return "partly";
  return "clear";
};

// From this much of the sky in cloud it's partly cloudy, and from the other
// cloudy
const PARTLY_FROM = 0.2;
const CLOUDY_FROM = 0.65;

// How far the reported cover pulls a sky's coverage from its look's: all
// the way, so an overcast report closes the deck, and how much of the sky
// rain covers at the least
const LIVE_COVER = 1;
const RAIN_COVER_AT_LEAST = 0.7;

// Until the weather is in, or when it can't be had: a south-westerly breeze
const BREEZE = { windX: -0.007, windY: -0.007 };

const windOf = (report: WeatherReport | null) => {
  if (!report) return BREEZE;
  // It blows from its compass direction, so toward the opposite one
  const radians = (report.windDirection * Math.PI) / 180;
  const speed = report.windSpeed / 1000;
  return { windX: Math.sin(radians) * speed, windY: Math.cos(radians) * speed };
};

const smoothstep = (from: number, to: number, value: number) => {
  const share = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return share * share * (3 - 2 * share);
};

// The weather at a moment of the played day: the hour it falls in, or the
// weather now when the hours don't reach it. The model's cover jumps from
// hour to hour on a showery day, which would flicker through a played day,
// so it's averaged with the hours either side
const hourAt = (report: WeatherReport, time: number) => {
  const { hours } = report;
  let index = -1;
  hours.forEach((candidate, at) => {
    if (candidate.time <= time) index = at;
  });
  if (index === -1) return report;
  const hour = hours[index];
  const before = hours[index - 1] ?? hour;
  const after = hours[index + 1] ?? hour;
  return {
    ...hour,
    cover: before.cover * 0.25 + hour.cover * 0.5 + after.cover * 0.25,
  };
};

/**
 * Which sky to draw for the weather, one of five looks, with what the
 * report says nudging it: how much of the sky is covered, whether there's
 * high cloud for a veil, and how hard it rains.
 * - Clear whenever there's little cloud, day or night.
 * - Partly cloudy is cumulus with sky between.
 * - Cloudy is a deck of stratus, and the one fog draws, thick with murk.
 * - Rain is a darker, lower deck that closes the sky, with rain under it.
 * - Storm is the heaviest deck, with lightning for thunder. Snow falls from
 *   a lighter one.
 *
 * `at` picks the hour of the played day instead of now.
 */
export const skyWeather = (
  report: WeatherReport | null,
  looks: readonly CloudLook[],
  at?: number,
): SkyWeather => {
  const wind = windOf(report);
  // Without a report there's no high cloud to veil the sky either
  if (!report) {
    return {
      state: CLEAR,
      look: { ...looks[CLEAR], veil: 0 },
      falling: NOTHING,
      thunder: false,
      ...wind,
    };
  }

  const { code, cover, coverHigh, precipitation } =
    at === undefined ? report : hourAt(report, at);
  const isSnow = (code >= 71 && code <= 77) || code === 85 || code === 86;
  const isThunder = code >= 95;
  const isRain = (code >= 51 && code <= 67) || (code >= 80 && code <= 82);
  const isFog = code === 45 || code === 48;

  let state = CLEAR;
  let falling = NOTHING;
  let thunder = false;
  if (isThunder) {
    state = STORM;
    falling = RAINING;
    thunder = true;
  } else if (isSnow) {
    state = STORM;
    falling = SNOWING;
  } else if (isRain) {
    state = RAIN;
    falling = RAINING;
  } else if (isFog || cover >= CLOUDY_FROM) {
    state = CLOUDY;
  } else if (cover >= PARTLY_FROM) {
    state = PARTLY_CLOUDY;
  }

  const look = { ...looks[state] };
  if (state === PARTLY_CLOUDY || state === CLOUDY) {
    look.coverage += (cover - look.coverage) * LIVE_COVER;
  }
  // A shower under a broken sky keeps some of that sky, but still reads as
  // rain
  if (state === RAIN) {
    look.coverage = Math.max(
      RAIN_COVER_AT_LEAST,
      look.coverage + (cover - look.coverage) * LIVE_COVER,
    );
  }
  if (isFog) {
    look.coverage = 1;
    look.murk = Math.max(look.murk, FOG_MURK);
  }
  // Snow falls from a lighter sky than a thunderstorm's, in thick air
  if (falling === SNOWING) {
    look.thickness *= 0.5;
    look.murk = Math.min(1, look.murk + 0.3);
  }
  look.veil *= smoothstep(0.1, 0.7, coverHigh);
  if (falling !== NOTHING) {
    look.fall *= 0.5 + 0.5 * smoothstep(0, 2.5, precipitation);
  }

  return { state, look, falling, thunder, ...wind };
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number";

const isHour = (value: unknown): value is WeatherHour =>
  typeof value === "object" &&
  value !== null &&
  isNumber((value as WeatherHour).time) &&
  isNumber((value as WeatherHour).cover) &&
  isNumber((value as WeatherHour).coverHigh) &&
  isNumber((value as WeatherHour).code) &&
  isNumber((value as WeatherHour).precipitation);

const isReport = (value: unknown): value is WeatherReport =>
  typeof value === "object" &&
  value !== null &&
  isNumber((value as WeatherReport).cover) &&
  isNumber((value as WeatherReport).coverHigh) &&
  isNumber((value as WeatherReport).code) &&
  isNumber((value as WeatherReport).precipitation) &&
  isNumber((value as WeatherReport).windSpeed) &&
  isNumber((value as WeatherReport).windDirection) &&
  Array.isArray((value as WeatherReport).hours) &&
  (value as WeatherReport).hours.every(isHour);

// How often the weather is asked for again, as often as the radar changes.
// Until then the last report serves
export const WEATHER_MS = 5 * 60_000;

// The last report and when it came, and the request on its way, if one is.
// The footers and the blog's cover ask at the same time, and a section's
// footer asks again as it opens: one request serves them all
let last: { report: WeatherReport; at: number } | null = null;
let pending: Promise<WeatherReport | null> | null = null;

// Longer than the route takes at its slowest, retries and all. A request
// that hangs, like on a dropped connection, would otherwise hold up every
// footer waiting on it for good
const REQUEST_MS = 20_000;

const requestWeather = async (): Promise<WeatherReport | null> => {
  try {
    const response = await fetch("/api/weather", {
      signal: AbortSignal.timeout(REQUEST_MS),
    });
    if (!response.ok) return null;
    const report: unknown = await response.json();
    if (!isReport(report)) return null;
    last = { report, at: Date.now() };
    return report;
  } catch {
    return null;
  }
};

/**
 * The weather at home: the last report while it's fresh, or a new one.
 * Null when it couldn't be had.
 */
export const fetchWeather = (): Promise<WeatherReport | null> => {
  if (last && Date.now() - last.at < WEATHER_MS) {
    return Promise.resolve(last.report);
  }
  pending ??= requestWeather().finally(() => {
    pending = null;
  });
  return pending;
};
