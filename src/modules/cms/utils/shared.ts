import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import * as v from "valibot";
import { mediaPath } from "~/modules/cms/schema/shared";
import { slugify } from "~/modules/cms/utils/slugify";
import { MEDIA_BUCKET } from "~/modules/supabase/utils/media";
import { CONTENT_TAG } from "~/modules/supabase/utils/public-client";

// What every CMS action returns: nothing when it worked. Field errors are
// keyed by the form field's name, so a form can show them next to its inputs
export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

/** Ends a successful save: the site rebuilds its pages on the next visit. */
export const published = (): ActionResult => {
  updateTag(CONTENT_TAG);
  return {};
};

export const failed = (error: string): ActionResult => ({ error });

/**
 * Fails with a sentence that makes sense on the screen. The database's or
 * storage's own message names tables and constraints, so it's kept for the
 * logs.
 */
export const dbFailed = (error: unknown, message: string): ActionResult => {
  console.error(error);
  return failed(message);
};

/**
 * Turns valibot's issues into a failed result with one message per field, the
 * first one, which is what a form has room for.
 */
export const invalid = (
  issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]],
): ActionResult & { error: string } => {
  const flat = v.flatten(issues);
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(flat.nested ?? {})) {
    if (messages?.[0]) fieldErrors[field] = messages[0];
  }

  // Issues without a field have no input to sit next to, so they become the
  // message itself
  if (!Object.keys(fieldErrors).length) {
    return { error: flat.root?.[0] ?? flat.other?.[0] ?? issues[0].message };
  }
  return { error: "Check the highlighted fields.", fieldErrors };
};

type Parsed<Schema extends v.GenericSchema> =
  | { success: true; output: v.InferOutput<Schema> }
  | { success: false; failure: ActionResult & { error: string } };

/**
 * Checks an action's input against its schema. Actions can be called with
 * anything, so the form's own check isn't enough.
 *
 * @example
 * const parsed = parse(contactSchema, input);
 * if (!parsed.success) return parsed.failure;
 * await supabase.from("site").update(parsed.output);
 */
export const parse = <Schema extends v.GenericSchema>(
  schema: Schema,
  input: unknown,
): Parsed<Schema> => {
  const result = v.safeParse(schema, input);
  return result.success
    ? { success: true, output: result.output }
    : { success: false, failure: invalid(result.issues) };
};

/**
 * Like parse, for an argument that isn't a form: an id, a list of ids, a
 * path. There's no field to point at, so the failure is the first message.
 */
export const parseArgument = <Schema extends v.GenericSchema>(
  schema: Schema,
  input: unknown,
): Parsed<Schema> => {
  const result = v.safeParse(schema, input);
  return result.success
    ? { success: true, output: result.output }
    : { success: false, failure: { error: result.issues[0].message } };
};

// Ids are slugs, see insertWithId. An empty one, or one with a comma or a
// brace, would bend the array filters that look an item up on the wall
export const idSchema = v.pipe(
  v.string("Unknown item."),
  v.regex(/^[\w-]{1,80}$/, "Unknown item."),
);

export const idsSchema = v.pipe(
  v.array(idSchema, "Unknown items."),
  v.maxLength(1000, "Too many items."),
  // A double id would get one of its two places at random
  v.check((ids) => new Set(ids).size === ids.length, "Unknown items."),
);

export const orNull = (value: string) => value || null;

export const GONE = "That item no longer exists. Reload the page.";

// Postgres' unique violation
const DUPLICATE = "23505";

/**
 * Inserts a row with an id made from its title. Taken ids get a short suffix,
 * so two photos can share a name. The error is ready to show: the message
 * passed in when the database refused the row.
 */
export const insertWithId = async (
  supabase: SupabaseClient,
  table: string,
  title: string,
  row: Record<string, unknown>,
  message = "Couldn't save it.",
): Promise<
  { id: string; error?: undefined } | { id?: undefined; error: string }
> => {
  const base = slugify(title);

  for (let attempt = 0; attempt < 5; attempt++) {
    const id =
      attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from(table).insert({ ...row, id });
    if (!error) return { id };
    if (error.code !== DUPLICATE) {
      console.error(error);
      return { error: message };
    }
  }

  return { error: "Couldn't find a free id, try another title." };
};

/**
 * The sort order that puts a new row at the end, or null when the table
 * couldn't be read. Guessing 0 then would put the row level with the first.
 */
export const nextSortOrder = async (supabase: SupabaseClient, table: string) => {
  const { data: last, error } = await supabase
    .from(table)
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error(error);
    return null;
  }
  return ((last?.sort_order as number | undefined) ?? -1) + 1;
};

/**
 * Updates the row with this id, and says so when there's no such row. Without
 * the check, saving something that was deleted in another tab would report
 * success. Returns the failure, or null when the row was saved. message is
 * for a database error, missing for a row that isn't there.
 */
export const updateOne = async (
  supabase: SupabaseClient,
  table: string,
  id: string | number,
  columns: Record<string, unknown>,
  message: string,
  missing = GONE,
): Promise<ActionResult | null> => {
  const { data, error } = await supabase
    .from(table)
    .update(columns)
    .eq("id", id)
    .select("id");
  if (error) return dbFailed(error, message);
  return data?.length ? null : failed(missing);
};

// PostgREST's "no such function", here before 0003 has been run
export const MISSING_FUNCTION = "PGRST202";

/**
 * Saves an order: every id gets its index as sort order. Ids that are gone
 * are skipped, which is right for a row deleted in another tab.
 */
export const saveOrder = async (
  supabase: SupabaseClient,
  table: string,
  ids: string[],
) => {
  // One statement, so the order lands whole or not at all
  const { error } = await supabase.rpc("save_order", {
    table_name: table,
    ids,
  });
  if (!error) return null;
  if (error.code !== MISSING_FUNCTION) return error;

  // Until supabase/migrations/0003_cms_hardening.sql has been run: one update
  // per row, which can leave the order half saved when a request fails
  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from(table).update({ sort_order: index }).eq("id", id),
    ),
  );
  return results.find((result) => result.error)?.error ?? null;
};

// ── Media ─────────────────────────────────────────────────────────────────────

// Every column that holds a path in the media bucket
export const MEDIA_COLUMNS = [
  ["wall_items", "media"],
  ["wall_tags", "logo"],
  ["photos", "image"],
  ["artworks", "image"],
  ["records", "cover"],
  ["site", "about_image"],
] as const;

/** Uploads for one kind of content live in one folder of the bucket. */
export const isInFolder = (path: string, folder: string) =>
  path.startsWith(`${folder}/`);

/**
 * Whether any row points at this file, or null when that couldn't be checked.
 * Treat null as in use: a file only goes once nothing needs it.
 */
export const isMediaUsed = async (supabase: SupabaseClient, path: string) => {
  const counts = await Promise.all(
    MEDIA_COLUMNS.map(([table, column]) =>
      supabase
        .from(table)
        .select(column, { count: "exact", head: true })
        .eq(column, path),
    ),
  );
  const unread = counts.find((result) => result.error || result.count === null);
  if (unread) {
    console.error(`Couldn't check whether ${path} is in use`, unread.error);
    return null;
  }
  return counts.some((result) => Boolean(result.count));
};

/**
 * Removes files from the bucket and returns how many went. A failure only
 * leaves clutter, so it's logged rather than passed on.
 */
export const removeMedia = async (
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
) => {
  const existing = paths.filter((path): path is string => Boolean(path));
  if (!existing.length) return 0;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove(existing);
  if (error) {
    console.error(error);
    return 0;
  }
  // Storage answers a file it didn't delete with a shorter list, not an error
  const removed = data?.length ?? 0;
  if (removed < existing.length) {
    console.warn(
      `Removed ${removed} of ${existing.length} files: ${existing.join(", ")}`,
    );
  }
  return removed;
};

/**
 * Removes files a row no longer points at, unless another row still does:
 * imported rows can share a file.
 */
export const removeUnused = async (
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
) => {
  const unused: string[] = [];
  for (const path of new Set(paths)) {
    if (path && (await isMediaUsed(supabase, path)) === false) {
      unused.push(path);
    }
  }
  await removeMedia(supabase, unused);
};

/** After a row swapped its file: removes the old one when it really changed. */
export const removeReplaced = async (
  supabase: SupabaseClient,
  before: string | null | undefined,
  next: string | null | undefined,
) => {
  if (before && before !== next) await removeUnused(supabase, [before]);
};

/** Removes an upload that never became part of a row. */
export const discardUnused = async (
  supabase: SupabaseClient,
  path: string,
): Promise<ActionResult> => {
  const isUsed = await isMediaUsed(supabase, path);
  if (isUsed === null) return failed("Couldn't check the file.");
  if (!isUsed) await removeMedia(supabase, [path]);
  return {};
};

const anyMediaPath = mediaPath("Unknown file.");

/**
 * After a replace failed: drops the file that was uploaded for it, which no
 * row will ever point at. The path comes from the caller, so it only goes
 * when it sits in the folder the upload belongs in and nothing uses it.
 */
export const discardFailedUpload = async (
  supabase: SupabaseClient,
  folder: string,
  path: unknown,
) => {
  const parsed = v.safeParse(anyMediaPath, path);
  if (parsed.success && isInFolder(parsed.output, folder)) {
    await removeUnused(supabase, [parsed.output]);
  }
};
