"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { RedirectType, redirect } from "next/navigation";
import * as v from "valibot";
import { fits, WALL_LAYOUTS } from "~/modules/cms/components/wall/wall-layouts";
import { wallItemSchema, wallTagSchema } from "~/modules/cms/schema/wall";
import { getAdminPaths } from "~/modules/cms/utils/admin-path-server";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  type ActionResult,
  dbFailed,
  discardUnused,
  failed,
  GONE,
  idSchema,
  insertWithId,
  isInFolder,
  MISSING_FUNCTION,
  orNull,
  parse,
  parseArgument,
  published,
  removeReplaced,
  removeUnused,
  updateOne,
} from "~/modules/cms/utils/shared";
import { WALL_SLOTS, type WallLayout } from "~/modules/content/types";
import type { WallItemRow, WallListId } from "~/modules/content/utils/rows";

// Null is "make a new one". Actions can be called with anything, so an id
// that is given is checked before it goes into a filter
const optionalIdSchema = v.nullish(idSchema);

// Where the uploads of items and tags land in the media bucket
const ITEM_FOLDER = "work";
const TAG_FOLDER = "icons";

// ── Items ─────────────────────────────────────────────────────────────────────

const itemColumns = (item: v.InferOutput<typeof wallItemSchema>) => ({
  title: item.title,
  tag_id: item.tagId,
  media_type: item.mediaType,
  media: item.media,
  width: item.width,
  height: item.height,
  background: item.background,
  bare: item.bare,
  object_position: orNull(item.position),
  zoom: item.zoom,
  description: orNull(item.description),
  link_label: item.linkHref ? item.linkLabel || "Visit site" : null,
  link_href: orNull(item.linkHref),
});

/**
 * Why an item can't become a video where it sits, or null when it can.
 * Small slots and the home highlights only take images.
 */
const refuseVideo = async (supabase: SupabaseClient, id: string) => {
  const { data: blocks, error } = await supabase
    .from("wall_blocks")
    .select("layout, items")
    .contains("items", [id]);
  const { data: highlights, error: listError } = await supabase
    .from("wall_lists")
    .select("items")
    .eq("id", "highlights")
    .maybeSingle();
  if (error || listError) {
    console.error(error ?? listError);
    return "Couldn't check where the item is used.";
  }

  const rows = (blocks ?? []) as { layout: WallLayout; items: string[] }[];
  const isInSmallSlot = rows.some(
    (row) => !fits(id, row.layout, row.items.indexOf(id), () => true),
  );
  if (isInSmallSlot) {
    return "It sits in a small slot on the wall, which can't hold a video. Move it to a bigger slot first.";
  }
  if ((highlights?.items as string[] | undefined)?.includes(id)) {
    return "It's a home highlight, which has to be an image. Take it out of the highlights first.";
  }
  return null;
};

/**
 * Puts a new item at the end of the experiments. Ids in the list whose item
 * is gone are dropped on the way, so one stale entry can't block the save.
 */
const addToExperiments = async (
  supabase: SupabaseClient,
  id: string,
): Promise<ActionResult> => {
  const { data: current, error: readError } = await supabase
    .from("wall_lists")
    .select("items")
    .eq("id", "experiments")
    .maybeSingle();
  if (readError) {
    return dbFailed(readError, "Couldn't read the Experiments list.");
  }

  const listed = ((current?.items as string[] | undefined) ?? []).filter(
    Boolean,
  );
  const read = await readItems(supabase, listed, true);
  if (read.error || !read.items) {
    return dbFailed(read.error, "Couldn't read the Experiments list.");
  }
  const known = read.items;

  return writeWallList(supabase, "experiments", [
    ...listed.filter((item) => known.has(item)),
    id,
  ]);
};

/**
 * Creates an item when there's no id yet, otherwise saves it. A new item made
 * with list "experiments" also goes at the end of that list. When only that
 * step fails, the item still exists: listError says so instead of error, so
 * the form moves on to the item rather than offering to create it twice.
 */
export async function saveWallItem(
  id: string | null,
  input: unknown,
  list?: "experiments",
): Promise<ActionResult & { id?: string; listError?: string }> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsedId = parseArgument(optionalIdSchema, id);
  if (!parsedId.success) return parsedId.failure;
  const itemId = parsedId.output ?? null;

  const parsed = parse(wallItemSchema, input);
  if (!parsed.success) return parsed.failure;
  const item = parsed.output;

  if (!itemId) {
    // A new item's media always comes from the form's own upload button
    if (!isInFolder(item.media, ITEM_FOLDER)) {
      return failed("Upload the media again.");
    }
    const result = await insertWithId(
      supabase,
      "wall_items",
      item.title,
      itemColumns(item),
      "Couldn't create the item.",
    );
    if (result.error !== undefined) return failed(result.error);

    // Compared strictly, an action can be called with anything
    if (list === "experiments") {
      const added = await addToExperiments(supabase, result.id);
      if (added.error) {
        console.error(added.error);
        return {
          ...published(),
          id: result.id,
          listError:
            "The item was created, but couldn't be added to Experiments. Add it on the Wall page.",
        };
      }
    }
    return { ...published(), id: result.id };
  }

  const { data: before, error: readError } = await supabase
    .from("wall_items")
    .select("media")
    .eq("id", itemId)
    .maybeSingle();
  if (readError) return dbFailed(readError, "Couldn't save the item.");
  if (!before) return failed(GONE);

  // Media that stays may sit anywhere, the import kept its own folders. Only
  // a change has to come from the upload button
  if (item.media !== before.media && !isInFolder(item.media, ITEM_FOLDER)) {
    return failed("Upload the media again.");
  }

  if (item.mediaType === "video") {
    const refusal = await refuseVideo(supabase, itemId);
    if (refusal) return failed(refusal);
  }

  const failure = await updateOne(
    supabase,
    "wall_items",
    itemId,
    itemColumns(item),
    "Couldn't save the item.",
  );
  if (failure) return failure;

  await removeReplaced(supabase, before.media, item.media);
  return { ...published(), id: itemId };
}

/**
 * Deletes an item the slow way, for a database without the delete_wall_item
 * function: every place it's used first, the item last. A failure halfway
 * then leaves an item that still exists and can be deleted again, never an id
 * that points at nothing. Returns the item's media.
 */
const deleteItemInSteps = async (supabase: SupabaseClient, id: string) => {
  const { data: blocks, error: blocksError } = await supabase
    .from("wall_blocks")
    .select("id, items")
    .contains("items", [id]);
  if (blocksError) {
    return { failure: dbFailed(blocksError, "Couldn't take the item off the wall.") };
  }
  for (const block of (blocks ?? []) as { id: string; items: string[] }[]) {
    const { error } = await supabase
      .from("wall_blocks")
      .update({ items: block.items.map((item) => (item === id ? "" : item)) })
      .eq("id", block.id);
    if (error) {
      return { failure: dbFailed(error, "Couldn't take the item off the wall.") };
    }
  }

  const { data: lists, error: listsError } = await supabase
    .from("wall_lists")
    .select("id, items")
    .contains("items", [id]);
  if (listsError) {
    return {
      failure: dbFailed(
        listsError,
        "Couldn't take the item out of the lists. Try again.",
      ),
    };
  }
  for (const list of (lists ?? []) as { id: string; items: string[] }[]) {
    const { error } = await supabase
      .from("wall_lists")
      .update({ items: list.items.filter((item) => item !== id) })
      .eq("id", list.id);
    if (error) {
      return {
        failure: dbFailed(
          error,
          "Couldn't take the item out of the lists. Try again.",
        ),
      };
    }
  }

  const { data: deleted, error } = await supabase
    .from("wall_items")
    .delete()
    .eq("id", id)
    .select("media")
    .maybeSingle();
  if (error) return { failure: dbFailed(error, "Couldn't delete the item.") };

  return { media: (deleted?.media as string | undefined) ?? null };
};

/**
 * Deletes an item and takes it off the wall and the lists. Its slots are left
 * empty, which hides those rows on the site until they're filled again.
 * returnToList is for its edit page: the browser goes back to the items, so
 * the page of an item that's gone never renders.
 */
export async function deleteWallItem(
  id: string,
  returnToList = false,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

  // One function call, so the wall, the lists and the item change together.
  // It comes with supabase/migrations/0003_cms_hardening.sql
  const { data, error } = await supabase.rpc("delete_wall_item", {
    item_id: parsedId.output,
  });
  let media = (data as string | null) ?? null;
  if (error?.code === MISSING_FUNCTION) {
    const deleted = await deleteItemInSteps(supabase, parsedId.output);
    if (deleted.failure) return deleted.failure;
    media = deleted.media;
  } else if (error) {
    return dbFailed(error, "Couldn't delete the item.");
  }

  await removeUnused(supabase, [media]);
  const result = published();
  if (returnToList === true) {
    const { href } = await getAdminPaths();
    redirect(href("/admin/ui-ux/items"), RedirectType.replace);
  }
  return result;
}

/**
 * Removes a file that was uploaded for an item but never saved, like when the
 * new item dialog is cancelled. Only files in the items' folder that nothing
 * uses can go.
 */
export async function discardWallUpload(path: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parseArgument(wallItemSchema.entries.media, path);
  if (!parsed.success) return parsed.failure;
  if (!isInFolder(parsed.output, ITEM_FOLDER)) {
    return failed("That file isn't an item's.");
  }

  return discardUnused(admin.supabase, parsed.output);
}

// ── Tags ──────────────────────────────────────────────────────────────────────

// Postgres' foreign key violation, here when an item still has the tag
const STILL_REFERENCED = "23503";

export async function saveWallTag(
  id: string | null,
  input: unknown,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsedId = parseArgument(optionalIdSchema, id);
  if (!parsedId.success) return parsedId.failure;
  const tagId = parsedId.output ?? null;

  const parsed = parse(wallTagSchema, input);
  if (!parsed.success) return parsed.failure;
  const tag = parsed.output;

  if (!tagId) {
    if (tag.logo && !isInFolder(tag.logo, TAG_FOLDER)) {
      return failed("Upload the logo again.");
    }
    const result = await insertWithId(
      supabase,
      "wall_tags",
      tag.label,
      tag,
      "Couldn't add the tag.",
    );
    return result.error ? failed(result.error) : published();
  }

  const { data: before, error: readError } = await supabase
    .from("wall_tags")
    .select("logo")
    .eq("id", tagId)
    .maybeSingle();
  if (readError) return dbFailed(readError, "Couldn't save the tag.");
  if (!before) return failed(GONE);

  // Like an item's media: only a new logo has to come from the upload button
  if (tag.logo && tag.logo !== before.logo && !isInFolder(tag.logo, TAG_FOLDER)) {
    return failed("Upload the logo again.");
  }

  const failure = await updateOne(
    supabase,
    "wall_tags",
    tagId,
    tag,
    "Couldn't save the tag.",
  );
  if (failure) return failure;

  await removeReplaced(supabase, before.logo, tag.logo);
  return published();
}

const tagInUse = (count: number) =>
  `${count} item${count === 1 ? " uses" : "s use"} this tag. Give ${count === 1 ? "it" : "them"} another tag first.`;

export async function deleteWallTag(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

  const { count, error: countError } = await supabase
    .from("wall_items")
    .select("id", { count: "exact", head: true })
    .eq("tag_id", parsedId.output);
  if (countError) {
    return dbFailed(countError, "Couldn't check whether the tag is in use.");
  }
  if (count) return failed(tagInUse(count));

  const { data: deleted, error } = await supabase
    .from("wall_tags")
    .delete()
    .eq("id", parsedId.output)
    .select("logo")
    .maybeSingle();
  if (error) {
    // An item got the tag between the count and the delete
    if (error.code === STILL_REFERENCED) {
      return failed("An item uses this tag. Give it another tag first.");
    }
    return dbFailed(error, "Couldn't delete the tag.");
  }

  await removeUnused(supabase, [deleted?.logo]);
  return published();
}

// ── Blocks ────────────────────────────────────────────────────────────────────

// Postgres' check violation, here when the table doesn't know a layout yet
const CHECK_VIOLATION = "23514";

const unique = (ids: string[]) => new Set(ids).size === ids.length;

const wallSchema = v.pipe(
  v.array(
    v.object({
      id: v.pipe(v.string(), v.uuid("A row has an invalid id.")),
      layout: v.picklist(WALL_LAYOUTS, "A row has an unknown layout."),
      // An empty string is an empty slot
      items: v.array(v.string()),
    }),
  ),
  // The ids of the rows that stay go into one filter, which has to fit a URL
  v.maxLength(200, "That's more rows than the wall can hold."),
  v.check(
    (rows) => rows.every((row) => row.items.length === WALL_SLOTS[row.layout]),
    "Every row needs one entry per slot.",
  ),
  v.check(
    (rows) => unique(rows.flatMap((row) => row.items).filter(Boolean)),
    "An item can only be on the wall once.",
  ),
);

type ItemKind = Pick<WallItemRow, "id" | "title" | "media_type">;

/**
 * The items behind these ids, or null when one of them is gone. With
 * allowMissing, the ones that are gone are just left out.
 */
const readItems = async (
  supabase: SupabaseClient,
  ids: string[],
  allowMissing = false,
) => {
  if (!ids.length) return { items: new Map<string, ItemKind>() };
  const { data, error } = await supabase
    .from("wall_items")
    .select("id, title, media_type")
    .in("id", ids);
  if (error) return { error };
  const items = new Map(
    ((data ?? []) as ItemKind[]).map((item) => [item.id, item]),
  );
  return { items: allowMissing || items.size === ids.length ? items : null };
};

/**
 * Saves the whole wall: these rows in this order, with their layouts and
 * items. Rows left out are deleted. Rows with an empty slot are saved too,
 * the site skips them until they're filled.
 */
export async function saveWall(input: unknown): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  // Issues point into the list of rows, which no form shows
  const parsed = parseArgument(wallSchema, input);
  if (!parsed.success) return parsed.failure;
  const rows = parsed.output;

  const read = await readItems(supabase, [
    ...new Set(rows.flatMap((row) => row.items).filter(Boolean)),
  ]);
  if (read.error) {
    return dbFailed(read.error, "Couldn't check the items on the wall.");
  }
  const { items } = read;
  if (!items) {
    return failed(
      "An item on the wall was deleted in the meantime. Reload the page and try again.",
    );
  }
  const isVideo = (id: string) => items.get(id)?.media_type === "video";
  for (const row of rows) {
    const video = row.items.find(
      (id, slot) => id && !fits(id, row.layout, slot, isVideo),
    );
    if (video) {
      return failed(
        `${items.get(video)?.title ?? video} is a video, it can't go in a small slot.`,
      );
    }
  }

  // Two requests: the rows that were removed go first, then the rest is
  // written in one statement. In that order every state in between is a wall
  // that works. The other way round, a failed delete would leave removed rows
  // sharing their place in the order with the new ones.
  const kept = rows.map((row) => row.id);
  const removal = supabase.from("wall_blocks").delete();
  const { data: removed, error: removeError } = await (
    kept.length
      ? // The ids are uuids, checked above, so they're safe in a filter
        removal.not("id", "in", `(${kept.join(",")})`)
      : // Deleting needs a filter, this one matches every row
        removal.not("id", "is", null)
  ).select("id");
  if (removeError) return dbFailed(removeError, "Couldn't save the wall.");

  // The editor makes the ids, which keeps a second save from adding the rows
  // again.
  if (rows.length) {
    const { error } = await supabase.from("wall_blocks").upsert(
      rows.map((row, index) => ({
        id: row.id,
        layout: row.layout,
        items: row.items,
        sort_order: index,
      })),
    );
    if (error) {
      console.error(error);
      // The removed rows are gone already, so the site has to hear about it
      if (removed?.length) published();
      if (error.code === CHECK_VIOLATION) {
        return failed(
          "The database doesn't accept this wall yet. Run supabase/migrations/0002_wall_double.sql first.",
        );
      }
      return failed(
        removed?.length
          ? "Removed the deleted rows, but couldn't save the rest. Try again."
          : "Couldn't save the wall.",
      );
    }
  }

  return published();
}

// ── Lists ─────────────────────────────────────────────────────────────────────

const LIST_IDS = [
  "experiments",
  "highlights",
] as const satisfies readonly WallListId[];

const listSchema = v.object({
  id: v.picklist(LIST_IDS),
  items: v.pipe(
    v.array(v.string()),
    // Empty picks are skipped, as before
    v.transform((items) => items.filter(Boolean)),
    v.check(unique, "An item can only be in the list once."),
  ),
});

/**
 * Checks a list and writes it, without publishing: saveWallItem adds to the
 * experiments as part of its own save. The lists have no foreign keys, so
 * this is the only place that keeps ids of deleted items out.
 */
const writeWallList = async (
  supabase: SupabaseClient,
  id: unknown,
  items: unknown,
): Promise<ActionResult> => {
  const parsed = parseArgument(listSchema, { id, items });
  if (!parsed.success) return parsed.failure;
  const list = parsed.output;

  const read = await readItems(supabase, list.items);
  if (read.error) return dbFailed(read.error, "Couldn't check the list.");
  if (!read.items) {
    // Reloading alone isn't enough when the stale id is already saved
    return failed(
      "An item in this list no longer exists. Reload the page, and remove any empty card before saving.",
    );
  }

  // The home widget rotates two highlights as still images
  if (list.id === "highlights") {
    const known = read.items;
    if (list.items.length > 2) return failed("There are only two highlights.");
    if (list.items.some((item) => known.get(item)?.media_type !== "image")) {
      return failed("Highlights have to be images.");
    }
  }

  const { error } = await supabase.from("wall_lists").upsert(list);
  return error ? dbFailed(error, "Couldn't save the list.") : {};
};

export async function saveWallList(
  id: WallListId,
  items: string[],
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const result = await writeWallList(admin.supabase, id, items);
  return result.error ? result : published();
}
