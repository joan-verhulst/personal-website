"use client";

import { Star, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  deleteGalleryItem,
  replaceGalleryImage,
  updateGalleryItem,
} from "~/modules/cms/actions/gallery";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import { useConfirm } from "~/modules/cms/components/confirm";
import FormDialog from "~/modules/cms/components/form-dialog";
import {
  capitalize,
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import {
  deleteWarning,
  describeSize,
  type GalleryRow,
} from "~/modules/cms/components/gallery/gallery-grid";
import { GalleryPreview } from "~/modules/cms/components/gallery/gallery-image";
import {
  type GalleryDetails,
  galleryDetailsSchema,
} from "~/modules/cms/components/gallery/schema";
import Input from "~/modules/cms/components/input";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useForm } from "~/modules/cms/hooks/use-form";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";

interface Props {
  kind: GalleryKind;
  row: GalleryRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fromRow = (row: GalleryRow): GalleryDetails => ({
  title: row.title,
  description: row.description ?? "",
});

/**
 * Edits one photo or artwork in a dialog over the grid. Mount it with a new
 * key for every opening, so the fields start from the saved values.
 */
const GalleryItemDialog = ({ kind, row, open, onOpenChange }: Props) => {
  const config = GALLERIES[kind];
  const formId = `edit-${kind}`;
  const confirm = useConfirm();
  // Separate, so replacing the image or deleting doesn't spin the save button
  const save = useAction();
  const image = useAction();
  const remove = useAction();
  const [isUploading, setIsUploading] = useState(false);
  // A new image going up or being saved: deleting or closing now would leave
  // the uploaded file behind in storage
  const isReplacing = isUploading || image.isPending;

  const {
    register,
    handleSubmit,
    errors,
    setErrors,
    formState: { isDirty },
  } = useForm({ schema: galleryDetailsSchema, defaultValues: fromRow(row) });

  // Closing or reloading the tab would drop unsaved changes, so it asks first.
  // Closing the dialog asks too, through isDirty below
  useUnsavedWarning(open && isDirty);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && (isReplacing || remove.isPending)) return;
    onOpenChange(isOpen);
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await save.run(
      () => updateGalleryItem(kind, row.id, values),
      `${capitalize(config.noun)} saved`,
    );
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    if (result && !result.error) onOpenChange(false);
  });

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${row.title}"?`,
      description: deleteWarning(row),
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!isConfirmed) return;

    const result = await remove.run(
      () => deleteGalleryItem(kind, row.id),
      `${capitalize(config.noun)} deleted`,
    );
    if (result) onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title={`Edit ${config.noun}`}
      description={`Shown on the ${config.title.toLowerCase()} page. Changes go live as soon as they're saved.`}
      formId={formId}
      isPending={save.isPending}
      isDirty={isDirty}
      isSubmitDisabled={!isDirty || remove.isPending}
      footerStart={
        <Button
          variant="danger"
          isPending={remove.isPending}
          disabled={save.isPending || isReplacing}
          onClick={handleDelete}
        >
          {/* The spinner takes over from the icon while it deletes */}
          {!remove.isPending && <Trash2 size={16} aria-hidden />}
          Delete
        </Button>
      }
    >
      {/* Stacked: the image first, then its details */}
      <form
        id={formId}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input.Root>
          <Input.Label as="span">Image</Input.Label>
          {/* The whole piece shows, so nothing is hidden while editing it */}
          <GalleryPreview image={row.image} alt={row.title} priority>
            {row.is_cover && (
              <div className="absolute top-2 left-2">
                <Badge tone="primary">
                  <Star aria-hidden className="fill-current" />
                  Cover
                </Badge>
              </div>
            )}
          </GalleryPreview>
          <UploadButton
            folder={config.folder}
            accept="image/*"
            measureColor={config.measureColor}
            aria-describedby={`${formId}-image-hint`}
            className="mt-0.5"
            onUploaded={async (media) => {
              await image.run(
                () =>
                  replaceGalleryImage(kind, row.id, {
                    image: media.path,
                    width: media.width,
                    height: media.height,
                    hue: media.hue,
                    chroma: media.chroma,
                  }),
                "Image replaced",
              );
            }}
            onError={(message) => toast.error(message)}
            onUploadingChange={setIsUploading}
            disabled={image.isPending || remove.isPending}
          >
            Replace image
          </UploadButton>
          <Input.Hint id={`${formId}-image-hint`}>
            <span className="tabular-nums">{describeSize(row)}.</span>{" "}
            Replacing it saves right away and keeps the title, place and cover.
            Large images are scaled down to 2560px.
          </Input.Hint>
        </Input.Root>

        <Input.Root error={errors.title}>
          <Input.Label htmlFor={`${formId}-title`}>Title</Input.Label>
          <Input.Field id={`${formId}-title`} {...register("title")} />
          <Input.Error error={errors.title} />
        </Input.Root>
        <Input.Root error={errors.description}>
          <Input.Label htmlFor={`${formId}-description`}>
            Description
            <Input.Optional />
          </Input.Label>
          <Input.Textarea
            id={`${formId}-description`}
            {...register("description")}
          />
          <Input.Error error={errors.description} />
        </Input.Root>
      </form>
    </FormDialog>
  );
};

export default GalleryItemDialog;
