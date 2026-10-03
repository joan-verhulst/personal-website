import { WALL_SLOTS, type WallLayout } from "~/modules/content/types";

// The wall's row shapes and the rules for moving items between their slots.
// No React here: the save action checks the same rules on the server.

export type SlotSize = "large" | "medium" | "small" | "half";

export const WALL_LAYOUTS = [
  "spiral",
  "triple",
  "double",
] as const satisfies readonly WallLayout[];

export const LAYOUTS: Record<
  WallLayout,
  { label: string; hint: string; slots: SlotSize[] }
> = {
  spiral: {
    label: "Spiral",
    hint: "1 large, 1 medium, 2 small",
    slots: ["large", "medium", "small", "small"],
  },
  triple: {
    label: "Triple",
    hint: "2 medium, 1 small",
    slots: ["medium", "medium", "small"],
  },
  double: { label: "Double", hint: "2 halves", slots: ["half", "half"] },
};

export const SLOT_LABELS: Record<SlotSize, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small",
  half: "Half",
};

/** A row as the editor holds it. An empty string is an empty slot. */
export interface WallRowDraft {
  // Stable across renders and saves; a uuid, which the save uses as the row's id
  id: string;
  layout: WallLayout;
  items: string[];
}

export type IsVideo = (id: string) => boolean;

export const emptySlots = (layout: WallLayout) =>
  Array<string>(WALL_SLOTS[layout]).fill("");

export const isComplete = (row: { items: string[] }) =>
  row.items.every(Boolean);

// Videos never go in a small slot: they'd be too small to follow
export const fits = (
  id: string,
  layout: WallLayout,
  slot: number,
  isVideo: IsVideo,
) => !(isVideo(id) && LAYOUTS[layout].slots[slot] === "small");

/** Where each item on the wall sits, by item id. */
export const placements = (rows: WallRowDraft[]) => {
  const map = new Map<string, { row: number; slot: number }>();
  rows.forEach((row, rowIndex) => {
    row.items.forEach((id, slot) => {
      if (id) map.set(id, { row: rowIndex, slot });
    });
  });
  return map;
};

/**
 * Whether a row mirrors on the site. Rows with an empty slot aren't shown,
 * so only the complete rows above it count. Doubles never mirror.
 */
export const isMirrored = (rows: WallRowDraft[], index: number) =>
  rows[index].layout !== "double" &&
  rows.slice(0, index).filter(isComplete).length % 2 === 1;

/**
 * Puts an item in a slot. An item already on the wall moves, and whatever was
 * in the slot goes back to where it came from (a swap), or off the wall.
 */
export const placeItem = (
  rows: WallRowDraft[],
  id: string,
  rowIndex: number,
  slot: number,
  isVideo: IsVideo,
  titleOf: (id: string) => string,
): { rows: WallRowDraft[] } | { error: string } => {
  if (!fits(id, rows[rowIndex].layout, slot, isVideo)) {
    return { error: "Videos can't go in a small slot." };
  }

  const from = placements(rows).get(id);
  if (from?.row === rowIndex && from.slot === slot) return { rows };

  const current = rows[rowIndex].items[slot];
  if (from && current && !fits(current, rows[from.row].layout, from.slot, isVideo)) {
    return {
      error: `${titleOf(current)} is a video and can't move to a small slot.`,
    };
  }

  const next = rows.map((row) => ({ ...row, items: [...row.items] }));
  if (from) next[from.row].items[from.slot] = current;
  next[rowIndex].items[slot] = id;
  return { rows: next };
};

/**
 * Switches a row to another layout and keeps as many of its items as fit,
 * the first ones first. Items that don't fit come back as `leftOver`, for the
 * library.
 */
export const relayout = (
  row: WallRowDraft,
  layout: WallLayout,
  isVideo: IsVideo,
): { row: WallRowDraft; leftOver: string[] } => {
  const { slots } = LAYOUTS[layout];
  // Every layout lists its slots big to small, so these come first
  const roomy = slots.filter((size) => size !== "small").length;

  const kept: string[] = [];
  const leftOver: string[] = [];
  let videos = 0;
  for (const id of row.items.filter(Boolean)) {
    const video = isVideo(id);
    if (kept.length < slots.length && (!video || videos < roomy)) {
      kept.push(id);
      if (video) videos++;
    } else {
      leftOver.push(id);
    }
  }

  // Videos take roomy slots and images fill the rest, each in their old order
  const images = kept.filter((id) => !isVideo(id));
  const imagesUpFront = images.slice(0, Math.max(roomy - videos, 0));
  const front = kept.filter((id) => isVideo(id) || imagesUpFront.includes(id));
  const back = images.slice(imagesUpFront.length);
  const items = [...front, ...back];
  while (items.length < slots.length) items.push("");

  return { row: { ...row, layout, items }, leftOver };
};
