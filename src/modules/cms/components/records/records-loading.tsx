import CollectionLoading from "~/modules/cms/components/collection-loading";
import { RECORDS } from "~/modules/cms/components/records/config";

/** Stands in for the records page while it loads. Their covers are square. */
const RecordsLoading = () => (
  <CollectionLoading
    title={RECORDS.title}
    description={RECORDS.description}
    aspect="square"
    hasReorder
  />
);

export default RecordsLoading;
