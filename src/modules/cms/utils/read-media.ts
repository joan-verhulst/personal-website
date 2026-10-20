import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isTableToCome,
  MEDIA_COLUMNS,
  MISSING_TABLE,
} from "~/modules/cms/utils/shared";
import { mediaUrl } from "~/modules/media/utils/media-url";
import { listMedia } from "~/modules/media/utils/storage";

type MediaTable = (typeof MEDIA_COLUMNS)[number][0];

interface Owner {
  noun: string;
  name?: string;
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
  products: { noun: "Product", name: "name", href: () => "/admin/products" },
  site: { noun: "About", href: () => "/admin/about" },
};

const VIDEO = /\.(mp4|webm)$/i;

const PAGE = 1000;

export interface MediaOwner {
  label: string;
  href: string;
}

export interface MediaFile {
  path: string;
  url: string;
  folder: string;
  size: number;
  createdAt: number;
  kind: "image" | "video";
  name: string;
  width: number;
  height: number;
  hue: number;
  chroma: number;
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
    if (isTableToCome(table, error)) continue;
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
      const uses = owners.get(path) ?? [];
      if (uses.some((use) => use.label === owner.label && use.href === owner.href)) {
        continue;
      }
      owners.set(path, [...uses, owner]);
    }
  }
  return owners;
};

const readDetails = async (supabase: SupabaseClient) => {
  const details = new Map<string, DetailsRow>();
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("media")
      .select("path, name, kind, width, height, hue, chroma")
      .order("path")
      .range(from, from + PAGE - 1);
    if (error) {
      if (MISSING_TABLE.includes(error.code)) {
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
