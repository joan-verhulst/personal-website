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

// Every photo-like image is also stored at these widths, as WebP next to the
// file, made when it's uploaded. The browser picks the one that fits its
// screen, the way it would from Vercel's image optimization, but loads it
// straight from R2: nothing is resized on request, so nothing is ever slow
// the first time. Large views use the file itself. Also next.config.ts's
// deviceSizes, so the widths a page offers are the ones that exist
export const IMAGE_WIDTHS = [640, 1080, 1600] as const;

const SIZED_COPY = /\.w\d+\.webp$/;

/** Whether a path in the bucket is a sized copy, not a file of its own. */
export const isSizedCopy = (path: string) => SIZED_COPY.test(path);

/**
 * Whether a file has sized copies. SVGs scale on their own, a GIF would lose
 * its frames and a video isn't an image. Works on paths and URLs alike.
 */
export const hasSizes = (path: string) =>
  /\.(jpe?g|png|webp|avif)$/i.test(path) && !isSizedCopy(path);

/** A file's copy at one width: photography/abc.jpg → photography/abc.w640.webp. */
export const sizedPath = (path: string, width: number) =>
  `${path.replace(/\.[^./]+$/, "")}.w${width}.webp`;

/** Every sized copy of a file, none for one that has no sizes. */
export const sizedPaths = (path: string) =>
  hasSizes(path) ? IMAGE_WIDTHS.map((width) => sizedPath(path, width)) : [];

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
