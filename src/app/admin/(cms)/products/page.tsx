import { House, Package } from "lucide-react";
import type { Metadata } from "next";
import EmptyState from "~/modules/cms/components/empty-state";
import Header from "~/modules/cms/components/header";
import {
  homeProduct,
  PRODUCTS,
} from "~/modules/cms/components/products/config";
import NewProductButton from "~/modules/cms/components/products/new-product-dialog";
import ProductsGrid from "~/modules/cms/components/products/products-grid";
import ReorderProductsButton from "~/modules/cms/components/products/reorder-products-button";
import { readNewerRows } from "~/modules/cms/utils/read-rows";
import type { ProductRow } from "~/modules/content/utils/rows";

export const metadata: Metadata = { title: PRODUCTS.title };

const ProductsAdmin = async () => {
  const products = await readNewerRows<ProductRow>("products");

  // Until 0011 has run there's no table to add to, so no buttons either
  if (!products) {
    return (
      <>
        <Header title={PRODUCTS.title} description={PRODUCTS.description} />
        <EmptyState
          title="The products table isn't there yet"
          hint="Run supabase/migrations/0011_products_table.sql in the Supabase SQL editor, then reload this page."
        />
      </>
    );
  }

  const first = homeProduct(products);

  return (
    <>
      <Header
        title={PRODUCTS.title}
        description={PRODUCTS.description}
        meta={
          <>
            <span className="flex items-center gap-1.5">
              <Package aria-hidden />
              {products.length} {products.length === 1 ? "product" : "products"}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <House aria-hidden />
              <span className="truncate">
                {first
                  ? "Home widget: every product, in turn"
                  : "Home widget: contact, until there's a product"}
              </span>
            </span>
          </>
        }
        actions={
          <>
            <ReorderProductsButton rows={products} />
            <NewProductButton />
          </>
        }
      />
      <ProductsGrid rows={products} />
    </>
  );
};

export default ProductsAdmin;
