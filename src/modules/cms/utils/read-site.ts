import { adminClient } from "~/modules/cms/utils/require-admin";
import { isTableToCome } from "~/modules/cms/utils/shared";
import type { SiteRow } from "~/modules/content/utils/rows";

/** The single site row with the about page's words and the contact links. */
export const readSite = async (): Promise<SiteRow> => {
  const supabase = await adminClient();
  const { data, error } = await supabase
    .from("site")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) throw new Error(`Couldn't read site: ${error.message}`);
  return data as SiteRow;
};

export interface ContentCounts {
  items: number;
  products: number;
  photos: number;
  artworks: number;
  records: number;
}

const countRows = async (table: string) => {
  const supabase = await adminClient();
  // head: true asks for the count only, without sending the rows
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  // A count is only a hint on the dashboard, so it shouldn't take the page
  // down. A table that isn't there yet just has none
  if (error && !isTableToCome(table, error)) {
    console.error(`Couldn't count ${table}: ${error.message}`);
  }
  return count ?? 0;
};

/** How many rows each collection holds, for the dashboard. */
export const readContentCounts = async (): Promise<ContentCounts> => {
  const [items, products, photos, artworks, records] = await Promise.all([
    countRows("wall_items"),
    countRows("products"),
    countRows("photos"),
    countRows("artworks"),
    countRows("records"),
  ]);
  return { items, products, photos, artworks, records };
};
