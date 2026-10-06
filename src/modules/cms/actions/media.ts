"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import * as v from "valibot";
import { mediaPath } from "~/modules/cms/schema/shared";
import {
  type MediaFile,
  readMediaLibrary,
} from "~/modules/cms/utils/read-media";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  type ActionResult,
  clearMediaUses,
  dbFailed,
  failed,
  MEDIA_COLUMNS,
  type MediaDetails,
  noRoomFor,
  parseArgument,
  published,
  rememberMedia,
  removeMedia,
} from "~/modules/cms/utils/shared";
import { makeImageSizes } from "~/modules/media/utils/image-sizes";
import {
  isMediaType,
  isSizedCopy,
  MAX_MEDIA_BYTES,
  MEDIA_TYPES,
  UNSAVED_GRACE_MS,
} from "~/modules/media/utils/media-types";
import {
  listMedia,
  mediaExists,
  signUpload,
} from "~/modules/media/utils/storage";

// ── Uploads ───────────────────────────────────────────────────────────────────

const uploadSchema = v.object({
  // Uploads for one kind of content share a folder, like "photography"
  folder: v.pipe(v.string(), v.regex(/^[a-z0-9-]{1,40}$/, "Unknown folder.")),
  type: v.pipe(
    v.string(),
    v.check(isMediaType, "Use JPEG, PNG, WebP, GIF, AVIF, SVG, MP4 or WebM."),
  ),
  size: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(1, "That file is empty."),
    v.maxValue(MAX_MEDIA_BYTES, "The limit is 40 MB."),
  ),
});

// The stored name is random, never the original: the bucket is public, so a
// file's name shows in its URL to every visitor
const randomName = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (byte) =>
    byte.toString(36).padStart(2, "0"),
  ).join("");

/**
 * Picks where a file goes and signs an upload for it, so the browser can send
 * it to the bucket without passing through the server. The URL only takes a
 * file of this type and size, and only for a few minutes. A file that would
 * take the bucket past R2's free storage gets no URL at all.
 */
export async function createUpload(input: {
  folder: string;
  type: string;
  size: number;
}): Promise<
  ActionResult & { path?: string; url?: string; headers?: Record<string, string> }
> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parseArgument(uploadSchema, input);
  if (!parsed.success) return parsed.failure;
  const { folder, type, size } = parsed.output;

  const full = await noRoomFor(size);
  if (full) return failed(full);

  const path = `${folder}/${randomName()}.${MEDIA_TYPES[type]}`;
  const upload = await signUpload(path, type, size);
  if (!upload.data) return dbFailed(upload.error, "Couldn't prepare the upload.");

  return { path, ...upload.data };
}

const detailsSchema = v.object({
  path: mediaPath("Unknown file."),
  name: v.pipe(v.string(), v.trim(), v.maxLength(200)),
  kind: v.picklist(["image", "video"], "Unknown kind of file."),
  width: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)),
  height: v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(100_000)),
  hue: v.pipe(v.number(), v.minValue(0), v.maxValue(360)),
  chroma: v.pipe(v.number(), v.minValue(0), v.maxValue(1)),
});

/**
 * The last step of an upload, once the browser has put the file in the
 * bucket. Makes its sized copies, which the site shows instead of the file
 * itself, and remembers what the upload button measured: the name it had,
 * its size and its color. The picker fills a form with those later, like the
 * upload did.
 *
 * Without its copies the file can't be used, so it's removed again and the
 * upload fails. Only a file that's really in the bucket gets anywhere.
 */
export async function finishUpload(
  details: MediaDetails,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsed = parseArgument(detailsSchema, details);
  if (!parsed.success) return parsed.failure;
  const { path } = parsed.output;

  const exists = await mediaExists(path);
  if (!exists) return failed("That file isn't in the bucket.");

  const copy = await makeImageSizes(path);
  if (copy.error) {
    await removeMedia(supabase, [path]);
    return dbFailed(copy.error, "Couldn't prepare the image. Try again.");
  }

  await rememberMedia(supabase, parsed.output);
  return {};
}

// ── Library ───────────────────────────────────────────────────────────────────

/** Every file in Media with its details and what uses it, for the picker. */
export async function listMediaLibrary(): Promise<
  ActionResult & { files?: MediaFile[]; hasDetails?: boolean }
> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  try {
    return await readMediaLibrary(admin.supabase);
  } catch (error) {
    return dbFailed(error, "Couldn't read Media. Try again.");
  }
}

/**
 * Deletes a file from Media, also one that's in use. What showed it keeps its
 * place without the file: the site leaves a photo, artwork, record or item
 * out until another file is picked, and the About page goes without a photo.
 */
export async function deleteMediaFile(path: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsed = parseArgument(mediaPath("Unknown file."), path);
  if (!parsed.success) return parsed.failure;

  // Everything that shows the file lets go of it first, so the site never
  // points at a file that's gone
  const cleared = await clearMediaUses(supabase, parsed.output);
  if (cleared) return failed(cleared);

  const removed = await removeMedia(supabase, [parsed.output]);
  // The site may have changed already, so it hears about it either way
  const result = published();
  return removed.length
    ? result
    : failed("Nothing uses the file anymore, but it couldn't be deleted. Try again.");
}

// ── Clean up ──────────────────────────────────────────────────────────────────

// How many files are removed per round
const PAGE = 100;

/** Every path a row points at, or null when a table couldn't be read whole. */
const readUsedPaths = async (supabase: SupabaseClient) => {
  const reads = await Promise.all(
    MEDIA_COLUMNS.map(([table, column]) =>
      supabase.from(table).select(column, { count: "exact" }),
    ),
  );

  const used = new Set<string>();
  for (const { data, error, count } of reads) {
    // The API cuts a long read off at its row limit without saying so. A
    // short list here would mark media that's live as unused
    if (error || !data || count === null || count > data.length) {
      console.error("Couldn't read the media in use", error);
      return null;
    }
    for (const row of data as unknown as Record<string, string | null>[]) {
      for (const path of Object.values(row)) {
        if (path) used.add(path);
      }
    }
  }
  return used;
};

/**
 * The files in the bucket that no row points at, or null when that couldn't
 * be worked out. Nothing is ever removed on a guess. Files from the last day
 * are left alone: a form that's still open may be about to save one.
 */
const findUnused = async (supabase: SupabaseClient) => {
  const [files, used] = await Promise.all([
    listMedia(),
    readUsedPaths(supabase),
  ]);
  if (!files || !used) return null;

  // A sized copy belongs to its file and goes along with it
  const oldEnough = Date.now() - UNSAVED_GRACE_MS;
  return files
    .filter(
      (file) =>
        !isSizedCopy(file.path) &&
        !used.has(file.path) &&
        file.createdAt < oldEnough,
    )
    .map((file) => file.path);
};

const SCAN_FAILED = "Couldn't check the media. Nothing was removed.";

const pathsSchema = v.pipe(
  v.array(v.string(), "Unknown files."),
  v.maxLength(5000, "Too many files."),
);

/**
 * Removes the unused files the Media page listed. The bucket is checked again
 * first and only files that are still unused go, so a file that was saved
 * into a row since the page loaded stays.
 */
export async function removeUnusedMedia(
  paths: string[],
): Promise<ActionResult & { removed?: number }> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsed = parseArgument(pathsSchema, paths);
  if (!parsed.success) return parsed.failure;

  const unused = await findUnused(supabase);
  if (!unused) return failed(SCAN_FAILED);
  const asked = new Set(parsed.output);
  const removable = unused.filter((path) => asked.has(path));

  let removed = 0;
  for (let index = 0; index < removable.length; index += PAGE) {
    const batch = removable.slice(index, index + PAGE);
    removed += (await removeMedia(supabase, batch)).length;
  }
  return { removed };
}
