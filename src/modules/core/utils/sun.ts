// Where the sun is, for the sky in the footer

export interface Place {
  latitude: number;
  longitude: number;
}

export interface Sun {
  // Degrees above the horizon, negative below it
  elevation: number;
  // Compass degrees: 0 north, 90 east
  azimuth: number;
}

const RAD = Math.PI / 180;
const DAY = 86_400_000;

/**
 * Where the sun is at a moment, seen from a place. NOAA's approximation,
 * within a fraction of a degree, which puts sunrise within a few minutes.
 */
export const sunAt = (date: Date, { latitude, longitude }: Place): Sun => {
  // Days since the start of the year in UTC, with the time of day
  const days = (date.getTime() - Date.UTC(date.getUTCFullYear(), 0, 1)) / DAY;
  const year = ((2 * Math.PI) / 365) * (days - 0.5);

  // Minutes the sundial runs ahead of the clock, and how far north the sun is
  const equationOfTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(year) -
      0.032077 * Math.sin(year) -
      0.014615 * Math.cos(2 * year) -
      0.040849 * Math.sin(2 * year));
  const declination =
    0.006918 -
    0.399912 * Math.cos(year) +
    0.070257 * Math.sin(year) -
    0.006758 * Math.cos(2 * year) +
    0.000907 * Math.sin(2 * year) -
    0.002697 * Math.cos(3 * year) +
    0.00148 * Math.sin(3 * year);

  const solarMinutes = (days % 1) * 1440 + equationOfTime + 4 * longitude;
  const hourAngle = (solarMinutes / 4 - 180) * RAD;
  const lat = latitude * RAD;

  const elevation = Math.asin(
    Math.min(
      1,
      Math.max(
        -1,
        Math.sin(lat) * Math.sin(declination) +
          Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle),
      ),
    ),
  );
  // From the south, then turned to start in the north
  const azimuth =
    Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(lat) -
        Math.tan(declination) * Math.cos(lat),
    ) + Math.PI;

  return { elevation: elevation / RAD, azimuth: azimuth / RAD };
};
