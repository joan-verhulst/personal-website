"use client";

import { Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { deleteProduct, updateProduct } from "~/modules/cms/actions/products";
import Button from "~/modules/cms/components/button";
import { useConfirm } from "~/modules/cms/components/confirm";
import FormDialog from "~/modules/cms/components/form-dialog";
import {
  ProductFields,
  productValuesFrom,
  reportInvalid,
  useProductForm,
} from "~/modules/cms/components/products/product-fields";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";
import type { ProductRow } from "~/modules/content/utils/rows";

export const DELETE_WARNING =
  "Its media and logo stay in Media. This can't be undone.";

interface Props {
  row: ProductRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EditProductDialog = ({ row, open, onOpenChange }: Props) => {
  const id = useId();
  const formId = `${id}-form`;
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  const remove = useAction();
  const [isUploading, setIsUploading] = useState(false);
  const form = useProductForm(productValuesFrom(row));
  const {
    handleSubmit,
    setErrors,
    formState: { isDirty },
  } = form;

  useUnsavedWarning(open && isDirty);

  const isBusy = remove.isPending || isUploading;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && isBusy) return;
    onOpenChange(isOpen);
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(
      () => updateProduct(row.id, values),
      "Product saved",
    );
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    else if (result && !result.error) onOpenChange(false);
  }, reportInvalid);

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${row.name}"?`,
      description: DELETE_WARNING,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!isConfirmed) return;
    const result = await remove.run(
      () => deleteProduct(row.id),
      "Product deleted",
    );
    if (result && !result.error) onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit product"
      description="Shown on the products page and in the home page widget. Changes go live as soon as they're saved."
      formId={formId}
      isPending={isPending}
      isDirty={isDirty}
      isSubmitDisabled={!isDirty || isBusy}
      footerStart={
        <Button
          variant="danger"
          isPending={remove.isPending}
          disabled={isPending || isUploading}
          onClick={handleDelete}
        >
          {!remove.isPending && <Trash2 size={16} aria-hidden />}
          Delete
        </Button>
      }
    >
      <form
        id={formId}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        <ProductFields
          form={form}
          idPrefix={id}
          isSaved
          onUploadingChange={setIsUploading}
        />
      </form>
    </FormDialog>
  );
};

export default EditProductDialog;
