import ProductsPage from "~app/(main)/products/page";
import AppScreen from "~components/layout/app-screen";
import { ownPages } from "~/data/pages";

// Opened from the home screen: the same page, in the layer over it
const ProductsApp = () => {
  return (
    <AppScreen title={ownPages.products.title}>
      <ProductsPage />
    </AppScreen>
  );
};

export default ProductsApp;
