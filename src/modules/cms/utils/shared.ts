import type { SupabaseClient } from "@supabase/supabase-js";
import { updateTag } from "next/cache";
import * as v from "valibot";
import { slugify } from "~/modules/cms/utils/slugify";
import {
  formatBytes,
  STORAGE_LIMIT_BYTES,
} from "~/modules/media/utils/media-types";
import {
  deleteMedia,
  listMedia,
  mediaExists,
} from "~/modules/media/utils/storage";
import { CONTENT_TAG } from "~/modules/supabase/utils/public-client";

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

export const published = (): ActionResult => {
  updateTag(CONTENT_TAG);
  return {};
};

export const failed = (error: string): ActionResult => ({ error });

export const dbFailed = (error: unknown, message: string): ActionResult => {
  console.error(error);
  return failed(message);
};

export const invalid = (
  issues: [v.BaseIssue<unknown>, ...v.BaseIssue<unknown>[]],
): ActionResult & { error: string } => {
  const flat = v.flatten(issues);
  const fieldErrors: Record<string, string> = {};
  for (const [field, messages] of Object.entries(flat.nested ?? {})) {
    if (messages?.[0]) fieldErrors[field] = messages[0];
  }

  if (!Object.keys(fieldErrors).length) {
    return { error: flat.root?.[0] ?? flat.other?.[0] ?? issues[0].message };
  }
  return { error: "Check the highlighted fields.", fieldErrors };
};

type Parsed<Schema extends v.GenericSchema> =
  | { success: true; output: v.InferOutput<Schema> }
  | { success: false; failure: ActionResult & { error: string } };

export const parse = <Schema extends v.GenericSchema>(
  schema: Schema,
  input: unknown,
): Parsed<Schema> => {
  const result = v.safeParse(schema, input);
  return result.success
    ? { success: true, output: result.output }
    : { success: false, failure: invalid(result.issues) };
};

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
  v.check((ids) => new Set(ids).size === ids.length, "Unknown items."),
);

export const orNull = (value: string) => value || null;

export const GONE = "That item no longer exists. Reload the page.";

const DUPLICATE = "23505";

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

export const MISSING_FUNCTION = "PGRST202";

export const MISSING_TABLE = ["PGRST205", "42P01"];

const NEWER_TABLES = ["products"];

export const isTableToCome = (
  table: string,
  error: { code?: string } | null | undefined,
) => NEWER_TABLES.includes(table) && MISSING_TABLE.includes(error?.code ?? "");

export const saveOrder = async (
  supabase: SupabaseClient,
  table: string,
  ids: string[],
) => {
  const { error } = await supabase.rpc("save_order", {
    table_name: table,
    ids,
  });
  if (!error) return null;
  if (error.code !== MISSING_FUNCTION) return error;

  const results = await Promise.all(
    ids.map((id, index) =>
      supabase.from(table).update({ sort_order: index }).eq("id", id),
    ),
  );
  return results.find((result) => result.error)?.error ?? null;
};

export const MEDIA_COLUMNS = [
  ["wall_items", "media"],
  ["wall_tags", "logo"],
  ["photos", "image"],
  ["artworks", "image"],
  ["records", "cover"],
  ["products", "media"],
  ["products", "logo"],
  ["site", "about_image"],
  ["site", "about_modal_image"],
] as const;

export const noRoomFor = async (size: number) => {
  const files = await listMedia();
  if (!files) return "Couldn't check the storage left. Nothing was uploaded.";

  const used = files.reduce((total, file) => total + file.size, 0);
  if (used + size <= STORAGE_LIMIT_BYTES) return null;
  const left = formatBytes(Math.max(0, STORAGE_LIMIT_BYTES - used));
  return `Only ${left} of free storage is left, too little for this file. Remove media you don't use on the Media page first.`;
};

export const removeMedia = async (
  supabase: SupabaseClient,
  paths: (string | null | undefined)[],
) => {
  const existing = paths.filter((path): path is string => Boolean(path));
  if (!existing.length) return [];

  const removed = await deleteMedia(existing);
  if (removed.length < existing.length) {
    console.warn(
      `Removed ${removed.length} of ${existing.length} files: ${existing.join(", ")}`,
    );
  }
  if (removed.length) {
    const { error } = await supabase.from("media").delete().in("path", removed);
    if (error) console.error("Couldn't forget the removed files", error);
  }
  return removed;
};

export interface MediaDetails {
  path: string;
  name: string;
  kind: "image" | "video";
  width: number;
  height: number;
  hue: number;
  chroma: number;
}

export const rememberMedia = async (
  supabase: SupabaseClient,
  details: MediaDetails,
) => {
  const { error } = await supabase.from("media").upsert(details);
  if (error) console.error("Couldn't save the file's details", error);
};

export const missingMedia = async (path: string) => {
  const exists = await mediaExists(path);
  if (exists === null) return "Couldn't check the file. Try again.";
  return exists ? null : "That file is no longer in Media. Pick another.";
};

const NOT_NULL = "23502";

export const clearMediaUses = async (supabase: SupabaseClient, path: string) => {
  const results = await Promise.all(
    MEDIA_COLUMNS.map(async ([table, column]) => {
      const { error } = await supabase
        .from(table)
        .update({ [column]: null })
        .eq(column, path);
      return isTableToCome(table, error) ? null : error;
    }),
  );
  const error = results.find(Boolean);
  if (!error) return null;
  if (error.code === NOT_NULL) {
    return "Run supabase/migrations/0006_media_library.sql first, so a photo or item can stay without its file.";
  }
  console.error(error);
  return "Couldn't take the file off everything that uses it. The file wasn't deleted.";
};
