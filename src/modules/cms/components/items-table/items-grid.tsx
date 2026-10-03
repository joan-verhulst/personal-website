import type { ReactNode } from "react";
import Badge from "~/modules/cms/components/badge";
import CardGrid from "~/modules/cms/components/card-grid";
import EmptyState from "~/modules/cms/components/empty-state";
import { MediaTypeBadge, TagLabel } from "~/modules/cms/components/item-card";
import ItemCardMenu from "~/modules/cms/components/items-table/item-card-menu";
import MediaCard from "~/modules/cms/components/media-card";
import MediaThumb from "~/modules/cms/components/media-thumb";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";

export interface ItemCardData extends WallItemRow {
  // Where it shows on the site, empty when it doesn't
  usage: string[];
  isOnWall: boolean;
  isInExperiments: boolean;
  isHighlight: boolean;
}

interface Props {
  /** The items to show: the open tab's, after the toolbar's filters. */
  items: ItemCardData[];
  /** How many the tab holds without filters, for the empty state's copy. */
  total: number;
  tags: WallTagRow[];
  /** Which tab it's in, for the empty state's copy. */
  kind: "ui-ux" | "experiments";
  /** The "New item" button, for a tab that has nothing in it yet. */
  newItem: ReactNode;
}

/** Wall items as cards. The toolbar above it does the filtering. */
const ItemsGrid = ({ items, total, tags, kind, newItem }: Props) => {
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  // An item opened from Experiments remembers that, so its breadcrumb leads
  // back to this tab
  const hrefOf = (id: string) =>
    `/admin/ui-ux/items/${id}${kind === "experiments" ? "?from=experiments" : ""}`;

  return (
    <>
      {items.length > 0 ? (
        <CardGrid>
          {items.map((item) => (
            <MediaCard
              key={item.id}
              href={hrefOf(item.id)}
              title={item.title}
              meta={<TagLabel tag={tagById.get(item.tag_id)} />}
              // The tab already says whether it's in Experiments
              badge={
                (item.isOnWall || item.isHighlight) && (
                  <>
                    {item.isOnWall && <Badge tone="success">On the wall</Badge>}
                    {item.isHighlight && <Badge>Highlight</Badge>}
                  </>
                )
              }
              actions={
                <ItemCardMenu
                  id={item.id}
                  href={hrefOf(item.id)}
                  title={item.title}
                  usage={item.usage}
                />
              }
            >
              <span className="relative block">
                {/* The card rounds and clips its image, a second clip on the
                    same edge would show through at the corners */}
                <MediaThumb
                  item={item}
                  sizes="(min-width: 640px) 240px, 50vw"
                  className="rounded-none"
                />
                <MediaTypeBadge type={item.media_type} />
              </span>
            </MediaCard>
          ))}
        </CardGrid>
      ) : total ? (
        <EmptyState title="No items match" hint="Try another tag or search." />
      ) : (
        <EmptyState
          title={kind === "experiments" ? "No experiments yet" : "No items yet"}
          hint={
            kind === "experiments"
              ? "A new item made on this tab goes at the end of Experiments."
              : "Add a screenshot or a reel."
          }
          action={newItem}
        />
      )}

      {/* Says how many are left after filtering, without moving focus */}
      <p aria-live="polite" className="sr-only">
        {items.length} of {total} items
      </p>
    </>
  );
};

export default ItemsGrid;
