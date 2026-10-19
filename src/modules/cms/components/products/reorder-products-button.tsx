"use client";

import { reorderProducts } from "~/modules/cms/actions/products";
import MediaThumb from "~/modules/cms/components/media-thumb";
import ReorderButton from "~/modules/cms/components/reorder-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import type { ProductRow } from "~/modules/content/utils/rows";

/** The "Reorder" button and its dialog, for the order the products page shows. */
const ReorderProductsButton = ({ rows }: { rows: ProductRow[] }) => {
  const { run, isPending } = useAction();

  return (
    <ReorderButton
      title="Reorder products"
      description="The first one fills the home page widget. Drag the rows, or use their arrow buttons, to change the order."
      items={rows.map((row) => ({
        id: row.id,
        title: row.name,
        // On its background, like the cards. The dialog's box clips it
        thumbnail: (
          <MediaThumb item={row} sizes="48px" className="rounded-none" />
        ),
      }))}
      onSave={async (ids) => {
        const result = await run(() => reorderProducts(ids), "Order saved");
        return !!result && !result.error;
      }}
      isPending={isPending}
    />
  );
};

export default ReorderProductsButton;
