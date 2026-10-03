import * as v from "valibot";

// The rules the content schemas share. Like them, this file can't be
// "use server", and every output is also valid input: the form parses once,
// the action again

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

/** Optional one-line text, stored as null when it's left empty. */
export const shortText = capped(200);

/** Optional text of a few paragraphs, stored as null when it's left empty. */
export const longText = capped(2000);

/** One-line text that can't be left empty. */
export const requiredText = (message: string, max = 200) =>
  v.pipe(
    v.string(),
    v.trim(),
    v.nonEmpty(message),
    v.maxLength(max, `Keep it under ${max} characters.`),
  );

/**
 * An optional link. Only https: gets through, so nothing like javascript:
 * ends up in an href on the site.
 */
export const link = v.pipe(
  v.string(),
  v.trim(),
  v.maxLength(2000, "That link is too long."),
  v.check(
    (value) => !value || isHttps(value),
    "Use a full link that starts with https://.",
  ),
  // "https:example.com" passes as a URL, but a browser reads it as a path on
  // this site. Writing it out in full stores the link that was meant
  v.transform((value) => (value ? new URL(value).href : value)),
);

/** A path in the media bucket, as the upload button hands it over. */
export const mediaPath = (message: string) =>
  v.pipe(
    v.string(),
    v.maxLength(300, message),
    v.regex(/^[\w-][\w./-]*$/, message),
    v.check((value) => !value.includes(".."), message),
  );

/**
 * A width or height in pixels, as measured on upload. The site divides by
 * these, so zero can't get in.
 */
export const dimension = (message: string) =>
  v.pipe(
    v.number(message),
    v.integer(message),
    v.minValue(1, message),
    v.maxValue(20000, message),
  );
