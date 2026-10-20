import { readRows } from "~/modules/cms/utils/read-rows";
import type {
  WallBlockRow,
  WallItemRow,
  WallListRow,
  WallTagRow,
} from "~/modules/content/utils/rows";

export const readWall = async () => {
  const [items, tags, blocks, lists] = await Promise.all([
    readRows<WallItemRow>("wall_items", "title"),
    readRows<WallTagRow>("wall_tags", "label"),
    readRows<WallBlockRow>("wall_blocks"),
    readRows<WallListRow>("wall_lists", null),
  ]);
  return { items, tags, blocks, lists };
};
