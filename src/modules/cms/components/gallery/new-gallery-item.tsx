"use client";

import { Plus } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  addGalleryItem,
  discardGalleryUpload,
} from "~/modules/cms/actions/gallery";
import Button from "~/modules/cms/components/button";
import FormDialog from "~/modules/cms/components/form-dialog";
import BulkUploadButton from "~/modules/cms/components/gallery/bulk-upload-button";
import {
  capitalize,
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import { GalleryPreview } from "~/modules/cms/components/gallery/gallery-image";
import {
  type NewGalleryItemValues,
  newGalleryItemSchema,
} from "~/modules/cms/components/gallery/schema";
import Input from "~/modules/cms/components/input";
import UploadArea from "~/modules/cms/components/upload-area";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useForm } from "~/modules/cms/hooks/use-form";
import {
  titleFromFile,
  type UploadedMedia,
} from "~/modules/cms/utils/upload-media";

const EMPTY: NewGalleryItemValues = {
  title: "",
  description: "",
  image: "",
  width: 0,
  height: 0,
  hue: 0,
  chroma: 0,
};

interface DialogProps {
  kind: GalleryKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The button that opens it, when something else doesn't. */
  trigger?: ReactNode;
}

/**
 * The dialog that uploads and adds a piece: one image with its details, or
 * several at once, which skips the form.
 */
export const NewGalleryDialog = ({
  kind,
  open,
  onOpenChange,
  trigger,
}: DialogProps) => {
  const config = GALLERIES[kind];
  const formId = `new-${kind}`;
  const { run, isPending } = useAction();
  const [isUploading, setIsUploading] = useState(false);
  const [isBulkUploading, setIsBulkUploading] = useState(false);
  // Read by uploads that finish after the dialog closed
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  const {
    register,
    handleSubmit,
    errors,
    setErrors,
    setValue,
    getValues,
    clearErrors,
    reset,
    watch,
  } = useForm({ schema: newGalleryItemSchema, defaultValues: EMPTY });
  const [image, title, description] = watch(["image", "title", "description"]);

  // An upload that never became a piece only takes up space
  const discard = (path: string) => {
    if (path) discardGalleryUpload(kind, path).catch(() => undefined);
  };

  const close = (isAdded: boolean) => {
    if (!isAdded) discard(getValues("image"));
    onOpenChange(false);
    reset(EMPTY);
  };

  const handleUploaded = (media: UploadedMedia, file: File) => {
    if (!openRef.current) {
      discard(media.path);
      return;
    }
    discard(getValues("image"));
    setValue("image", media.path);
    setValue("width", media.width);
    setValue("height", media.height);
    setValue("hue", media.hue);
    setValue("chroma", media.chroma);
    clearErrors("image");
    if (!getValues("title").trim()) {
      setValue("title", titleFromFile(file.name).slice(0, 200), {
        shouldValidate: true,
      });
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(
      () => addGalleryItem(kind, values),
      `${capitalize(config.noun)} added`,
    );
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    if (result && !result.error) close(true);
  });

  const uploadProps = {
    folder: config.folder,
    accept: "image/*",
    measureColor: config.measureColor,
    onUploaded: handleUploaded,
    onUploadingChange: setIsUploading,
    onError: (message: string) => toast.error(message),
  } as const;

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => (isOpen ? onOpenChange(true) : close(false))}
      trigger={trigger}
      title={`New ${config.noun}`}
      description={`It's added at the end of the ${config.title.toLowerCase()} page.`}
      formId={formId}
      submitLabel={`Add ${config.noun}`}
      // Several images going up count as a save too: closing mid-way would
      // hide how far along they are
      isPending={isPending || isBulkUploading}
      isSubmitDisabled={isUploading}
      // Closing would drop what's filled in, and the uploaded image with it
      isDirty={Boolean(image || title || description)}
    >
      {/* Stacked: the image first, then its details */}
      <form
        id={formId}
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        <Input.Root error={errors.image}>
          <Input.Label as="span">Image</Input.Label>
          {image ? (
            <div className="flex flex-col gap-2">
              <GalleryPreview
                image={image}
                alt={title || "The uploaded image"}
              />
              <UploadButton {...uploadProps}>Replace image</UploadButton>
            </div>
          ) : (
            <UploadArea
              hasError={!!errors.image}
              hintId={`${formId}-image-hint`}
              hint="Upload several to add them right away, each titled after its file. Large images are scaled down to 2560px."
            >
              <UploadButton
                {...uploadProps}
                disabled={isBulkUploading}
                aria-describedby={`${formId}-image-hint`}
              >
                Choose image
              </UploadButton>
              <BulkUploadButton
                kind={kind}
                disabled={isUploading || isPending}
                aria-describedby={`${formId}-image-hint`}
                onUploadingChange={setIsBulkUploading}
                onDone={(added) => {
                  // Stays open when none made it, next to the error toasts
                  if (added > 0) close(true);
                }}
              />
            </UploadArea>
          )}
          {/* The size comes with the upload, so its errors belong here too */}
          <Input.Error error={errors.image ?? errors.width ?? errors.height} />
        </Input.Root>

        <Input.Root error={errors.title}>
          <Input.Label htmlFor={`${formId}-title`}>Title</Input.Label>
          <Input.Field id={`${formId}-title`} {...register("title")} />
          <Input.Hint>Taken from the file name when left empty.</Input.Hint>
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

/** The label of every "New" pill for a gallery, in the header or elsewhere. */
export const NewGalleryLabel = ({ kind }: { kind: GalleryKind }) => (
  <>
    New {GALLERIES[kind].noun}
    <Plus size={16} aria-hidden />
  </>
);

/** The header's "New" pill, with the dialog it opens. */
const NewGalleryItem = ({ kind }: { kind: GalleryKind }) => {
  const [open, setOpen] = useState(false);

  return (
    <NewGalleryDialog
      kind={kind}
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button variant="primary">
          <NewGalleryLabel kind={kind} />
        </Button>
      }
    />
  );
};

export default NewGalleryItem;
