
import { siteData } from "~/data/site";
import { activityAt, homeHourAt } from "~/modules/about/room/schedule";
import { sunAt } from "~/modules/core/utils/sun";

export type StillPhase = "day" | "evening" | "night";

export const STILL_PHASES: StillPhase[] = ["day", "evening", "night"];

const { home } = siteData.owner;

export const stillPhaseAt = (date: Date): StillPhase => {
  if (sunAt(date, home).elevation > 3) return "day";
  return activityAt(homeHourAt(date)) === "sleep" ? "night" : "evening";
};

export const stillUrl = (phase: StillPhase, version: number) => `/about/room/${phase}.webp?v=${version}`;

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
