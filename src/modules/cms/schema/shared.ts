import * as v from "valibot";

// Shared with the actions, so not "use server"

const isHttps = (value: string) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

const capped = (max: number) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.maxLength(max, `Keep it under ${max} characters.`),
  );

export const shortText = capped(200);

export const longText = capped(2000);

/** One-line text that can't be left empty. */
export const requiredText = (message: string, max = 200) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(message),
    v.maxLength(max, `Keep it under ${max} characters.`),
  );

export const link = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(2000, "That link is too long."),
  v.check(
    (value) => !value || isHttps(value),
    "Use a full link that starts with https://.",
  ),
  v.transform((value) => (value ? new URL(value).href : value)),
);

export const mediaPath = (message: string) =>
  v.pipe(
    v.string(),
    v.maxLength(300, message),
    v.regex(/^[\w-][\w./-]*$/, message),
    v.check((value) => !value.includes(".."), message),
  );

export const dimension = (message: string) =>
  v.pipe(
    v.number(message),
    v.integer(message),
    v.minValue(1, message),
    v.maxValue(20000, message),
  );
