import { cache } from "react";
import {
  type Content,
  WALL_SLOTS,
  type WallBlock,
  type WallItem,
  type WallTag,
} from "~/modules/content/types";
import type {
  ArtworkRow,
  PhotoRow,
  RecordRow,
  SiteRow,
  WallBlockRow,
  WallItemRow,
  WallListRow,
  WallTagRow,
} from "~/modules/content/utils/rows";
import { mediaUrl, optionalMediaUrl } from "~/modules/supabase/utils/media";
import { createPublicClient } from "~/modules/supabase/utils/public-client";

// A failed read should fail the build or request loudly, not render a site
// with holes in it
const rowsOf = <Row>(
  table: string,
  result: {
    data: unknown;
    error: { message: string } | null;
    count: number | null;
  },
): Row[] => {
  if (result.error) {
    throw new Error(`Couldn't read ${table}: ${result.error.message}`);
  }
  const rows = (result.data ?? []) as Row[];
  // The API cuts a long read off at its row limit without saying so
  if (result.count !== null && result.count > rows.length) {
    throw new Error(
      `Couldn't read ${table}: got ${rows.length} of ${result.count} rows, the API row limit cut the read short`,
    );
  }
  return rows;
};

/**
 * A width and height that are safe to divide by. A row saved without a size,
 * which older uploads of an SVG were, is shown at 4:3 instead of breaking
 * the layout around it.
 */
const sizeOf = (row: { width: number; height: number }) =>
  row.width >= 1 && row.height >= 1
    ? { width: row.width, height: row.height }
    : { width: 4, height: 3 };

const toWallItem = (
  row: WallItemRow,
  tags: Map<string, WallTag>,
): WallItem => ({
  id: row.id,
  title: row.title,
  tag: row.tag_id
    ? (tags.get(row.tag_id) ?? { label: row.tag_id, color: "#525252" })
    : undefined,
  media: {
    type: row.media_type,
    src: mediaUrl(row.media),
    ...sizeOf(row),
  },
  background: row.background,
  bare: row.bare || undefined,
  position: row.object_position ?? undefined,
  zoom: row.zoom ?? undefined,
  description: row.description ?? undefined,
  link:
    row.link_href && row.link_label
      ? { label: row.link_label, href: row.link_href }
      : undefined,
});

/**
 * Everything the site shows, read from Supabase. Cached until the CMS saves,
 * and read once per request however many components ask for it.
 */
export const getContent = cache(async (): Promise<Content> => {
  const supabase = createPublicClient();
  // Counted, so rowsOf can tell a whole table from one that was cut short
  const list = (table: string) =>
    supabase.from(table).select("*", { count: "exact" });

  const [site, photos, artworks, records, tags, items, blocks, lists] =
    await Promise.all([
      supabase.from("site").select("*").eq("id", 1).maybeSingle(),
      // The id breaks ties, so rows with the same sort order stay put and
      // match the order the CMS shows
      list("photos").order("sort_order").order("id"),
      list("artworks").order("sort_order").order("id"),
      list("records").order("sort_order").order("id"),
      list("wall_tags"),
      list("wall_items"),
      list("wall_blocks").order("sort_order").order("id"),
      list("wall_lists"),
    ]);

  if (site.error) throw new Error(`Couldn't read site: ${site.error.message}`);
  const siteRow = site.data as SiteRow | null;

  const photoRows = rowsOf<PhotoRow>("photos", photos);
  const artworkRows = rowsOf<ArtworkRow>("artworks", artworks);

  const tagsById = new Map(
    rowsOf<WallTagRow>("wall_tags", tags).map((tag) => [
      tag.id,
      {
        label: tag.label,
        color: tag.color,
        logo: optionalMediaUrl(tag.logo),
      },
    ]),
  );
  const itemsById = new Map(
    rowsOf<WallItemRow>("wall_items", items).map((row) => [
      row.id,
      toWallItem(row, tagsById),
    ]),
  );
  const pick = (ids: string[]) =>
    ids.flatMap((id) => itemsById.get(id) ?? []);

  // A block with an empty slot or a missing item would break the grid, so it
  // stays off the site until it's complete
  const wall = rowsOf<WallBlockRow>("wall_blocks", blocks).flatMap(
    (block): WallBlock[] => {
      if (block.items.length !== WALL_SLOTS[block.layout]) return [];
      const blockItems = pick(block.items);
      if (blockItems.length !== block.items.length) return [];
      return [{ layout: block.layout, items: blockItems } as WallBlock];
    },
  );

  const listsById = new Map(
    rowsOf<WallListRow>("wall_lists", lists).map((list) => [
      list.id,
      list.items,
    ]),
  );

  const coverOf = (rows: (PhotoRow | ArtworkRow)[]) => {
    const cover = rows.find((row) => row.is_cover) ?? rows[0];
    return cover ? mediaUrl(cover.image) : undefined;
  };

  return {
    about: {
      headline: siteRow?.about_headline ?? "",
      intro: siteRow?.about_intro ?? "",
      image: optionalMediaUrl(siteRow?.about_image),
      currently: siteRow?.currently_name
        ? {
            name: siteRow.currently_name,
            since: siteRow.currently_since ?? undefined,
            blurb: siteRow.currently_blurb ?? undefined,
            url: siteRow.currently_url ?? undefined,
          }
        : undefined,
    },
    contact: {
      instagram: siteRow?.instagram_url ?? undefined,
      linkedin: siteRow?.linkedin_url ?? undefined,
      email: siteRow?.email ?? undefined,
    },
    photos: photoRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      image: mediaUrl(row.image),
      ...sizeOf(row),
      hue: row.hue,
      chroma: row.chroma,
    })),
    artworks: artworkRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      image: mediaUrl(row.image),
      ...sizeOf(row),
    })),
    records: rowsOf<RecordRow>("records", records).map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      artist: row.artist,
      cover: mediaUrl(row.cover),
      favoriteSong: { appleId: Number(row.apple_id), title: row.favorite_title },
    })),
    wall,
    experiments: pick(listsById.get("experiments") ?? []),
    highlights: pick(listsById.get("highlights") ?? []).filter(
      (item) => item.media.type === "image",
    ),
    covers: {
      photography: coverOf(photoRows),
      digitalArt: coverOf(artworkRows),
    },
  };
});
