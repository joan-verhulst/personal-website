// A day in the room: what I'm doing at any hour there, and the time it is
// there. The room on the about page plays it, see room-scene.ts

import { siteData } from "~/data/site";

const { timeZone } = siteData.owner.home;

// What I'm up to: at the desk, out of the room, or in bed
export type Activity = "work" | "away" | "sleep";

// The day, in hours from midnight. Every day the same: the room doesn't know
// about weekends
const SCHEDULE: { from: number; activity: Activity }[] = [
  { from: 0, activity: "sleep" },
  { from: 8, activity: "work" },
  { from: 17, activity: "away" },
  { from: 23, activity: "sleep" },
];

/** What I'm doing at this hour of the day, like 14.5 for half past two. */
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

/** The hour of the day at home, with its minutes as a fraction. */
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

// The clock, in the visitor's own way of writing the time
const clockFormat = new Intl.DateTimeFormat(undefined, {
  hour: "numeric",
  minute: "2-digit",
  timeZone,
});

/** The time at home, for the room's status. */
export const homeClockAt = (date: Date) => clockFormat.format(date);
