"use client";

import { widgets } from "~/data/widgets";
import type { Product } from "~/modules/content/types";
import ProductReel from "~/modules/products/components/product-reel";
import TransitionLink from "~components/utils/TransitionLink";
import WidgetCard from "~components/widget-card";

interface Props {
  products: Product[];
}

const ProductsWidget = ({ products }: Props) => (
  <ProductReel
    products={products}
    sizes="(min-width: 768px) 256px, 100vw"
    // Holds still under an open app
    pausedIn={["opening", "open", "closing"]}
    radius="rounded-4xl"
    inset="px-6 pt-4"
    tag="bottom-4 left-4"
    // One dot for each product, beside the card
    dots="top-1/2 right-0 translate-x-4.5 -translate-y-1/2 flex-col"
    className="h-full"
    frame={(stage) => (
      <TransitionLink href="/products" className="block h-full">
        <WidgetCard label={widgets.products.label} className="h-full">
          {stage}
        </WidgetCard>
      </TransitionLink>
    )}
  />
);

export default ProductsWidget;
