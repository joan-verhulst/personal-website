import type { Metadata } from "next";
import { ITEMS } from "~/modules/cms/components/items-table/config";
import type { ItemCardData } from "~/modules/cms/components/items-table/items-grid";
import ItemsView from "~/modules/cms/components/items-table/items-view";
import { readWall } from "~/modules/cms/utils/read-wall";
import { describeUsage } from "~/modules/cms/utils/wall-preview";
import type { WallListId } from "~/modules/content/utils/rows";

export const metadata: Metadata = { title: ITEMS.title };

const ItemsAdmin = async () => {
  const { items, tags, blocks, lists } = await readWall();
  const onWall = new Set(blocks.flatMap((block) => block.items));
  const listItems = (id: WallListId) =>
    lists.find((list) => list.id === id)?.items ?? [];
  const experiments = new Set(listItems("experiments"));
  const highlights = new Set(listItems("highlights"));

  const cards: ItemCardData[] = items.map((item) => ({
    ...item,
    usage: describeUsage(item.id, blocks, lists),
    isOnWall: onWall.has(item.id),
    isInExperiments: experiments.has(item.id),
    isHighlight: highlights.has(item.id),
  }));

  // The view counts them itself, for the line under its header
  return (
    <ItemsView
      items={cards}
      tags={tags}
      experimentIds={listItems("experiments")}
    />
  );
};

export default ItemsAdmin;
