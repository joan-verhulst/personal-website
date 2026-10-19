"use client";

import { Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { addProduct } from "~/modules/cms/actions/products";
import Button from "~/modules/cms/components/button";
import FormDialog from "~/modules/cms/components/form-dialog";
import {
  emptyProduct,
  ProductFields,
  reportInvalid,
  useProductForm,
} from "~/modules/cms/components/products/product-fields";
import { useAction } from "~/modules/cms/hooks/use-action";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The button that opens it, when something else doesn't. */
  trigger?: ReactNode;
}

/**
 * The dialog that adds a product: its details and its media in one go. It's
 * added at the end of the products page.
 */
export const NewProductDialog = ({
  open,
  onOpenChange,
  trigger,
}: DialogProps) => {
  const id = useId();
  const formId = `${id}-form`;
  const { run, isPending } = useAction();
  const [isUploading, setIsUploading] = useState(false);
  const form = useProductForm(emptyProduct);
  const {
    handleSubmit,
    reset,
    setErrors,
    formState: { isDirty },
  } = form;

  const handleOpenChange = (isOpen: boolean) => {
    // A file still going up would land in a form that's gone
    if (!isOpen && isUploading) return;
    onOpenChange(isOpen);
    // An upload that didn't become a product stays in Media, for another time
    if (!isOpen) reset(emptyProduct);
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(() => addProduct(values), "Product added");
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    else if (result && !result.error) handleOpenChange(false);
  }, reportInvalid);

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      trigger={trigger}
      title="New product"
      description="Something people can try right now. It's added at the end of the products page."
      formId={formId}
      submitLabel="Add product"
      isPending={isPending}
      // Waits for a file that's still going up, which would be left out
      isSubmitDisabled={isUploading}
      isDirty={isDirty}
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
          onUploadingChange={setIsUploading}
        />
      </form>
    </FormDialog>
  );
};

/** The label of every "New product" pill, in the header or elsewhere. */
export const NewProductLabel = () => (
  <>
    New product
    <Plus size={16} aria-hidden />
  </>
);

/** The header's "New product" pill, with the dialog it opens. */
const NewProductButton = () => {
  const [open, setOpen] = useState(false);

  return (
    <NewProductDialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="primary">
          <NewProductLabel />
        </Button>
      }
    />
  );
};

export default NewProductButton;
