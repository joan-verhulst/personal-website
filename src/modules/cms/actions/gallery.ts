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
  failed,
  idSchema,
  idsSchema,
  insertWithId,
  missingMedia,
  nextSortOrder,
  parse,
  parseArgument,
  published,
  saveOrder,
  updateOne,
} from "~/modules/cms/utils/shared";

// GalleryKind comes from the gallery config, never re-exported: a "use server"
// file may only export async functions

const kindSchema = v.picklist(GALLERY_KINDS, "Unknown gallery.");

const start = async (kind: unknown) => {
  const admin = await requireAdmin();
  if (admin.error) return { error: failed(admin.error) } as const;

  const parsed = parseArgument(kindSchema, kind);
  if (!parsed.success) return { error: parsed.failure } as const;

  const { table, noun } = GALLERIES[parsed.output];
  return {
    error: null,
    supabase: admin.supabase,
    kind: parsed.output,
    table,
    noun,
  } as const;
};

const imageColumns = (kind: GalleryKind, image: GalleryImage) => ({
  image: image.image,
  width: image.width,
  height: image.height,
  ...(kind === "photos" ? { hue: image.hue ?? 0, chroma: image.chroma ?? 0 } : {}),
});

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
  const missing = await missingMedia(image.image);
  if (missing) return failed(missing);

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

export async function replaceGalleryImage(
  kind: GalleryKind,
  id: string,
  image: GalleryImage,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;
  const parsed = parse(galleryImageSchema, image);
  if (!parsed.success) return parsed.failure;

  const missing = await missingMedia(parsed.output.image);
  if (missing) return failed(missing);

  const failure = await updateOne(
    context.supabase,
    context.table,
    parsedId.output,
    imageColumns(context.kind, parsed.output),
    "Couldn't replace the image.",
  );
  return failure ?? published();
}

export async function setGalleryCover(
  kind: GalleryKind,
  id: string,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;
  const { supabase, table } = context;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

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

export async function deleteGalleryItem(
  kind: GalleryKind,
  id: string,
): Promise<ActionResult> {
  const context = await start(kind);
  if (context.error) return context.error;

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

  const { error } = await context.supabase
    .from(context.table)
    .delete()
    .eq("id", parsedId.output);
  if (error) return dbFailed(error, `Couldn't delete the ${context.noun}.`);

  return published();
}
