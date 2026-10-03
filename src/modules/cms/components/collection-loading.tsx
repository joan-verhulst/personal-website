import type { ReactNode } from "react";
import CardGrid from "~/modules/cms/components/card-grid";
import Header from "~/modules/cms/components/header";
import { MediaCardSkeleton } from "~/modules/cms/components/media-card";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";

const CARDS = Array.from({ length: 8 }, (_, index) => index);

interface CollectionLoadingProps {
  /** The page's real title and description, which don't have to load. */
  title: string;
  description: string;
  /** The shape of the collection's cards. */
  aspect?: "4/3" | "square";
  /** Whether the header has a Reorder button next to "New". */
  hasReorder?: boolean;
  /** The page's toolbar, when it has one, with placeholders in it. */
  toolbar?: ReactNode;
}

/**
 * Stands in for a collection page while it loads: the real title and
 * description, with placeholders for the counts, the buttons and the cards.
 *
 * @example
 * <CollectionLoading
 *   title={RECORDS.title}
 *   description={RECORDS.description}
 *   aspect="square"
 *   hasReorder
 * />
 */
const CollectionLoading = ({
  title,
  description,
  aspect = "4/3",
  hasReorder,
  toolbar,
}: CollectionLoadingProps) => (
  <>
    <Header
      title={title}
      description={description}
      meta={<Skeleton className="h-4 w-44" />}
      actions={
        <>
          {hasReorder && (
            <Skeleton className="h-[33px] w-24 rounded-[10px]" />
          )}
          <Skeleton className="h-[33px] w-28 rounded-full" />
        </>
      }
    />
    {toolbar}
    <CardGrid aria-busy aria-live="polite">
      <span className="sr-only">Loading…</span>
      {CARDS.map((card) => (
        <MediaCardSkeleton key={card} aspect={aspect} />
      ))}
    </CardGrid>
  </>
);

export default CollectionLoading;
