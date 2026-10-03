/**
 * Copies the content that used to be hard-coded into Supabase: uploads every
 * image and video from public/ to the media bucket and fills the tables.
 * Run once, after supabase/migrations/0001_cms.sql:
 *
 *   node --env-file=.env.local scripts/import-content.mts
 *
 * It refuses to run over content that's already there, since that would undo
 * CMS edits. Pass --force to import anyway.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { measureColor } from "../src/modules/content/utils/measure-color.ts";
import type { WallItem } from "../src/modules/content/types.ts";
import { digitalArtProjects } from "./content/digital-art.ts";
import { onRotation } from "./content/on-rotation.ts";
import { photographyProjects } from "./content/photography.ts";
import { about, contact, covers } from "./content/site.ts";
import { experiments, uiUxHighlights, uiUxWall } from "./content/ui-ux.ts";

const BUCKET = "media";
const PUBLIC_DIR = path.join(import.meta.dirname, "..", "public");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.",
  );
  process.exit(1);
}

// The secret key skips row level security, it only ever runs here
const supabase = createClient(url, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fail = (what: string, error: { message: string } | null) => {
  if (!error) return;
  console.error(`✗ ${what}: ${error.message}`);
  process.exit(1);
};

// ── Guard ─────────────────────────────────────────────────────────────────────

const { count, error: countError } = await supabase
  .from("photos")
  .select("id", { count: "exact", head: true });
fail("Reading photos", countError);

if (count && !process.argv.includes("--force")) {
  console.error(
    `There are already ${count} photos in Supabase. Importing again would overwrite CMS edits; pass --force if that's what you want.`,
  );
  process.exit(1);
}

// ── Media ─────────────────────────────────────────────────────────────────────

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const uploaded = new Map<string, string>();

/**
 * Uploads a file from public/ and returns its path in the bucket, keeping the
 * folders: /assets/images/work/a.jpg becomes work/a.jpg.
 */
const upload = async (publicPath: string) => {
  const known = uploaded.get(publicPath);
  if (known) return known;

  const storagePath = publicPath.replace(/^\/assets\/(images\/)?/, "");
  const extension = path.extname(publicPath).toLowerCase();
  const file = await readFile(path.join(PUBLIC_DIR, publicPath));

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: CONTENT_TYPES[extension] ?? "application/octet-stream",
      cacheControl: "31536000",
      upsert: true,
    });
  fail(`Uploading ${publicPath}`, error);

  console.log(`  ↑ ${storagePath} (${(file.length / 1e6).toFixed(1)} MB)`);
  uploaded.set(publicPath, storagePath);
  return storagePath;
};

// Size as displayed: EXIF orientations 5 to 8 are rotated a quarter turn
const measureSize = async (publicPath: string) => {
  const file = path.join(PUBLIC_DIR, publicPath);
  const { width = 1, height = 1, orientation } = await sharp(file).metadata();
  const isQuarterTurned = orientation !== undefined && orientation >= 5;
  return isQuarterTurned
    ? { width: height, height: width }
    : { width, height };
};

const measureHue = async (publicPath: string) => {
  const { data, info } = await sharp(path.join(PUBLIC_DIR, publicPath))
    .rotate()
    .resize(48, 48, { fit: "inside" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return measureColor(data, info.channels);
};

// ── Site ──────────────────────────────────────────────────────────────────────

console.log("About and contact");
fail(
  "Saving site",
  (
    await supabase.from("site").upsert({
      id: 1,
      about_headline: about.headline,
      about_intro: about.intro,
      about_image: await upload(about.image),
      currently_name: about.currently.name,
      currently_since: about.currently.since,
      currently_blurb: about.currently.blurb,
      currently_url: about.currently.url,
      instagram_url: contact.instagram,
      linkedin_url: contact.linkedin,
      email: contact.email,
    })
  ).error,
);

// ── Photography ───────────────────────────────────────────────────────────────

console.log(`Photography (${photographyProjects.length})`);
const photoRows = [];
for (const [index, photo] of photographyProjects.entries()) {
  photoRows.push({
    id: photo.id,
    title: photo.title,
    description: photo.description ?? null,
    image: await upload(photo.image),
    ...(await measureSize(photo.image)),
    ...(await measureHue(photo.image)),
    sort_order: index,
    is_cover: photo.image === covers.photography,
  });
}
fail("Saving photos", (await supabase.from("photos").upsert(photoRows)).error);

// ── Digital art ───────────────────────────────────────────────────────────────

console.log(`Digital art (${digitalArtProjects.length})`);
const artworkRows = [];
for (const [index, artwork] of digitalArtProjects.entries()) {
  artworkRows.push({
    id: artwork.id,
    title: artwork.title,
    description: artwork.description ?? null,
    image: await upload(artwork.image),
    ...(await measureSize(artwork.image)),
    sort_order: index,
    is_cover: artwork.image === covers.digitalArt,
  });
}
fail(
  "Saving artworks",
  (await supabase.from("artworks").upsert(artworkRows)).error,
);

// ── On rotation ───────────────────────────────────────────────────────────────

console.log(`On rotation (${onRotation.length})`);
const recordRows = [];
for (const [index, record] of onRotation.entries()) {
  recordRows.push({
    id: record.id,
    type: record.type,
    title: record.title,
    artist: record.artist,
    cover: await upload(record.cover),
    apple_id: record.favoriteSong.appleId,
    favorite_title: record.favoriteSong.title,
    sort_order: index,
  });
}
fail("Saving records", (await supabase.from("records").upsert(recordRows)).error);

// ── UI/UX ─────────────────────────────────────────────────────────────────────

const allItems = new Map<string, WallItem>();
for (const item of [
  ...uiUxWall.flatMap((block) => block.items),
  ...experiments,
  ...uiUxHighlights,
]) {
  allItems.set(item.id, item);
}

// Tags are objects in the old data, keyed by label here
const tagId = (label: string) =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

console.log(`UI/UX (${allItems.size} items)`);
const tagRows = new Map<string, object>();
for (const { tag } of allItems.values()) {
  const id = tagId(tag.label);
  if (tagRows.has(id)) continue;
  tagRows.set(id, {
    id,
    label: tag.label,
    color: tag.color,
    logo: tag.logo ? await upload(tag.logo) : null,
  });
}
fail(
  "Saving tags",
  (await supabase.from("wall_tags").upsert([...tagRows.values()])).error,
);

const itemRows = [];
for (const item of allItems.values()) {
  itemRows.push({
    id: item.id,
    title: item.title,
    tag_id: tagId(item.tag.label),
    media_type: item.media.type,
    media: await upload(item.media.src),
    width: item.media.width,
    height: item.media.height,
    background: item.background,
    bare: item.bare ?? false,
    object_position: item.position ?? null,
    zoom: item.zoom ?? null,
    description: item.description ?? null,
    link_label: item.link?.label ?? null,
    link_href: item.link?.href ?? null,
  });
}
fail(
  "Saving wall items",
  (await supabase.from("wall_items").upsert(itemRows)).error,
);

// Blocks have generated ids, so they're replaced as a whole
fail(
  "Clearing wall blocks",
  (await supabase.from("wall_blocks").delete().gte("sort_order", 0)).error,
);
fail(
  "Saving wall blocks",
  (
    await supabase.from("wall_blocks").insert(
      uiUxWall.map((block, index) => ({
        layout: block.layout,
        items: block.items.map((item) => item.id),
        sort_order: index,
      })),
    )
  ).error,
);
fail(
  "Saving wall lists",
  (
    await supabase.from("wall_lists").upsert([
      { id: "experiments", items: experiments.map((item) => item.id) },
      { id: "highlights", items: uiUxHighlights.map((item) => item.id) },
    ])
  ).error,
);

console.log(`\n✓ Imported, ${uploaded.size} files uploaded`);
