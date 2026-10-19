// Pictures of the room, shown blurred while the live one is being made, so
// a visitor sees what's coming. Three, for the three ways the room looks:
// by day in the sun, in the evening with the desk lamps on, and at night
// with me asleep. The tuner draws and saves them, see tuner.ts; small and
// free of three.js, so the page can pick one before the room's code loads

import { siteData } from "~/data/site";
import { activityAt, homeHourAt } from "~/modules/about/room/schedule";
import { sunAt } from "~/modules/core/utils/sun";

export type StillPhase = "day" | "evening" | "night";

export const STILL_PHASES: StillPhase[] = ["day", "evening", "night"];

const { home } = siteData.owner;

/** The picture that looks most like the room at a moment. */
export const stillPhaseAt = (date: Date): StillPhase => {
  if (sunAt(date, home).elevation > 3) return "day";
  return activityAt(homeHourAt(date)) === "sleep" ? "night" : "evening";
};

/** Where a picture is served, with the save it's from, so a new one is fetched anew. */
export const stillUrl = (phase: StillPhase, version: number) => `/about/room/${phase}.webp?v=${version}`;

/**
 * The hour at home a picture is drawn at, on the day of `date`: early
 * afternoon, the first evening hour with the sun well down (late, in
 * summer), and the middle of the night.
 */
export const stillHourOn = (phase: StillPhase, date: Date): number => {
  if (phase === "day") return 13;
  if (phase === "night") return 2;
  const hourNow = homeHourAt(date);
  for (let hour = 18; hour < 22.75; hour += 0.25) {
    const at = new Date(date.getTime() + (hour - hourNow) * 3_600_000);
    if (sunAt(at, home).elevation < -4) return hour;
  }
  return 22.75;
};
