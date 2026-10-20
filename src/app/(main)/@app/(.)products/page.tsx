import ProductsPage from "~app/(main)/products/page";
import AppScreen from "~components/layout/app-screen";
import { ownPages } from "~/data/pages";

const ProductsApp = () => {
  return (
    <AppScreen title={ownPages.products.title}>
      <ProductsPage />
    </AppScreen>
  );
};

export default ProductsApp;
