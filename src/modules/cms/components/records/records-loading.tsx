import CollectionLoading from "~/modules/cms/components/collection-loading";
import { RECORDS } from "~/modules/cms/components/records/config";

const RecordsLoading = () => (
  <CollectionLoading
    title={RECORDS.title}
    description={RECORDS.description}
    aspect="square"
    hasReorder
  />
);

export default RecordsLoading;
