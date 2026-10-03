"use client";

import { useAdminPathname } from "~/modules/cms/components/admin-path";
import CollectionLoading from "~/modules/cms/components/collection-loading";
import { ITEMS } from "~/modules/cms/components/items-table/config";
import PageLoading from "~/modules/cms/components/page-loading";
import { Skeleton } from "~/modules/cms/components/primitives/skeleton";
import Toolbar from "~/modules/cms/components/toolbar";

// This also covers the pages below it, new and edit, which get the form's
// placeholder instead of the grid
const ItemsLoading = () => {
  const pathname = useAdminPathname();

  if (pathname !== "/admin/ui-ux/items") {
    const isNew = pathname === "/admin/ui-ux/items/new";

    // The preview, then media, card and modal text
    return (
      <PageLoading
        width="form"
        sections={4}
        hasMeta={!isNew}
        actions={isNew ? "save" : "delete"}
      />
    );
  }

  return (
    <CollectionLoading
      title={ITEMS.title}
      description={ITEMS.description}
      // The tabs, then the tag select and the search
      toolbar={
        <Toolbar
          start={
            <Skeleton className="h-[35px] w-48 max-w-full rounded-xl max-sm:h-11" />
          }
          end={
            <>
              <Skeleton className="h-[35px] rounded-xl sm:w-44" />
              <Skeleton className="h-[35px] rounded-xl sm:w-56" />
            </>
          }
        />
      }
    />
  );
};

export default ItemsLoading;
