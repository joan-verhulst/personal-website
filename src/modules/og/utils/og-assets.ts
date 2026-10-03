import { readFile } from "node:fs/promises";
import path from "node:path";

// What the OG renderer can draw. Anything else, a video or a WebP, is left out
const DRAWABLE = ["image/png", "image/jpeg", "image/gif"];

const toDataUri = (type: string, data: Buffer) =>
  `data:${type};base64,${data.toString("base64")}`;

/**
 * An image as a data URI, so the renderer doesn't fetch it again. A missing
 * image leaves its tile empty instead of failing the build.
 */
export const loadImage = async (url: string | undefined) => {
  if (!url) return undefined;
  try {
    const response = await fetch(url);
    const type = response.headers.get("content-type")?.split(";")[0] ?? "";
    if (!response.ok || !DRAWABLE.includes(type)) return undefined;
    return toDataUri(type, Buffer.from(await response.arrayBuffer()));
  } catch {
    return undefined;
  }
};

/** An image from public/, as a data URI. */
export const loadPublicImage = async (file: string) => {
  try {
    const data = await readFile(path.join(process.cwd(), "public", file));
    return toDataUri("image/png", data);
  } catch {
    return undefined;
  }
};

/**
 * The site's typeface, cut down to the characters on the card. The renderer
 * needs a TrueType file, which Google Fonts serves to clients it doesn't
 * know. Without it the card falls back to the renderer's own font.
 */
export const loadFont = async (text: string) => {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=Google+Sans+Flex&text=${encodeURIComponent(text)}`,
    ).then((response) => response.text());
    const url = css.match(
      /src: url\((.+?)\) format\('(opentype|truetype)'\)/,
    )?.[1];
    if (!url) return undefined;
    const response = await fetch(url);
    return response.ok ? await response.arrayBuffer() : undefined;
  } catch {
    return undefined;
  }
};
