"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import * as v from "valibot";
import { mediaPath } from "~/modules/cms/schema/shared";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  type ActionResult,
  discardUnused,
  failed,
  MEDIA_COLUMNS,
  parseArgument,
  removeMedia,
} from "~/modules/cms/utils/shared";
import { MEDIA_BUCKET } from "~/modules/supabase/utils/media";

/**
 * Removes a file that was uploaded in a form and then never saved: the form
 * was cancelled, or another upload took its place. Only a file that no row
 * points at goes, so calling this with a file that's in use does nothing.
 */
export async function discardUpload(path: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parseArgument(mediaPath("Unknown file."), path);
  if (!parsed.success) return parsed.failure;

  return discardUnused(admin.supabase, parsed.output);
}

// ── Clean up ──────────────────────────────────────────────────────────────────

// How many entries storage lists per request
const PAGE = 100;

// An upload this young may sit in a form that's still open and unsaved
const KEEP_NEWER_THAN_MS = 24 * 60 * 60 * 1000;

/** Every file in the bucket with its age, or null when a listing failed. */
const listBucket = async (supabase: SupabaseClient) => {
  const files: { path: string; createdAt: number }[] = [];
  // Folders are found on the way down, starting at the top of the bucket
  const folders = [""];

  for (let folder = folders.pop(); folder !== undefined; folder = folders.pop()) {
    for (let offset = 0; ; offset += PAGE) {
      const { data, error } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(folder, {
          limit: PAGE,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error || !data) {
        console.error(error);
        return null;
      }

      for (const entry of data) {
        const path = folder ? `${folder}/${entry.name}` : entry.name;
        // A folder is an entry without an id
        if (entry.id === null) folders.push(path);
        // Storage keeps a hidden placeholder in folders made by hand
        else if (!entry.name.startsWith(".")) {
          files.push({ path, createdAt: Date.parse(entry.created_at ?? "") });
        }
      }
      if (data.length < PAGE) break;
    }
  }

  return files;
};

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
 * be worked out. Nothing is ever removed on a guess.
 */
const findUnused = async (supabase: SupabaseClient) => {
  const [files, used] = await Promise.all([
    listBucket(supabase),
    readUsedPaths(supabase),
  ]);
  if (!files || !used) return null;

  const oldEnough = Date.now() - KEEP_NEWER_THAN_MS;
  return files
    .filter((file) => !used.has(file.path) && file.createdAt < oldEnough)
    .map((file) => file.path);
};

const SCAN_FAILED = "Couldn't check the media. Nothing was removed.";

/**
 * Lists the files nothing uses: uploads from a closed tab, and what earlier
 * versions left behind. Files from the last day are left alone. Show the
 * count, ask, then pass the paths to removeUnusedMedia.
 */
export async function findUnusedMedia(): Promise<
  ActionResult & { paths?: string[] }
> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const paths = await findUnused(admin.supabase);
  return paths ? { paths } : failed(SCAN_FAILED);
}

const pathsSchema = v.pipe(
  v.array(v.string(), "Unknown files."),
  v.maxLength(5000, "Too many files."),
);

/**
 * Removes files found by findUnusedMedia. The bucket is checked again first
 * and only files that are still unused go, so a file that was saved into a
 * row since the list was made stays.
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
    removed += await removeMedia(supabase, removable.slice(index, index + PAGE));
  }
  return { removed };
}
