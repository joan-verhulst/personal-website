// What the site can show, with the extension each is stored under. The upload
// button checks a file against this for a clear message, and the server signs
// an upload only for these, so nothing else gets into the bucket
export const MEDIA_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
};

export const MAX_MEDIA_BYTES = 40 * 1024 * 1024;

// Every photo-like image gets a smaller copy next to it when it's uploaded:
// WebP, at most this many pixels on its long side. The site shows and
// preloads that copy, and keeps the original for viewing a piece large. The
// browser loads both straight from R2, so nothing is resized on request
export const DISPLAY_SIZE = 1600;

const DISPLAY_SUFFIX = ".display.webp";

/**
 * Whether a file has a display copy. SVGs scale on their own, a GIF would
 * lose its frames and a video isn't an image.
 */
export const hasDisplayCopy = (path: string) =>
  /\.(jpe?g|png|webp|avif)$/i.test(path) && !isDisplayCopy(path);

/** The display copy of a file, like photography/abc.jpg → photography/abc.display.webp. */
export const displayPath = (path: string) =>
  `${path.replace(/\.[^./]+$/, "")}${DISPLAY_SUFFIX}`;

/** Whether a path in the bucket is a display copy, not a file of its own. */
export const isDisplayCopy = (path: string) => path.endsWith(DISPLAY_SUFFIX);

// Where files uploaded on the Media page go. Uploads from a page go to that
// page's folder, which only says where a file came from: any page can use a
// file from any folder
export const LIBRARY_FOLDER = "library";

export const isMediaType = (type: string) => Object.hasOwn(MEDIA_TYPES, type);

// R2 stores 10 GB for free each month. The bucket never holds more: an upload
// that would go over is refused. Counted in decimal gigabytes, the smaller
// reading of "10 GB", so it stays under whichever one Cloudflare bills by.
// The free storage is the account's, so another bucket would share it
export const STORAGE_LIMIT_BYTES = 10 * 1000 ** 3;

// An unused upload this young may sit in a form that's still open and
// unsaved, so cleaning up leaves it alone
export const UNSAVED_GRACE_MS = 24 * 60 * 60 * 1000;

const UNITS = ["bytes", "KB", "MB", "GB"] as const;

/** A size as people read it, in decimal units like the limit: "2.4 MB". */
export const formatBytes = (bytes: number) => {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  // Whole bytes and kilobytes, one decimal from megabytes up
  const digits = unit < 2 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
};
