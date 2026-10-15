import type { ProductRow } from "~/modules/content/utils/rows";

// What the collection page and its loading state both say about it
export const PRODUCTS = {
  title: "Products",
  description:
    "The products in the products modal: things people can try right now. The first one fills the home page widget, which takes the contact widget's spot once there's a product.",
};

// Where uploads for products go in the media bucket
export const PRODUCTS_FOLDER = "products";

/** What to run when the table isn't there yet. */
export const RUN_MIGRATION =
  "Run supabase/migrations/0011_products_table.sql if you haven't yet.";

/**
 * The product on the home page widget. One whose file was deleted from Media
 * stays off the site, so it's the first with media rather than the first.
 */
export const homeProduct = (rows: ProductRow[]) =>
  rows.find((row) => row.media);
