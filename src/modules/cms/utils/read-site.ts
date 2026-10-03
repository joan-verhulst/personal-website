import { adminClient } from "~/modules/cms/utils/require-admin";
import type { SiteRow } from "~/modules/content/utils/rows";

/** The single site row with the about modal and contact links. */
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
  // A count is only a hint on the dashboard, so it shouldn't take the page down
  if (error) console.error(`Couldn't count ${table}: ${error.message}`);
  return count ?? 0;
};

/** How many rows each collection holds, for the dashboard. */
export const readContentCounts = async (): Promise<ContentCounts> => {
  const [items, photos, artworks, records] = await Promise.all([
    countRows("wall_items"),
    countRows("photos"),
    countRows("artworks"),
    countRows("records"),
  ]);
  return { items, photos, artworks, records };
};
