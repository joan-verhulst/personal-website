import CollectionLoading from "~/modules/cms/components/collection-loading";
import { PRODUCTS } from "~/modules/cms/components/products/config";

const ProductsLoading = () => (
  <CollectionLoading
    title={PRODUCTS.title}
    description={PRODUCTS.description}
    hasReorder
  />
);

export default ProductsLoading;
