import { createUpload, saveMediaDetails } from "~/modules/cms/actions/media";
import { measureColor } from "~/modules/content/utils/measure-color";
import {
  isMediaType,
  MAX_MEDIA_BYTES,
} from "~/modules/media/utils/media-types";
import { mediaUrl } from "~/modules/media/utils/media-url";

export interface UploadedMedia {
  path: string;
  url: string;
  type: "image" | "video";
  name: string;
  width: number;
  height: number;
  hue: number;
  chroma: number;
}

interface Options {
  maxSize?: number;
}

const KEEP_ORIGINAL_BYTES = 1.5e6;
const JPEG_QUALITY = 0.85;

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
const imageSize = (file: Blob) =>
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

const pixels = (value: string | null) => {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)(?:px)?$/);
  return match ? Number(match[1]) : 0;
};

const isSize = (width: number, height: number) => width > 0 && height > 0;

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";
const XLINK_NAMESPACE = "http://www.w3.org/1999/xlink";

const withNamespaces = (text: string) =>
  text.replace(/<svg\b[^>]*>/, (tag) => {
    let fixed = tag;
    if (!/\sxmlns\s*=/.test(fixed)) {
      fixed = fixed.replace(/^<svg\b/, `<svg xmlns="${SVG_NAMESPACE}"`);
    }
    if (/\bxlink:/.test(text) && !/\sxmlns:xlink\s*=/.test(fixed)) {
      fixed = fixed.replace(/^<svg\b/, `<svg xmlns:xlink="${XLINK_NAMESPACE}"`);
    }
    return fixed;
  });

const svgSize = async (file: Blob) => {
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
  if (!isSize(width, height)) {
    width = 300;
    height = 150;
  }

  const scale = Math.max(1, 1000 / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const prepareSvg = async (file: File) => {
  const blob = new Blob([withNamespaces(await file.text())], {
    type: "image/svg+xml",
  });
  return { blob, type: blob.type, ...(await svgSize(blob)), hue: 0, chroma: 0 };
};

const hasTransparency = (context: CanvasRenderingContext2D, width: number, height: number) => {
  const { data } = context.getImageData(0, 0, width, height);
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] < 255) return true;
  }
  return false;
};

const prepareImage = async (file: File, options: Options) => {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const { width, height } = bitmap;

  let hue = 0;
  let chroma = 0;
  const colorScale = Math.min(1, 48 / Math.max(width, height));
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(width * colorScale));
  small.height = Math.max(1, Math.round(height * colorScale));
  const smallContext = small.getContext("2d");
  if (smallContext) {
    smallContext.drawImage(bitmap, 0, 0, small.width, small.height);
    ({ hue, chroma } = measureColor(
      smallContext.getImageData(0, 0, small.width, small.height).data,
      4,
    ));
  }

  const maxSize = options.maxSize ?? 2560;
  const scale = Math.min(1, maxSize / Math.max(width, height));
  const keepOriginal =
    file.type === "image/gif" ||
    (scale === 1 &&
      file.size <= KEEP_ORIGINAL_BYTES &&
      isMediaType(file.type));

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
  if (isVideo && !isMediaType(file.type)) throw wrongType(file, file.type);

  const prepared = isVideo
    ? { blob: file as Blob, type: file.type, ...(await videoSize(file)), hue: 0, chroma: 0 }
    : isSvg
      ? await prepareSvg(file)
      : await prepareImage(file, options);

  if (!isMediaType(prepared.type)) throw wrongType(file, prepared.type);
  if (prepared.blob.size > MAX_MEDIA_BYTES) {
    const megabytes = (prepared.blob.size / (1024 * 1024)).toFixed(1);
    throw new Error(`${file.name} is ${megabytes} MB. The limit is 40 MB.`);
  }
  if (!isSize(prepared.width, prepared.height)) {
    throw new Error(`Couldn't read the size of ${file.name}.`);
  }

  const upload = await createUpload({
    folder,
    type: prepared.type,
    size: prepared.blob.size,
  });
  if (upload.error || !upload.path || !upload.url) {
    throw new Error(`Couldn't upload ${file.name}: ${upload.error ?? "no upload URL."}`);
  }
  const { path } = upload;

  let response: Response;
  try {
    response = await fetch(upload.url, {
      method: "PUT",
      body: prepared.blob,
      headers: upload.headers,
    });
  } catch {
    throw new Error(`Couldn't upload ${file.name}. Check your connection and try again.`);
  }
  if (!response.ok) {
    throw new Error(`Couldn't upload ${file.name}: the bucket answered ${response.status}.`);
  }

  const media: UploadedMedia = {
    path,
    url: mediaUrl(path),
    type: isVideo ? "video" : "image",
    name: file.name.replace(/\.[^.]+$/, "").slice(0, 200),
    width: prepared.width,
    height: prepared.height,
    hue: prepared.hue,
    chroma: prepared.chroma,
  };

  saveMediaDetails({
    path,
    name: media.name,
    kind: media.type,
    width: media.width,
    height: media.height,
    hue: media.hue,
    chroma: media.chroma,
  })
    .then((result) => {
      if (result.error) console.error(result.error);
    })
    .catch((error: unknown) => console.error(error));

  return media;
};

export const titleFromFile = (name: string) => {
  const words = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
