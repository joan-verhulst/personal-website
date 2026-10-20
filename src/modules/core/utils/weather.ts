export interface WeatherHour {
  time: number;
  cover: number;
  coverHigh: number;
  code: number;
  precipitation: number;
}

export interface WeatherReport extends Omit<WeatherHour, "time"> {
  windSpeed: number;
  windDirection: number;
  hours: WeatherHour[];
}

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

export const FALLING = ["Nothing", "Rain", "Snow"] as const;

const [NOTHING, RAINING, SNOWING] = FALLING.map((_, index) => index);

export interface CloudLook {
  coverage: number;
  scale: number;
  height: number;
  thickness: number;
  billow: number;
  ragged: number;
  softness: number;
  murk: number;
  veil: number;
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

export interface SkyWeather {
  state: number;
  look: CloudLook;
  falling: number;
  thunder: boolean;
  windX: number;
  windY: number;
}

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

const FOG_MURK = 0.9;

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

const PARTLY_FROM = 0.2;
const CLOUDY_FROM = 0.65;

const LIVE_COVER = 1;
const RAIN_COVER_AT_LEAST = 0.7;

const BREEZE = { windX: -0.007, windY: -0.007 };

const windOf = (report: WeatherReport | null) => {
  if (!report) return BREEZE;
  const radians = (report.windDirection * Math.PI) / 180;
  const speed = report.windSpeed / 1000;
  return { windX: Math.sin(radians) * speed, windY: Math.cos(radians) * speed };
};

const smoothstep = (from: number, to: number, value: number) => {
  const share = Math.min(Math.max((value - from) / (to - from), 0), 1);
  return share * share * (3 - 2 * share);
};

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

/** Picks one of five sky looks from the report; `at` picks an hour of the played day instead of now. */
export const skyWeather = (
  report: WeatherReport | null,
  looks: readonly CloudLook[],
  at?: number,
): SkyWeather => {
  const wind = windOf(report);
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

export const WEATHER_MS = 5 * 60_000;

let last: { report: WeatherReport; at: number } | null = null;
let pending: Promise<WeatherReport | null> | null = null;

// Timeout: a request that hangs would otherwise hold up every render
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

export const fetchWeather = (): Promise<WeatherReport | null> => {
  if (last && Date.now() - last.at < WEATHER_MS) {
    return Promise.resolve(last.report);
  }
  pending ??= requestWeather().finally(() => {
    pending = null;
  });
  return pending;
};
