
import { siteData } from "~/data/site";

const { timeZone } = siteData.owner.home;

export type Activity = "work" | "away" | "sleep";

const SCHEDULE: { from: number; activity: Activity }[] = [
  { from: 0, activity: "sleep" },
  { from: 8, activity: "work" },
  { from: 17, activity: "away" },
  { from: 23, activity: "sleep" },
];

export const activityAt = (hour: number): Activity => {
  let current = SCHEDULE[0].activity;
  for (const { from, activity } of SCHEDULE) {
    if (hour >= from) current = activity;
  }
  return current;
};

export const ACTIVITY_LABELS: Record<Activity, string> = {
  work: "Working",
  away: "Out",
  sleep: "Asleep",
};

const hourFormat = new Intl.DateTimeFormat("en-GB", {
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
  timeZone,
});

export const homeHourAt = (date: Date) => {
  let hour = 0;
  let minute = 0;
  let second = 0;
  for (const { type, value } of hourFormat.formatToParts(date)) {
    if (type === "hour") hour = Number(value);
    else if (type === "minute") minute = Number(value);
    else if (type === "second") second = Number(value);
  }
  return hour + minute / 60 + second / 3600;
};

const clockFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZone,
});

export const homeClockAt = (date: Date) => clockFormat.format(date);
