"use server";

import * as v from "valibot";
import {
  coverSchema,
  type RecordValues,
  recordSchema,
} from "~/modules/cms/components/records/schema";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  type ActionResult,
  dbFailed,
  failed,
  idSchema,
  idsSchema,
  insertWithId,
  missingMedia,
  nextSortOrder,
  noRoomFor,
  parse,
  parseArgument,
  published,
  rememberMedia,
  removeMedia,
  saveOrder,
  updateOne,
} from "~/modules/cms/utils/shared";
import { slugify } from "~/modules/cms/utils/slugify";
import { makeImageSizes } from "~/modules/media/utils/image-sizes";
import { measureImage } from "~/modules/media/utils/measure-image";
import { putMedia } from "~/modules/media/utils/storage";

// Where covers live in the media bucket
const FOLDER = "on-rotation";

export interface ItunesSong {
  appleId: number;
  song: string;
  album: string;
  artist: string;
  // 600px artwork
  artwork: string;
}

interface SearchResult {
  trackId: number;
  trackName: string;
  collectionName?: unknown;
  artistName: string;
  artworkUrl100?: unknown;
}

const termSchema = v.pipe(v.string(), v.trim(), v.nonEmpty(), v.maxLength(200));

const APPLE_DOWN = "Couldn't reach Apple Music. Try again.";

// Apple's answer is checked like any other input: only complete songs count
const isSearchResult = (result: unknown): result is SearchResult => {
  if (typeof result !== "object" || result === null) return false;
  const song = result as Record<string, unknown>;
  return (
    typeof song.trackId === "number" &&
    typeof song.trackName === "string" &&
    typeof song.artistName === "string"
  );
};

/**
 * Songs on Apple Music matching a search, to pick a favorite from. A search
 * that couldn't be done is an error, so it doesn't pass for "no songs found".
 */
export async function searchItunes(
  term: string,
): Promise<ActionResult & { songs?: ItunesSong[] }> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = v.safeParse(termSchema, term);
  if (!parsed.success) return { songs: [] };

  let body: unknown;
  try {
    const response = await fetch(
      `https://itunes.apple.com/search?${new URLSearchParams({
        term: parsed.output,
        entity: "song",
        limit: "12",
      })}`,
      { cache: "no-store", signal: AbortSignal.timeout(8000) },
    );
    if (!response.ok) return failed(APPLE_DOWN);
    body = await response.json();
  } catch (error) {
    console.error(error);
    return failed(APPLE_DOWN);
  }

  const results = (body as { results?: unknown } | null)?.results;
  if (!Array.isArray(results)) return failed(APPLE_DOWN);

  return {
    songs: results.filter(isSearchResult).map((result) => ({
      appleId: result.trackId,
      song: result.trackName,
      album:
        typeof result.collectionName === "string"
          ? result.collectionName
          : result.trackName,
      artist: result.artistName,
      artwork:
        typeof result.artworkUrl100 === "string"
          ? result.artworkUrl100.replace("100x100bb", "600x600bb")
          : "",
    })),
  };
}

export type RecordDetails = RecordValues;

// Takes parsed details, which are trimmed already
const detailColumns = (details: v.InferOutput<typeof recordSchema>) => ({
  type: details.type,
  title: details.title,
  artist: details.artist,
  apple_id: details.appleId,
  favorite_title: details.favoriteTitle,
});

const MAX_COVER_BYTES = 5 * 1024 * 1024;

// What Apple's artwork may be, and the extension it's stored under
const COVER_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const NO_ARTWORK = "Couldn't download the artwork.";

/** Adds a record at the end, with Apple's artwork as its cover. */
export async function addRecord(
  details: RecordDetails,
  artworkUrl: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsed = parse(recordSchema, details);
  if (!parsed.success) return parsed.failure;

  // Only ever fetch Apple's own artwork
  let artwork: URL;
  try {
    artwork = new URL(String(artworkUrl));
  } catch {
    return failed("That song has no artwork, pick another result.");
  }
  if (
    artwork.protocol !== "https:" ||
    !artwork.hostname.endsWith(".mzstatic.com")
  ) {
    return failed("That artwork isn't from Apple Music.");
  }

  // Read before anything is stored, so a failure here leaves nothing behind
  const sortOrder = await nextSortOrder(supabase, "records");
  if (sortOrder === null) return failed("Couldn't add the record.");

  let body: ArrayBuffer;
  let contentType: string;
  try {
    const response = await fetch(artwork, {
      cache: "no-store",
      // A redirect could lead away from Apple, so it counts as a failure
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return failed(NO_ARTWORK);

    contentType = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!Object.hasOwn(COVER_TYPES, contentType)) return failed(NO_ARTWORK);
    if (Number(response.headers.get("content-length") ?? 0) > MAX_COVER_BYTES) {
      return failed("That artwork is too large.");
    }

    // The timeout can still fire while the body comes in
    body = await response.arrayBuffer();
  } catch (error) {
    console.error(error);
    return failed(NO_ARTWORK);
  }
  // The header can be missing, so the size is checked again once it's read
  if (body.byteLength > MAX_COVER_BYTES) {
    return failed("That artwork is too large.");
  }

  const full = await noRoomFor(body.byteLength);
  if (full) return failed(full);

  const cover = `${FOLDER}/${slugify(parsed.output.title)}-${Date.now().toString(36)}.${COVER_TYPES[contentType]}`;
  const upload = await putMedia(cover, body, contentType);
  if (upload.error) return dbFailed(upload.error, "Couldn't save the artwork.");
  // The site shows the sized copies, so the cover isn't usable without them
  const copy = await makeImageSizes(cover, body);
  if (copy.error) {
    await removeMedia(supabase, [cover]);
    return dbFailed(copy.error, "Couldn't save the artwork.");
  }

  const result = await insertWithId(
    supabase,
    "records",
    parsed.output.title,
    {
      ...detailColumns(parsed.output),
      cover,
      sort_order: sortOrder,
    },
    "Couldn't add the record.",
  );
  if (result.error) {
    // Fetched for this record alone, so it goes with it
    await removeMedia(supabase, [cover]);
    return failed(result.error);
  }

  // In Media like an upload, with its size and color, so it can be picked
  // elsewhere too. A failure here leaves the record as it is
  try {
    await rememberMedia(supabase, {
      path: cover,
      name: parsed.output.title,
      kind: "image",
      ...(await measureImage(body)),
    });
  } catch (error) {
    console.error(error);
  }

  return published();
}

export async function updateRecord(
  id: string,
  details: RecordDetails,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;
  const parsed = parse(recordSchema, details);
  if (!parsed.success) return parsed.failure;

  const failure = await updateOne(
    admin.supabase,
    "records",
    parsedId.output,
    detailColumns(parsed.output),
    "Couldn't save the record.",
  );
  return failure ?? published();
}

/**
 * Swaps the cover for one from Media: just uploaded or picked there. The old
 * cover stays in Media.
 */
export async function replaceRecordCover(
  id: string,
  cover: string,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;
  const parsed = parseArgument(coverSchema, cover);
  if (!parsed.success) return parsed.failure;

  const missing = await missingMedia(parsed.output);
  if (missing) return failed(missing);

  const failure = await updateOne(
    admin.supabase,
    "records",
    parsedId.output,
    { cover: parsed.output },
    "Couldn't replace the cover.",
  );
  return failure ?? published();
}

export async function reorderRecords(ids: string[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parseArgument(idsSchema, ids);
  if (!parsed.success) return parsed.failure;

  const error = await saveOrder(admin.supabase, "records", parsed.output);
  return error ? dbFailed(error, "Couldn't save the order.") : published();
}

/** Deletes a record. Its cover stays in Media. */
export async function deleteRecord(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

  const { error } = await admin.supabase
    .from("records")
    .delete()
    .eq("id", parsedId.output);
  if (error) return dbFailed(error, "Couldn't delete the record.");

  return published();
}
