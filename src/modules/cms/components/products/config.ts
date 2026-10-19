import type { ProductRow } from "~/modules/content/utils/rows";

// What the collection page and its loading state both say about it
export const PRODUCTS = {
  title: "Products",
  description:
    "Things people can try right now, on the products page and one after another on the home page widget, which takes the contact widget's spot once there's a product.",
};

// Where uploads for products go in the media bucket
export const PRODUCTS_FOLDER = "products";

/** What to run when the table isn't there yet. */
export const RUN_MIGRATION =
  "Run supabase/migrations/0011_products_table.sql if you haven't yet.";

/**
 * The first product the site can show, if any: one whose file was deleted
 * from Media stays off it. With one, the home page widget shows products.
 */
export const homeProduct = (rows: ProductRow[]) =>
  rows.find((row) => row.media);
