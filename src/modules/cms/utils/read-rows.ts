import { adminClient } from "~/modules/cms/utils/require-admin";
import { isTableToCome } from "~/modules/cms/utils/shared";

const select = async (table: string, order: string | null) => {
  const supabase = await adminClient();
  const query = supabase.from(table).select("*", { count: "exact" });
  return order ? query.order(order).order("id") : query;
};

type Read = Awaited<ReturnType<typeof select>>;

const rowsOf = <Row>(table: string, { data, error, count }: Read): Row[] => {
  if (error) throw new Error(`Couldn't read ${table}: ${error.message}`);

  const rows = (data ?? []) as Row[];
  if (count !== null && count > rows.length) {
    throw new Error(
      `Couldn't read ${table}: got ${rows.length} of ${count} rows, the API row limit cut the read short`,
    );
  }
  return rows;
};

export const readRows = async <Row>(
  table: string,
  order: string | null = "sort_order",
): Promise<Row[]> => rowsOf<Row>(table, await select(table, order));

export const readNewerRows = async <Row>(
  table: string,
  order: string | null = "sort_order",
): Promise<Row[] | null> => {
  const read = await select(table, order);
  return isTableToCome(table, read.error) ? null : rowsOf<Row>(table, read);
};
