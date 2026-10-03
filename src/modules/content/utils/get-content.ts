import { cache } from "react";
import type {
  Content,
  WallBlock,
  WallItem,
  WallTag,
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
  result: { data: unknown; error: { message: string } | null },
): Row[] => {
  if (result.error) {
    throw new Error(`Couldn't read ${table}: ${result.error.message}`);
  }
  return (result.data ?? []) as Row[];
};

const toWallItem = (
  row: WallItemRow,
  tags: Map<string, WallTag>,
): WallItem => ({
  id: row.id,
  title: row.title,
  tag: tags.get(row.tag_id) ?? { label: row.tag_id, color: "#525252" },
  media: {
    type: row.media_type,
    src: mediaUrl(row.media),
    width: row.width,
    height: row.height,
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

  const [site, photos, artworks, records, tags, items, blocks, lists] =
    await Promise.all([
      supabase.from("site").select("*").eq("id", 1).maybeSingle(),
      supabase.from("photos").select("*").order("sort_order"),
      supabase.from("artworks").select("*").order("sort_order"),
      supabase.from("records").select("*").order("sort_order"),
      supabase.from("wall_tags").select("*"),
      supabase.from("wall_items").select("*"),
      supabase.from("wall_blocks").select("*").order("sort_order"),
      supabase.from("wall_lists").select("*"),
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

  // A block with a missing item would break the grid, so it's left out
  const wall = rowsOf<WallBlockRow>("wall_blocks", blocks).flatMap(
    (block): WallBlock[] => {
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
      width: row.width,
      height: row.height,
      hue: row.hue,
      chroma: row.chroma,
    })),
    artworks: artworkRows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      image: mediaUrl(row.image),
      width: row.width,
      height: row.height,
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
