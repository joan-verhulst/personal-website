import { measureColor } from "~/modules/content/utils/measure-color";
import { createBrowserSupabase } from "~/modules/supabase/utils/browser-client";
import { MEDIA_BUCKET, mediaUrl } from "~/modules/supabase/utils/media";

export interface UploadedMedia {
  // Path in the media bucket, what the database stores
  path: string;
  url: string;
  type: "image" | "video";
  width: number;
  height: number;
  hue: number;
  chroma: number;
}

interface Options {
  // Longest side for images; bigger ones are scaled down before uploading
  maxSize?: number;
  // Read the photo's hue and colorfulness, for the photo table
  measureColor?: boolean;
}

// Below this, an image that's small enough is uploaded untouched
const KEEP_ORIGINAL_BYTES = 1.5e6;
const JPEG_QUALITY = 0.85;

// What the site can show, with the extension each is stored under. The bucket
// enforces the same list and size once supabase/migrations/0003_cms_hardening.sql
// has been run; checking here gives a clear message before anything goes up
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
const MAX_BYTES = 40 * 1024 * 1024;

const isAllowed = (type: string) => Object.hasOwn(ALLOWED_TYPES, type);

// The stored name is random, never the original: the bucket is public, so a
// file's name shows in its URL to every visitor
const randomName = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    byte.toString(36).padStart(2, "0"),
  ).join("");

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode the image."))),
      type,
      quality,
    ),
  );

const videoSize = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      reject(new Error("Couldn't read the video."));
      URL.revokeObjectURL(url);
    };
    video.src = url;
  });

/** The size the browser gives an image, or 0 by 0 when it can't tell. */
const imageSize = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({ width: 0, height: 0 });
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });

// "120", "120.5" or "120px": a size that says how many pixels it is. Anything
// relative, like 100% or 2em, counts as no size
const pixels = (value: string | null) => {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  return match ? Number(match[1]) : 0;
};

const isSize = (width: number, height: number) => width > 0 && height > 0;

/**
 * The size of an SVG, read from the file itself: its width and height, or
 * else its viewBox. Browsers disagree on the size of an SVG that only has a
 * viewBox, so asking them is the last resort.
 */
const svgSize = async (file: File) => {
  const root = new DOMParser().parseFromString(
    await file.text(),
    "image/svg+xml",
  ).documentElement;

  let width = pixels(root.getAttribute("width"));
  let height = pixels(root.getAttribute("height"));
  if (!isSize(width, height)) {
    const box = (root.getAttribute("viewBox") ?? "")
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    width = box.length === 4 ? box[2] : 0;
    height = box.length === 4 ? box[3] : 0;
  }
  if (!isSize(width, height)) ({ width, height } = await imageSize(file));
  // Without any size at all, an SVG is drawn 300 by 150
  if (!isSize(width, height)) {
    width = 300;
    height = 150;
  }

  // A vector has no pixels of its own, and a viewBox can be tiny or
  // fractional. Scaled up, rounding to whole pixels keeps its proportions
  const scale = Math.max(1, 1000 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const hasTransparency = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
};

/** Scales a photo down to the size the site shows at most, keeping its format. */
const prepareImage = async (file: File, options: Options) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = bitmap;

  let hue = 0;
  let chroma = 0;
  if (options.measureColor) {
    // 48px is plenty for an average, like the import script
    const scale = Math.min(1, 48 / Math.max(width, height));
    const small = document.createElement("canvas");
    small.width = Math.max(1, Math.round(width * scale));
    small.height = Math.max(1, Math.round(height * scale));
    const context = small.getContext("2d");
    if (context) {
      context.drawImage(bitmap, 0, 0, small.width, small.height);
      ({ hue, chroma } = measureColor(
        context.getImageData(0, 0, small.width, small.height).data,
        4,
      ));
    }
  }

  const maxSize = options.maxSize ?? 2560;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  // Animated GIFs would lose their frames on a canvas. A format the site
  // doesn't take, like BMP, is redrawn as one it does
  const keepOriginal =
    file.type === "image/gif" ||
    (scale === 1 &&
      file.size <= KEEP_ORIGINAL_BYTES &&
      isAllowed(file.type));

  if (keepOriginal) {
    bitmap.close();
    return { blob: file as Blob, type: file.type, width, height, hue, chroma };
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Couldn't prepare the image.");
  context.imageSmoothingQuality = "high";
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  // Cut-outs keep their transparency, everything else becomes a JPEG
  const keepsAlpha =
    file.type !== "image/jpeg" &&
    hasTransparency(context, canvas.width, canvas.height);
  const type = keepsAlpha ? "image/png" : "image/jpeg";
  const blob = await toBlob(canvas, type, keepsAlpha ? undefined : JPEG_QUALITY);

  return { blob, type, width: canvas.width, height: canvas.height, hue, chroma };
};

const wrongType = (file: File, type: string) =>
  new Error(
    `${file.name} is a ${type} file. Use JPEG, PNG, WebP, GIF, AVIF, SVG, MP4 or WebM.`,
  );

/**
 * Uploads a file from the browser straight to the media bucket, so large
 * files never pass through the server. Images are scaled down first.
 */
export const uploadMedia = async (
  file: File,
  folder: string,
  options: Options = {},
): Promise<UploadedMedia> => {
  const isVideo = file.type.startsWith("video/");
  const isSvg = file.type === "image/svg+xml";

  if (!isVideo && !file.type.startsWith("image/")) {
    throw new Error(`${file.name} isn't an image or a video.`);
  }
  // A video goes up as it is, so a .mov can be turned away before it's read
  if (isVideo && !isAllowed(file.type)) throw wrongType(file, file.type);

  const prepared = isVideo
    ? { blob: file as Blob, type: file.type, ...(await videoSize(file)), hue: 0, chroma: 0 }
    : isSvg
      ? { blob: file as Blob, type: file.type, ...(await svgSize(file)), hue: 0, chroma: 0 }
      : await prepareImage(file, options);

  // Checked on what goes up, not on the file that was picked: a large photo
  // has been scaled down by now
  if (!isAllowed(prepared.type)) throw wrongType(file, prepared.type);
  if (prepared.blob.size > MAX_BYTES) {
    const megabytes = (prepared.blob.size / (1024 * 1024)).toFixed(1);
    throw new Error(`${file.name} is ${megabytes} MB. The limit is 40 MB.`);
  }
  // The site divides by these. A video without a picture has none
  if (!isSize(prepared.width, prepared.height)) {
    throw new Error(`Couldn't read the size of ${file.name}.`);
  }

  const path = `${folder}/${randomName()}.${ALLOWED_TYPES[prepared.type]}`;

  const { error } = await createBrowserSupabase()
    .storage.from(MEDIA_BUCKET)
    .upload(path, prepared.blob, {
      contentType: prepared.type,
      cacheControl: "31536000",
    });
  if (error) throw new Error(`Couldn't upload ${file.name}: ${error.message}`);

  return {
    path,
    url: mediaUrl(path),
    type: isVideo ? "video" : "image",
    width: prepared.width,
    height: prepared.height,
    hue: prepared.hue,
    chroma: prepared.chroma,
  };
};

/** Turns a file name into a title: "img-0027-pano edit.jpg" → "Img 0027 pano edit". */
export const titleFromFile = (name: string) => {
  const words = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
