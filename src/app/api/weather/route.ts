import { siteData } from "~/data/site";
import type {
  WeatherHour,
  WeatherReport,
} from "~/modules/core/utils/weather";

// The radar updates every five minutes, the model every fifteen, so each
// lookup is kept that long in Next's data cache, shared by every visitor.
const LOOKUP_SECONDS = 300;

// The CDN in front of the site keeps the route's answer as long, and hands
// it out while it fetches a new one, so a crowd never reaches this code at
// all. Browsers don't keep it, so a retry really asks again
const CACHE_CONTROL = `public, max-age=0, s-maxage=${LOOKUP_SECONDS}, stale-while-revalidate=${LOOKUP_SECONDS * 3}`;

const TRIES = 4;
const ERROR_TRIES = 2;
const TIMEOUT_MS = 3500;

const OPEN_METEO = "https://api.open-meteo.com/v1/forecast";
const RADAR = "https://gpsgadget.buienradar.nl/data/raintext";
const STATIONS = "https://data.buienradar.nl/2.0/feed/json";

const RAIN_FROM = 0.1;

const CURRENT = [
  "cloud_cover",
  "cloud_cover_high",
  "weather_code",
  "precipitation",
  "wind_speed_850hPa",
  "wind_direction_850hPa",
] as const;
const HOURLY = [
  "time",
  "cloud_cover",
  "cloud_cover_high",
  "weather_code",
  "precipitation",
] as const;

type Current = Record<(typeof CURRENT)[number], number>;
type Hourly = Record<(typeof HOURLY)[number], unknown[]>;

interface Station {
  lat: number;
  lon: number;
  weatherdescription: string;
  precipitation: number;
}

interface Sky {
  cover: number;
  code: number;
  precipitation: number;
}

const isCurrent = (value: unknown): value is Current =>
  typeof value === "object" &&
  value !== null &&
  CURRENT.every(
    (field) => typeof (value as Record<string, unknown>)[field] === "number",
  );

const isHourly = (value: unknown): value is Hourly => {
  if (typeof value !== "object" || value === null) return false;
  const lists = value as Record<string, unknown>;
  const { time } = lists;
  return (
    Array.isArray(time) &&
    HOURLY.every(
      (field) =>
        Array.isArray(lists[field]) &&
        (lists[field] as unknown[]).length === time.length,
    )
  );
};

const isStation = (value: unknown): value is Station =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as Station).lat === "number" &&
  typeof (value as Station).lon === "number" &&
  typeof (value as Station).weatherdescription === "string" &&
  typeof (value as Station).precipitation === "number";

const isThunder = (code: number) => code >= 95;
const isSnow = (code: number) =>
  (code >= 71 && code <= 77) || code === 85 || code === 86;
const isRain = (code: number) =>
  (code >= 51 && code <= 67) || (code >= 80 && code <= 82);

const coverCode = (cover: number) =>
  cover < 0.15 ? 0 : cover < 0.45 ? 1 : cover < 0.8 ? 2 : 3;

const rainCode = (rain: number) => (rain < 1 ? 51 : rain < 4 ? 61 : 63);

const fetchWithTries = async (url: string, tries: number) => {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        next: { revalidate: LOOKUP_SECONDS },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (response.ok) return response;
      if (attempt >= tries) throw new Error(`${response.status} from ${url}`);
    } catch (error) {
      if (attempt >= Math.min(tries, ERROR_TRIES)) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400 * attempt));
  }
};

const fetchModel = async () => {
  const { latitude, longitude } = siteData.owner.home;
  const url = new URL(OPEN_METEO);
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", CURRENT.join(","));
  url.searchParams.set("hourly", HOURLY.slice(1).join(","));
  url.searchParams.set("past_days", "1");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timeformat", "unixtime");
  url.searchParams.set("wind_speed_unit", "ms");
  const body: unknown = await (await fetchWithTries(url.href, TRIES)).json();
  const { current, hourly } = (body ?? {}) as {
    current?: unknown;
    hourly?: unknown;
  };
  if (!isCurrent(current)) throw new Error("Open-Meteo answered without now");

  const hours: WeatherHour[] = [];
  if (isHourly(hourly)) {
    hourly.time.forEach((time, index) => {
      const hour = {
        time: Number(time) * 1000,
        cover: Number(hourly.cloud_cover[index]) / 100,
        coverHigh: Number(hourly.cloud_cover_high[index]) / 100,
        code: Number(hourly.weather_code[index]),
        precipitation: Number(hourly.precipitation[index]),
      };
      if (Object.values(hour).every(Number.isFinite)) hours.push(hour);
    });
  }
  return { current, hours };
};

const fetchRadar = async () => {
  const { latitude, longitude } = siteData.owner.home;
  const url = new URL(RADAR);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  const text = await (await fetchWithTries(url.href, 1)).text();
  const value = Number(text.trim().split("\n")[0]?.split("|")[0]);
  if (!Number.isFinite(value)) throw new Error("The radar answered oddly");
  return value <= 0 ? 0 : Math.round(10 ** ((value - 109) / 32) * 100) / 100;
};

const fetchStation = async () => {
  const { latitude, longitude } = siteData.owner.home;
  const body: unknown = await (await fetchWithTries(STATIONS, 1)).json();
  const stations = (
    body as { actual?: { stationmeasurements?: unknown[] } } | null
  )?.actual?.stationmeasurements;
  if (!Array.isArray(stations)) throw new Error("No stations in the feed");
  const distance = (station: Station) =>
    Math.hypot(station.lat - latitude, (station.lon - longitude) * 0.62);
  let nearest: Station | null = null;
  for (const station of stations) {
    if (isStation(station) && (!nearest || distance(station) < distance(nearest))) {
      nearest = station;
    }
  }
  if (!nearest) throw new Error("No station to read");
  return nearest;
};

const skyFromDescription = (description: string) => {
  const text = description.toLowerCase();
  let cover: number | null = null;
  if (/onbewolkt|zonnig|helder/.test(text)) cover = 0.1;
  else if (/zwaar bewolkt/.test(text)) cover = 0.9;
  else if (/half bewolkt|opklaringen|licht bewolkt|afwisselend/.test(text)) {
    cover = 0.5;
  } else if (/bewolkt/.test(text)) cover = 0.8;

  let code: number | null = null;
  if (/onweer/.test(text)) code = 95;
  else if (/sneeuw/.test(text)) code = 71;
  else if (/hagel/.test(text)) code = 63;
  else if (/motregen/.test(text)) code = 51;
  else if (/regen|bui/.test(text)) code = 61;
  else if (/mist|nevel/.test(text)) code = 45;
  return { cover, code };
};

const skyNow = (
  model: Current,
  radar: number | null,
  station: Station | null,
): Sky => {
  let cover = model.cloud_cover / 100;
  let code = model.weather_code;
  let precipitation = model.precipitation;

  if (station) {
    const seen = skyFromDescription(station.weatherdescription);
    if (seen.cover !== null) cover = seen.cover;
    if (seen.code !== null) code = seen.code;
    precipitation = station.precipitation;
  }

  if (radar !== null) {
    precipitation = radar;
    if (radar >= RAIN_FROM) {
      if (!isThunder(code) && !isSnow(code)) code = rainCode(radar);
    } else if (isRain(code)) {
      code = coverCode(cover);
    }
  }
  return { cover, code, precipitation };
};

const unavailable = () =>
  Response.json({}, { status: 502, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  const [model, radar, station] = await Promise.allSettled([
    fetchModel(),
    fetchRadar(),
    fetchStation(),
  ]);
  for (const answer of [radar, station]) {
    if (answer.status === "rejected") console.warn(answer.reason);
  }
  if (model.status === "rejected") {
    console.error(model.reason);
    return unavailable();
  }

  const { current, hours } = model.value;
  const sky = skyNow(
    current,
    radar.status === "fulfilled" ? radar.value : null,
    station.status === "fulfilled" ? station.value : null,
  );
  const report: WeatherReport = {
    ...sky,
    coverHigh: current.cloud_cover_high / 100,
    windSpeed: current.wind_speed_850hPa,
    windDirection: current.wind_direction_850hPa,
    hours,
  };
  return Response.json(report, { headers: { "Cache-Control": CACHE_CONTROL } });
}
