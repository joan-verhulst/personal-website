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
  trigger?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  formId: string;
  submitLabel?: ReactNode;
  cancelLabel?: string;
  isPending?: boolean;
  isSubmitDisabled?: boolean;
  isDirty?: boolean;
  size?: "default" | "compact";
  footerStart?: ReactNode;
  className?: string;
}

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
