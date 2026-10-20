import { Images, Star } from "lucide-react";
import {
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import GalleryGrid, {
  type GalleryRow,
} from "~/modules/cms/components/gallery/gallery-grid";
import NewGalleryItem from "~/modules/cms/components/gallery/new-gallery-item";
import ReorderGalleryButton from "~/modules/cms/components/gallery/reorder-gallery-button";
import Header from "~/modules/cms/components/header";
import { readRows } from "~/modules/cms/utils/read-rows";

interface GalleryPageProps {
  kind: GalleryKind;
}

export const GalleryPage = async ({ kind }: GalleryPageProps) => {
  const config = GALLERIES[kind];
  const rows = await readRows<GalleryRow>(config.table);
  const cover = rows.find((row) => row.is_cover);

  return (
    <>
      <Header
        title={config.title}
        description={config.description}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Images aria-hidden />
              {rows.length} {rows.length === 1 ? config.noun : config.plural}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <Star aria-hidden />
              <span className="truncate">
                {cover
                  ? `Cover: ${cover.title}`
                  : rows[0]
                    ? `Cover: ${rows[0].title} (first in order)`
                    : "No cover yet"}
              </span>
            </span>
          </>
        }
        actions={
          <>
            <ReorderGalleryButton kind={kind} rows={rows} />
            <NewGalleryItem kind={kind} />
          </>
        }
      />
      <GalleryGrid kind={kind} rows={rows} />
    </>
  );
};
