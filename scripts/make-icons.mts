/**
 * Makes the favicon and app icons from one headshot. Swap the photo for a new
 * one and run it again:
 *
 *   pnpm run icons
 *
 * The photo is cropped to a square from its center, so frame the face there.
 * Tabs and the manifest get it as a circle, Apple devices as a square: they
 * round the corners themselves.
 */
import { mkdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const HEADSHOT = path.join(import.meta.dirname, "icons", "headshot.jpg");

const square = (size: number) =>
  sharp(HEADSHOT).resize(size, size, { fit: "cover", position: "centre" });

const circle = async (size: number) => {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}"/></svg>`,
  );
  return square(size)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png({ compressionLevel: 9 });
};

const write = async (image: sharp.Sharp, ...to: string[]) => {
  const file = path.join(ROOT, ...to);
  await mkdir(path.dirname(file), { recursive: true });
  await image.toFile(file);
  console.log(`  ${path.relative(ROOT, file)}`);
};

console.log("Icons:");
// Picked up by Next as <link rel="icon"> and <link rel="apple-touch-icon">.
// A tab shows it at 16 or 32px, so 96 is sharp on any screen and stays small
await write(await circle(96), "src", "app", "icon.png");
await write(square(180).png(), "src", "app", "apple-icon.png");
// For the web manifest, see src/app/manifest.ts
await write(await circle(192), "public", "icons", "icon-192.png");
await write(await circle(512), "public", "icons", "icon-512.png");
await write(square(512).png(), "public", "icons", "icon-maskable-512.png");
