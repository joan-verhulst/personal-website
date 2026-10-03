import CollectionLoading from "~/modules/cms/components/collection-loading";
import {
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";

/**
 * Stands in for a gallery's collection page while it loads. The pieces are
 * edited in a dialog, so there are no edit pages to stand in for.
 */
const GalleryLoading = ({ kind }: { kind: GalleryKind }) => (
  <CollectionLoading
    title={GALLERIES[kind].title}
    description={GALLERIES[kind].description}
    hasReorder
  />
);

export default GalleryLoading;
