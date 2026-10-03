"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import Button from "~/modules/cms/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/modules/cms/components/primitives/dialog";

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
}

type Confirm = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

/**
 * One shared dialog for the whole admin, in place of window.confirm. Ask with
 * `if (await confirm({ title: "Delete this item?" })) ...`.
 */
export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [open, setOpen] = useState(false);
  // Kept after closing so the text doesn't vanish during the exit animation
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  const settle = useCallback((value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback<Confirm>((next) => {
    // A second question replaces the first, which counts as cancelled
    resolveRef.current?.(false);
    setOptions(next);
    setOpen(true);

    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const tone = options?.tone ?? "default";

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) settle(false);
        }}
      >
        <DialogContent
          className="max-w-md"
          // Destructive actions start on cancel, so Enter can't delete by accident
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (tone === "danger" ? cancelRef : confirmRef).current?.focus();
          }}
          {...(options?.description ? {} : { "aria-describedby": undefined })}
        >
          <DialogHeader>
            <DialogTitle>{options?.title}</DialogTitle>
            {options?.description && (
              <DialogDescription>{options.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              ref={cancelRef}
              className="w-full sm:w-fit"
              onClick={() => settle(false)}
            >
              {options?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              ref={confirmRef}
              variant={tone === "danger" ? "danger" : "primary"}
              className="w-full sm:w-fit"
              onClick={() => settle(true)}
            >
              {options?.confirmLabel ?? "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
};

/** Returns confirm(), which resolves to true only when the user confirms. */
export const useConfirm = () => {
  const confirm = useContext(ConfirmContext);

  if (!confirm) {
    throw new Error("useConfirm must be used inside a ConfirmProvider");
  }

  return confirm;
};
