"use client";

import { Plus } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addGalleryItem } from "~/modules/cms/actions/gallery";
import Button from "~/modules/cms/components/button";
import FormDialog from "~/modules/cms/components/form-dialog";
import BulkUploadButton, {
  useAddPieces,
} from "~/modules/cms/components/gallery/bulk-upload-button";
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
import { ChooseFromMedia } from "~/modules/cms/components/media-picker";
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
 * The dialog that adds a piece: one image with its details, uploaded or
 * picked from Media, or several at once, which skips the form.
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
  const [isAddingPicks, setIsAddingPicks] = useState(false);
  const pieces = useAddPieces(kind);
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

  // An upload that didn't become a piece stays in Media, for another time
  const close = () => {
    onOpenChange(false);
    reset(EMPTY);
  };

  const handleUploaded = (media: UploadedMedia) => {
    // The dialog closed while the file went up
    if (!openRef.current) return;
    setValue("image", media.path);
    setValue("width", media.width);
    setValue("height", media.height);
    setValue("hue", media.hue);
    setValue("chroma", media.chroma);
    clearErrors("image");
    if (!getValues("title").trim()) {
      setValue("title", titleFromFile(media.name).slice(0, 200), {
        shouldValidate: true,
      });
    }
  };

  // One file fills the form, like an upload. Several skip it: each becomes a
  // piece of its own right away
  const handlePicked = async (files: UploadedMedia[]) => {
    if (files.length === 1) {
      handleUploaded(files[0]);
      return;
    }
    setIsAddingPicks(true);
    pieces.start();
    for (const file of files) await pieces.add(file);
    setIsAddingPicks(false);
    // Stays open when none made it, next to the error toasts
    if (pieces.finish() > 0) close();
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(
      () => addGalleryItem(kind, values),
      `${capitalize(config.noun)} added`,
    );
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    if (result && !result.error) close();
  });

  const uploadProps = {
    folder: config.folder,
    accept: "image/*",
    onUploaded: handleUploaded,
    onUploadingChange: setIsUploading,
    onError: (message: string) => toast.error(message),
  } as const;

  const pickerProps = {
    title: "Choose from Media",
    accept: "image",
    pickLabel: (count: number) =>
      count > 1 ? `Add ${count} ${config.plural}` : "Use image",
    onPick: handlePicked,
  } as const;

  return (
    <FormDialog
      open={open}
      onOpenChange={(isOpen) => (isOpen ? onOpenChange(true) : close())}
      trigger={trigger}
      title={`New ${config.noun}`}
      description={`It's added at the end of the ${config.title.toLowerCase()} page.`}
      formId={formId}
      submitLabel={`Add ${config.noun}`}
      // Several images going up count as a save too: closing mid-way would
      // hide how far along they are
      isPending={isPending || isBulkUploading || isAddingPicks}
      isSubmitDisabled={isUploading}
      // Closing would drop what's filled in. An uploaded image stays in Media
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
              <div className="flex flex-wrap gap-2">
                <UploadButton {...uploadProps}>Replace image</UploadButton>
                <ChooseFromMedia {...pickerProps} disabled={isUploading}>
                  Choose from Media
                </ChooseFromMedia>
              </div>
            </div>
          ) : (
            <UploadArea
              hasError={!!errors.image}
              hintId={`${formId}-image-hint`}
              hint="Upload or pick several to add them right away, each titled after its file. Large images are scaled down to 2560px."
            >
              <UploadButton
                {...uploadProps}
                disabled={isBulkUploading || isAddingPicks}
                aria-describedby={`${formId}-image-hint`}
              >
                Upload image
              </UploadButton>
              <BulkUploadButton
                kind={kind}
                disabled={isUploading || isPending || isAddingPicks}
                aria-describedby={`${formId}-image-hint`}
                onUploadingChange={setIsBulkUploading}
                onDone={(added) => {
                  // Stays open when none made it, next to the error toasts
                  if (added > 0) close();
                }}
              />
              <ChooseFromMedia
                {...pickerProps}
                multiple
                description={`Pick one to fill in its details, or several to add them all as ${config.plural}.`}
                disabled={isUploading || isBulkUploading || isAddingPicks}
                aria-describedby={`${formId}-image-hint`}
              >
                Choose from Media
              </ChooseFromMedia>
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
