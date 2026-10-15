import CollectionLoading from "~/modules/cms/components/collection-loading";
import { PRODUCTS } from "~/modules/cms/components/products/config";

/** Stands in for the products page while it loads. Their cards are 4:3. */
const ProductsLoading = () => (
  <CollectionLoading
    title={PRODUCTS.title}
    description={PRODUCTS.description}
    hasReorder
  />
);

export default ProductsLoading;
