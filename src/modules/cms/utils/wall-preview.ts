import type { WallItem } from "~/modules/content/types";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";
import { mediaUrl, optionalMediaUrl } from "~/modules/supabase/utils/media";

/** A row as the wall renders it, for previews in the CMS. */
export const toPreviewItem = (
  row: WallItemRow,
  tags: WallTagRow[],
): WallItem => {
  const tag = row.tag_id && tags.find(({ id }) => id === row.tag_id);

  return {
    id: row.id,
    title: row.title || "Untitled",
    tag: tag
      ? { label: tag.label, color: tag.color, logo: optionalMediaUrl(tag.logo) }
      : undefined,
    media: {
      type: row.media_type,
      src: row.media ? mediaUrl(row.media) : "",
      width: row.width || 4,
      height: row.height || 3,
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
  };
};

const HIDDEN = " (hidden)";

/** Where an item shows up, for the item list and before deleting. */
export const describeUsage = (
  id: string,
  blocks: { items: string[] }[],
  lists: { id: string; items: string[] }[],
) => {
  const places: string[] = [];
  blocks.forEach((block, index) => {
    if (!block.items.includes(id)) return;
    // A row with an empty slot isn't on the site until it's filled
    places.push(`Row ${index + 1}${block.items.every(Boolean) ? "" : HIDDEN}`);
  });
  for (const list of lists) {
    if (list.items.includes(id)) {
      places.push(list.id === "experiments" ? "Experiments" : "Home highlight");
    }
  }
  return places;
};

/** The places from describeUsage that are live on the site. */
export const liveUsage = (usage: string[]) =>
  usage.filter((place) => !place.endsWith(HIDDEN));

/** The places from describeUsage that the site skips, without the suffix. */
export const hiddenUsage = (usage: string[]) =>
  usage
    .filter((place) => place.endsWith(HIDDEN))
    .map((place) => place.slice(0, -HIDDEN.length));
