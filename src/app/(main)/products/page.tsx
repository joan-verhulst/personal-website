import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageWithFooter from "~components/layout/footer";
import { ownPages } from "~/data/pages";
import { getContent } from "~/modules/content/utils/get-content";
import ProductShowcase from "~/modules/products/components/product-showcase";
import { describedPageMetadata } from "~/utils/page-metadata";

export const metadata: Metadata = describedPageMetadata(ownPages.products);

const ProductsPage = async () => {
  // Without one, home shows the contact widget in its place
  const { products } = await getContent();
  if (products.length === 0) notFound();

  return (
    <PageWithFooter className="min-h-screen">
      <h1 className="sr-only">{ownPages.products.title}</h1>
      <ProductShowcase />
    </PageWithFooter>
  );
};

export default ProductsPage;
