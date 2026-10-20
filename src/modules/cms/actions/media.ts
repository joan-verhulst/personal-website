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
  isTableToCome,
  MEDIA_COLUMNS,
  type MediaDetails,
  noRoomFor,
  parseArgument,
  published,
  rememberMedia,
  removeMedia,
} from "~/modules/cms/utils/shared";
import {
  isMediaType,
  MAX_MEDIA_BYTES,
  MEDIA_TYPES,
  UNSAVED_GRACE_MS,
} from "~/modules/media/utils/media-types";
import {
  listMedia,
  mediaExists,
  signUpload,
} from "~/modules/media/utils/storage";

const uploadSchema = v.object({
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

export async function saveMediaDetails(
  details: MediaDetails,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parseArgument(detailsSchema, details);
  if (!parsed.success) return parsed.failure;

  const exists = await mediaExists(parsed.output.path);
  if (!exists) return failed("That file isn't in the bucket.");

  await rememberMedia(admin.supabase, parsed.output);
  return {};
}

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
  const result = published();
  return removed.length
    ? result
    : failed("Nothing uses the file anymore, but it couldn't be deleted. Try again.");
}

const PAGE = 100;

const readUsedPaths = async (supabase: SupabaseClient) => {
  const reads = await Promise.all(
    MEDIA_COLUMNS.map(async ([table, column]) => ({
      table,
      ...(await supabase.from(table).select(column, { count: "exact" })),
    })),
  );

  const used = new Set<string>();
  for (const { table, data, error, count } of reads) {
    if (isTableToCome(table, error)) continue;
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

const findUnused = async (supabase: SupabaseClient) => {
  const [files, used] = await Promise.all([
    listMedia(),
    readUsedPaths(supabase),
  ]);
  if (!files || !used) return null;

  const oldEnough = Date.now() - UNSAVED_GRACE_MS;
  return files
    .filter((file) => !used.has(file.path) && file.createdAt < oldEnough)
    .map((file) => file.path);
};

const SCAN_FAILED = "Couldn't check the media. Nothing was removed.";

const pathsSchema = v.pipe(
  v.array(v.string(), "Unknown files."),
  v.maxLength(5000, "Too many files."),
);

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
