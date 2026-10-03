"use server";

import * as v from "valibot";
import {
  GALLERIES,
  GALLERY_KINDS,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import {
  type GalleryDetails,
  type GalleryImage,
  galleryDetailsSchema,
  galleryImageSchema,
  type NewGalleryItemValues,
  newGalleryItemSchema,
} from "~/modules/cms/components/gallery/schema";
import { requireAdmin } from "~/modules/cms/utils/require-admin";
import {
  type ActionResult,
  dbFailed,
  discardFailedUpload,
  discardUnused,
  failed,
  GONE,
  idSchema,
  idsSchema,
  insertWithId,
  isInFolder,
  nextSortOrder,
  parse,
  parseArgument,
  published,
  removeReplaced,
  removeUnused,
  saveOrder,
  updateOne,
} from "~/modules/cms/utils/shared";

// Photography and digital art work the same, they only differ in table, and
// in photos keeping their color for the photo table
export type { GalleryKind };

// Actions can be called with anything, so the kind and ids are checked too
const kindSchema = v.picklist(GALLERY_KINDS, "Unknown gallery.");

const WRONG_FOLDER = "That file isn't in this gallery.";

/** Signs in and checks the kind, the start of every action here. */
const start = async (kind: unknown) => {
  const admin = await requireAdmin();
  if (admin.error) return { error: failed(admin.error) } as const;

  const parsed = parseArgument(kindSchema, kind);
  if (!parsed.success) return { error: parsed.failure } as const;

  const { table, folder, noun } = GALLERIES[parsed.output];
  return {
    error: null,
    supabase: admin.supabase,
    kind: parsed.output,
    table,
    // Every upload for a gallery lands in its own folder, which is what lets
    // a path be tied to this table
    folder,
    noun,
  } as const;
};

const imageColumns = (kind: GalleryKind, image: GalleryImage) => ({
  image: image.image,
  width: image.width,
  height: image.height,
  ...(kind === "photos" ? { hue: image.hue ?? 0, chroma: image.chroma ?? 0 } : {}),
});

/**
 * Adds a piece at the end. When it fails the upload stays where it is: the
 * dialog still holds it for another try and discards it when it closes.
 */
export async function addGalleryItem(
  kind: GalleryKind,
  input: NewGalleryItemValues,
): Promise<ActionResult & { id?: string }> {
  const context = await start(kind);
  if (context.error) return context.error;
  const { supabase, table, noun } = context;

  const parsed = parse(newGalleryItemSchema, input);
  if (!parsed.success) return parsed.failure;
  const { title, description, ...image } = parsed.output;
  if (!isInFolder(image.image, context.folder)) return failed(WRONG_FOLDER);

  const sortOrder = await nextSortOrder(supabase, table);
  if (sortOrder === null) return failed(`Couldn't add the ${noun}.`);

  const result = await insertWithId(
    supabase,
    table,
    title,
    {
      title,
      description: description || null,
      ...imageColumns(context.kind, image),
      sort_order: sortOrder,
    },
    `Couldn't add the ${noun}.`,
  );
  if (result.error) return failed(result.error);

  return { ...published(), id: result.id };
}

export async function updateGalleryItem(
  kind: GalleryKind,
  id: string,
  details: GalleryDetails,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;
  const parsed = parse(galleryDetailsSchema, details);
  if (!parsed.success) return parsed.failure;

  const failure = await updateOne(
    context.supabase,
    context.table,
    parsedId.output,
    {
      title: parsed.output.title,
      description: parsed.output.description || null,
    },
    "Couldn't save the details.",
  );
  return failure ?? published();
}

/**
 * Swaps the file, keeping title, place and cover. The new file was uploaded
 * just for this, so it's removed again when the swap doesn't happen.
 */
export async function replaceGalleryImage(
  kind: GalleryKind,
  id: string,
  image: GalleryImage,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;
  const { supabase, table, folder } = context;

  const parsed = parse(galleryImageSchema, image);
  if (!parsed.success) return parsed.failure;
  if (!isInFolder(parsed.output.image, folder)) return failed(WRONG_FOLDER);

  const undo = async (failure: ActionResult) => {
    await discardFailedUpload(supabase, folder, parsed.output.image);
    return failure;
  };

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return undo(parsedId.failure);

  const { data: before, error: readError } = await supabase
    .from(table)
    .select("image")
    .eq("id", parsedId.output)
    .maybeSingle();
  if (readError) {
    return undo(dbFailed(readError, "Couldn't replace the image."));
  }
  if (!before) return undo(failed(GONE));

  const failure = await updateOne(
    supabase,
    table,
    parsedId.output,
    imageColumns(context.kind, parsed.output),
    "Couldn't replace the image.",
  );
  if (failure) return undo(failure);

  await removeReplaced(supabase, before.image, parsed.output.image);
  return published();
}

/**
 * Removes a file that was uploaded for a new piece that was then never
 * added, like when the dialog is cancelled. Only files in the gallery's own
 * folder that nothing uses can go.
 */
export async function discardGalleryUpload(
  kind: GalleryKind,
  path: string,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;

  const parsed = parseArgument(galleryImageSchema.entries.image, path);
  if (!parsed.success) return parsed.failure;
  if (!isInFolder(parsed.output, context.folder)) return failed(WRONG_FOLDER);

  return discardUnused(context.supabase, parsed.output);
}

/** The piece shown on the home page widget. One per gallery. */
export async function setGalleryCover(
  kind: GalleryKind,
  id: string,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;
  const { supabase, table } = context;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

  // The new cover first: a piece that's gone then changes nothing, and when
  // the second step fails there are two covers for a moment rather than none
  const failure = await updateOne(
    supabase,
    table,
    parsedId.output,
    { is_cover: true },
    "Couldn't set the cover.",
  );
  if (failure) return failure;

  const { error } = await supabase
    .from(table)
    .update({ is_cover: false })
    .eq("is_cover", true)
    .neq("id", parsedId.output);
  // The new cover did land, so the site has to hear about it either way
  const result = published();
  return error ? dbFailed(error, "Couldn't set the cover.") : result;
}

export async function reorderGallery(
  kind: GalleryKind,
  ids: string[],
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;

  const parsed = parseArgument(idsSchema, ids);
  if (!parsed.success) return parsed.failure;

  const error = await saveOrder(context.supabase, context.table, parsed.output);
  return error ? dbFailed(error, "Couldn't save the order.") : published();
}

/** Deletes a piece and its file. */
export async function deleteGalleryItem(
  kind: GalleryKind,
  id: string,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;
  const { supabase } = context;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

  const { data: deleted, error } = await supabase
    .from(context.table)
    .delete()
    .eq("id", parsedId.output)
    .select("image")
    .maybeSingle();
  if (error) return dbFailed(error, `Couldn't delete the ${context.noun}.`);

  await removeUnused(supabase, [deleted?.image]);
  return published();
}
