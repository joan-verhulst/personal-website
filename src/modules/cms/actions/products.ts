"use server";

import { RUN_MIGRATION } from "~/modules/cms/components/products/config";
import {
  type ProductOutput,
  type ProductValues,
  productSchema,
} from "~/modules/cms/components/products/schema";
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
  orNull,
  parse,
  parseArgument,
  published,
  saveOrder,
  updateOne,
} from "~/modules/cms/utils/shared";

const UNKNOWN_TABLE = "P0001";

const productColumns = (product: ProductOutput) => ({
  name: product.name,
  logo: product.logo,
  description: orNull(product.description),
  link_label: product.linkHref ? orNull(product.linkLabel) : null,
  link_href: orNull(product.linkHref),
  media_type: product.mediaType,
  media: product.media,
  width: product.width,
  height: product.height,
  background: product.background,
  bare: product.bare,
});

const missingFiles = async (
  product: ProductOutput,
): Promise<ActionResult | null> => {
  const [media, logo] = await Promise.all([
    missingMedia(product.media),
    product.logo ? missingMedia(product.logo) : null,
  ]);
  if (media) return { error: media, fieldErrors: { media } };
  if (logo) return { error: logo, fieldErrors: { logo } };
  return null;
};

export async function addProduct(
  details: ProductValues,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);
  const { supabase } = admin;

  const parsed = parse(productSchema, details);
  if (!parsed.success) return parsed.failure;

  const missing = await missingFiles(parsed.output);
  if (missing) return missing;

  const sortOrder = await nextSortOrder(supabase, "products");
  if (sortOrder === null) {
    return failed(`Couldn't add the product. ${RUN_MIGRATION}`);
  }

  const result = await insertWithId(
    supabase,
    "products",
    parsed.output.name,
    { ...productColumns(parsed.output), sort_order: sortOrder },
    "Couldn't add the product.",
  );
  return result.error ? failed(result.error) : published();
}

export async function updateProduct(
  id: string,
  details: ProductValues,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;
  const parsed = parse(productSchema, details);
  if (!parsed.success) return parsed.failure;

  const missing = await missingFiles(parsed.output);
  if (missing) return missing;

  const failure = await updateOne(
    admin.supabase,
    "products",
    parsedId.output,
    productColumns(parsed.output),
    "Couldn't save the product.",
  );
  return failure ?? published();
}

export async function reorderProducts(ids: string[]): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsed = parseArgument(idsSchema, ids);
  if (!parsed.success) return parsed.failure;

  const error = await saveOrder(admin.supabase, "products", parsed.output);
  if (!error) return published();
  return dbFailed(
    error,
    error.code === UNKNOWN_TABLE
      ? `Couldn't save the order. ${RUN_MIGRATION}`
      : "Couldn't save the order.",
  );
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.error) return failed(admin.error);

  const parsedId = parseArgument(idSchema, id);
  if (!parsedId.success) return parsedId.failure;

  const { error } = await admin.supabase
    .from("products")
    .delete()
    .eq("id", parsedId.output);
  if (error) return dbFailed(error, "Couldn't delete the product.");

  return published();
}
