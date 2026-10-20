import CollectionLoading from "~/modules/cms/components/collection-loading";
import {
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";

const GalleryLoading = ({ kind }: { kind: GalleryKind }) => (
  <CollectionLoading
    title={GALLERIES[kind].title}
    description={GALLERIES[kind].description}
    hasReorder
  />
);

export default GalleryLoading;
