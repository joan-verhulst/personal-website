import { adminClient } from "~/modules/cms/utils/require-admin";
import { isTableToCome } from "~/modules/cms/utils/shared";

const select = async (table: string, order: string | null) => {
  const supabase = await adminClient();
  const query = supabase.from(table).select("*", { count: "exact" });
  // The id breaks ties, so rows with the same sort order stay put
  return order ? query.order(order).order("id") : query;
};

type Read = Awaited<ReturnType<typeof select>>;

const rowsOf = <Row>(table: string, { data, error, count }: Read): Row[] => {
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

/**
 * Reads a table for a CMS screen. Uncached, unlike the site: the CMS always
 * shows what's in the database right now.
 */
export const readRows = async <Row>(
  table: string,
  order: string | null = "sort_order",
): Promise<Row[]> => rowsOf<Row>(table, await select(table, order));

/**
 * Like readRows, for a table a newer migration adds: null while it isn't
 * there yet, so the page can say which migration to run instead of failing.
 */
export const readNewerRows = async <Row>(
  table: string,
  order: string | null = "sort_order",
): Promise<Row[] | null> => {
  const read = await select(table, order);
  return isTableToCome(table, read.error) ? null : rowsOf<Row>(table, read);
};
