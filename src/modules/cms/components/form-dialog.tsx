"use client";

import type { ReactNode } from "react";
import Button from "~/modules/cms/components/button";
import {
  type ConfirmOptions,
  useConfirm,
} from "~/modules/cms/components/confirm";
import {
  Dialog,
  DialogClose,
  DialogShell,
  DialogTrigger,
} from "~/modules/cms/components/primitives/dialog";

/** What a dialog asks before it closes with changes that weren't saved. */
export const DISCARD_CHANGES: ConfirmOptions = {
  title: "Discard changes?",
  description: "What you changed here isn't saved yet.",
  confirmLabel: "Discard",
  cancelLabel: "Keep editing",
  tone: "danger",
};

interface FormDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The button that opens it, when the dialog doesn't control open itself. */
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The form's fields. The <form> itself goes in here too, with id={formId}. */
  children: ReactNode;
  /** The id of the form the submit button submits. */
  formId: string;
  submitLabel?: ReactNode;
  cancelLabel?: string;
  /** Spins the submit button, and keeps the dialog open until the save ends. */
  isPending?: boolean;
  /** Turns the submit button off, like while nothing has changed. */
  isSubmitDisabled?: boolean;
  /**
   * Whether the form holds something that closing would lose. A click next to
   * the dialog then does nothing, and Esc, Cancel and the X ask first.
   */
  isDirty?: boolean;
  /** "default" is 720px, "compact" 480px. See <DialogShell />. */
  size?: "default" | "compact";
  /**
   * The left end of the footer, for a danger <Button /> like Delete. Cancel
   * and the submit button stay on the right.
   */
  footerStart?: ReactNode;
  className?: string;
}

/**
 * A dialog around a form, like the "New" form for a collection or a whole
 * edit form. It's as tall as its fields; only on a screen too short for them
 * do the fields scroll, between a header and footer that stay put. The submit
 * button lives in the footer, outside the form, and reaches it through
 * formId.
 *
 * @example
 * <FormDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="New print"
 *   formId="new-print"
 *   submitLabel="Add print"
 *   isPending={isPending}
 *   isDirty={isDirty}
 *   footerStart={
 *     <Button variant="danger" onClick={handleDelete}>Delete</Button>
 *   }
 * >
 *   <form id="new-print" onSubmit={handleSubmit(onSubmit)}>...</form>
 * </FormDialog>
 */
const FormDialog = ({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  formId,
  submitLabel = "Save",
  cancelLabel = "Cancel",
  isPending,
  isSubmitDisabled,
  isDirty,
  size = "default",
  footerStart,
  className,
}: FormDialogProps) => {
  const confirm = useConfirm();

  const handleOpenChange = async (isOpen: boolean) => {
    // Closing mid-save would hide the result, and any error with it
    if (!isOpen && isPending) return;
    if (!isOpen && isDirty && !(await confirm(DISCARD_CHANGES))) return;
    onOpenChange?.(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogShell
        title={title}
        description={description}
        size={size}
        className={className}
        bodyClassName="flex flex-col gap-4"
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          // A stray click next to the dialog never throws a filled form away
          if (isPending || isDirty) event.preventDefault();
        }}
        footerStart={footerStart}
        footer={
          <>
            <DialogClose asChild>
              <Button className="w-full sm:w-fit" disabled={isPending}>
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button
              type="submit"
              form={formId}
              variant="primary"
              className="w-full sm:w-fit"
              isPending={isPending}
              disabled={isSubmitDisabled}
            >
              {submitLabel}
            </Button>
          </>
        }
      >
        {children}
      </DialogShell>
    </Dialog>
  );
};

export default FormDialog;
