import { adminClient } from "~/modules/cms/utils/require-admin";

/**
 * Reads a table for a CMS screen. Uncached, unlike the site: the CMS always
 * shows what's in the database right now.
 */
export const readRows = async <Row>(
  table: string,
  order: string | null = "sort_order",
): Promise<Row[]> => {
  const supabase = await adminClient();
  const query = supabase.from(table).select("*", { count: "exact" });
  // The id breaks ties, so rows with the same sort order stay put
  const { data, error, count } = await (order
    ? query.order(order).order("id")
    : query);
  if (error) throw new Error(`Couldn't read ${table}: ${error.message}`);

  const rows = (data ?? []) as Row[];
  // The API cuts a long read off at its row limit without saying so
  if (count !== null && count > rows.length) {
    throw new Error(
      `Couldn't read ${table}: got ${rows.length} of ${count} rows, the API row limit cut the read short`,
    );
  }
  return rows;
};
