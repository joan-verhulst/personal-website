"use client";

import { Trash2 } from "lucide-react";
import Image from "next/image";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
  deleteRecord,
  replaceRecordCover,
  updateRecord,
} from "~/modules/cms/actions/records";
import Button from "~/modules/cms/components/button";
import { useConfirm } from "~/modules/cms/components/confirm";
import FormDialog from "~/modules/cms/components/form-dialog";
import Input from "~/modules/cms/components/input";
import { ChooseFromMedia } from "~/modules/cms/components/media-picker";
import {
  FavoriteSongFields,
  RecordDetailsFields,
  recordValuesFrom,
  useRecordForm,
} from "~/modules/cms/components/records/record-fields";
import UploadButton from "~/modules/cms/components/upload-button";
import { useAction } from "~/modules/cms/hooks/use-action";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";
import type { UploadedMedia } from "~/modules/cms/utils/upload-media";
import type { RecordRow } from "~/modules/content/utils/rows";
import { displayUrl } from "~/modules/media/utils/media-url";

interface Props {
  row: RecordRow;
  /** True for the first record, the one on the home page widget. */
  isFirst: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * A record's edit dialog: its cover, its details and its favorite song. Mount
 * it with a new key for every opening, so the form starts from what's saved.
 */
const EditRecordDialog = ({ row, isFirst, open, onOpenChange }: Props) => {
  const id = useId();
  const formId = `${id}-form`;
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  const remove = useAction();
  const cover = useAction();
  const [isUploading, setIsUploading] = useState(false);
  const form = useRecordForm(recordValuesFrom(row));
  const {
    handleSubmit,
    setErrors,
    formState: { isDirty },
  } = form;

  // Closing or reloading the tab would drop unsaved changes, so it asks first.
  // Closing the dialog asks too, through isDirty below
  useUnsavedWarning(open && isDirty);

  const isBusy = remove.isPending || isUploading || cover.isPending;

  // Uploaded or picked from Media, it saves right away
  const replaceCover = (media: UploadedMedia) =>
    cover
      .run(() => replaceRecordCover(row.id, media.path), "Cover replaced")
      .then(() => undefined);

  const handleOpenChange = (isOpen: boolean) => {
    // A delete or a new cover mid-way would lose its result with the dialog
    if (!isOpen && isBusy) return;
    onOpenChange(isOpen);
  };

  const onSubmit = handleSubmit(async (values) => {
    const result = await run(() => updateRecord(row.id, values), "Record saved");
    if (result?.fieldErrors) setErrors(result.fieldErrors);
    else if (result && !result.error) onOpenChange(false);
  });

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${row.title}"?`,
      description: "Its cover stays in Media. This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!isConfirmed) return;
    const result = await remove.run(() => deleteRecord(row.id), "Record deleted");
    if (result && !result.error) onOpenChange(false);
  };

  return (
    <FormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Edit record"
      description={`Shown in the On rotation modal${isFirst ? " and on the home page widget" : ""}. Changes go live as soon as they're saved.`}
      formId={formId}
      isPending={isPending}
      isDirty={isDirty}
      isSubmitDisabled={!isDirty || isBusy}
      footerStart={
        <Button
          variant="danger"
          isPending={remove.isPending}
          disabled={isPending || isUploading || cover.isPending}
          onClick={handleDelete}
        >
          {/* The spinner takes over from the icon while it deletes */}
          {!remove.isPending && <Trash2 size={16} aria-hidden />}
          Delete
        </Button>
      }
    >
      {/* Stacked: the cover first, then the details. The cover saves on its
          own, its button doesn't submit */}
      <form
        id={formId}
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4"
      >
        <Input.Root>
          <Input.Label as="span">Cover</Input.Label>
          <div className="relative size-28 overflow-hidden rounded-xl border border-neutral-950/10 bg-neutral-100">
            {/* Without one, its cover was deleted from Media */}
            {row.cover && (
              <Image
                src={displayUrl(row.cover)}
                unoptimized
                alt={`Cover of ${row.title}`}
                fill
                sizes="112px"
                className="object-cover"
              />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-2">
            <UploadButton
              folder="on-rotation"
              accept="image/*"
              maxSize={1200}
              aria-describedby={`${id}-cover-hint`}
              disabled={isPending || remove.isPending}
              onUploadingChange={setIsUploading}
              onUploaded={replaceCover}
              onError={(message) => toast.error(message)}
            >
              {row.cover ? "Replace cover" : "Upload cover"}
            </UploadButton>
            <ChooseFromMedia
              title="Choose from Media"
              accept="image"
              pickLabel={() => "Use as cover"}
              onPick={([media]) => replaceCover(media)}
              aria-describedby={`${id}-cover-hint`}
              disabled={isBusy || isPending}
            >
              Choose from Media
            </ChooseFromMedia>
          </div>
          <Input.Hint id={`${id}-cover-hint`}>
            {row.cover
              ? "Square, from Apple Music when the record was added. Replacing it saves right away, and the old one stays in Media."
              : "Its cover was deleted from Media, so the record is off the site until it has another."}
          </Input.Hint>
        </Input.Root>
        <RecordDetailsFields form={form} idPrefix={id} />
        <FavoriteSongFields form={form} idPrefix={id} />
      </form>
    </FormDialog>
  );
};

export default EditRecordDialog;
