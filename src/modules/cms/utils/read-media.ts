import type { SupabaseClient } from "@supabase/supabase-js";
import { MEDIA_COLUMNS } from "~/modules/cms/utils/shared";
import { mediaUrl } from "~/modules/media/utils/media-url";
import { listMedia } from "~/modules/media/utils/storage";

type MediaTable = (typeof MEDIA_COLUMNS)[number][0];

interface Owner {
  noun: string;
  /** The column with the row's name, when it has one. */
  name?: string;
  /** The CMS page that edits the row, as a canonical path. */
  href: (id: string) => string;
}

// What to call a row that uses a file, and where it's edited. Keyed by the
// tables in MEDIA_COLUMNS, so a new column with media can't be left out
const OWNERS: Record<MediaTable, Owner> = {
  wall_items: {
    noun: "UI/UX item",
    name: "title",
    href: (id) => `/admin/ui-ux/items/${id}`,
  },
  wall_tags: { noun: "Tag", name: "label", href: () => "/admin/ui-ux/tags" },
  photos: { noun: "Photo", name: "title", href: () => "/admin/photography" },
  artworks: { noun: "Artwork", name: "title", href: () => "/admin/digital-art" },
  records: { noun: "Record", name: "title", href: () => "/admin/on-rotation" },
  site: { noun: "About", href: () => "/admin/about" },
};

const VIDEO = /\.(mp4|webm)$/i;

// PostgREST answers a table it doesn't know with this, here before
// 0006_media_library.sql has been run. Postgres' own code is the fallback
const MISSING_TABLES = new Set(["PGRST205", "42P01"]);

// How many rows PostgREST hands out per request
const PAGE = 1000;

export interface MediaOwner {
  /** Like "Photo · Sunset". */
  label: string;
  /** Where it's edited, as a canonical admin path. */
  href: string;
}

export interface MediaFile {
  path: string;
  url: string;
  /** The first part of the path, like "photography". Empty at the top. */
  folder: string;
  /** In bytes. */
  size: number;
  createdAt: number;
  kind: "image" | "video";
  /** The name it was uploaded with, or else one taken from what uses it. */
  name: string;
  /** As measured on upload. Zero when Media doesn't know them. */
  width: number;
  height: number;
  hue: number;
  chroma: number;
  /** Every row that shows the file. Empty when unused. */
  usedBy: MediaOwner[];
}

interface DetailsRow {
  path: string;
  name: string;
  kind: "image" | "video";
  width: number;
  height: number;
  hue: number;
  chroma: number;
}

/**
 * Which rows show each file, by path. Throws when a table can't be read
 * whole: a short list would mark media that's live as unused.
 */
const readOwners = async (supabase: SupabaseClient) => {
  const reads = await Promise.all(
    MEDIA_COLUMNS.map(async ([table, column]) => {
      const { name } = OWNERS[table];
      const result = await supabase
        .from(table)
        .select(["id", column, name].filter(Boolean).join(", "), {
          count: "exact",
        });
      return { table, column, ...result };
    }),
  );

  const owners = new Map<string, MediaOwner[]>();
  for (const { table, column, data, error, count } of reads) {
    // The API cuts a long read off at its row limit without saying so
    if (error || !data || count === null || count > data.length) {
      throw new Error(`Couldn't read the media ${table} uses`);
    }
    const { noun, name, href } = OWNERS[table];
    for (const row of data as unknown as Record<string, string | null>[]) {
      const path = row[column];
      if (!path) continue;
      const owner = {
        label: name && row[name] ? `${noun} · ${row[name]}` : noun,
        href: href(String(row.id)),
      };
      owners.set(path, [...(owners.get(path) ?? []), owner]);
    }
  }
  return owners;
};

/**
 * What the media table knows about each file, by path, and whether the
 * table is there at all. Before 0006_media_library.sql it isn't, and files
 * only have what the bucket says about them.
 */
const readDetails = async (supabase: SupabaseClient) => {
  const details = new Map<string, DetailsRow>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("media")
      .select("path, name, kind, width, height, hue, chroma")
      .order("path")
      .range(from, from + PAGE - 1);
    if (error) {
      if (MISSING_TABLES.has(error.code)) {
        return { details, hasTable: false };
      }
      throw new Error(`Couldn't read the media details: ${error.message}`);
    }
    for (const row of data as DetailsRow[]) details.set(row.path, row);
    if (data.length < PAGE) return { details, hasTable: true };
  }
};

const fileName = (path: string) =>
  (path.split("/").pop() ?? path).replace(/\.[^.]+$/, "");

/**
 * Every file in the media bucket, with its details and what shows it. Throws
 * when the bucket or a table can't be read, so the page says so instead of
 * showing half a library. hasDetails is false until the media table exists.
 */
export const readMediaLibrary = async (supabase: SupabaseClient) => {
  const [files, owners, { details, hasTable }] = await Promise.all([
    listMedia(),
    readOwners(supabase),
    readDetails(supabase),
  ]);
  if (!files) throw new Error("Couldn't list the media bucket");

  const library = files.map((file): MediaFile => {
    const known = details.get(file.path);
    const usedBy = owners.get(file.path) ?? [];
    return {
      path: file.path,
      url: mediaUrl(file.path),
      folder: file.path.includes("/") ? file.path.split("/")[0] : "",
      size: file.size,
      createdAt: file.createdAt,
      kind: known?.kind ?? (VIDEO.test(file.path) ? "video" : "image"),
      name:
        known?.name ||
        usedBy[0]?.label.split(" · ")[1] ||
        fileName(file.path),
      width: known?.width ?? 0,
      height: known?.height ?? 0,
      hue: known?.hue ?? 0,
      chroma: known?.chroma ?? 0,
      usedBy,
    };
  });

  return { files: library, hasDetails: hasTable };
};
