import { readFile } from "node:fs/promises";
import path from "node:path";

const DRAWABLE = ["image/png", "image/jpeg", "image/gif"];

const toDataUri = (type: string, data: Buffer) =>
  `data:${type};base64,${data.toString("base64")}`;

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

export const loadPublicImage = async (file: string) => {
  try {
    const data = await readFile(path.join(process.cwd(), "public", file));
    return toDataUri(/\.jpe?g$/i.test(file) ? "image/jpeg" : "image/png", data);
  } catch {
    return undefined;
  }
};

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

// The OG renderer reads the modern rgb(r g b / a) syntax as black, so CSS for
// it is rewritten to rgba(r, g, b, a) first.
export const legacyColors = (css: string) =>
  css.replace(/rgb\(([\d.]+) ([\d.]+) ([\d.]+) \/ ([\d.]+)\)/g, "rgba($1, $2, $3, $4)");
