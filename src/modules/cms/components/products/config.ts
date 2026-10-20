import type { ProductRow } from "~/modules/content/utils/rows";

export const PRODUCTS = {
  title: "Products",
  description:
    "Things people can try right now, on the products page and one after another on the home page widget, which takes the contact widget's spot once there's a product.",
};

export const PRODUCTS_FOLDER = "products";

export const RUN_MIGRATION =
  "Run supabase/migrations/0011_products_table.sql if you haven't yet.";

export const homeProduct = (rows: ProductRow[]) =>
  rows.find((row) => row.media);
