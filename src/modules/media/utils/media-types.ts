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

export const LIBRARY_FOLDER = "library";

export const isMediaType = (type: string) => Object.hasOwn(MEDIA_TYPES, type);

// R2 stores 10 GB free per month
export const STORAGE_LIMIT_BYTES = 10 * 1000 ** 3;

export const UNSAVED_GRACE_MS = 24 * 60 * 60 * 1000;

const UNITS = ["bytes", "KB", "MB", "GB"] as const;

export const formatBytes = (bytes: number) => {
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < UNITS.length - 1) {
    value /= 1000;
    unit++;
  }
  const digits = unit < 2 || value >= 100 ? 0 : 1;
  return `${value.toFixed(digits)} ${UNITS[unit]}`;
};
