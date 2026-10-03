"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import {
  type ComponentProps,
  type HTMLAttributes,
  type ReactNode,
  useRef,
} from "react";
import { cmsFont } from "~/modules/cms/utils/font";
import cn from "~/utils/cn";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Overlay>) => (
  <DialogPrimitive.Overlay
    className={cn(
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-neutral-950/20 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in",
      className,
    )}
    {...props}
  />
);

// Tailwind v4 translates with the translate property and tw-animate-css
// animates transform, so the centring and the zoom don't fight each other
const DialogContent = ({
  className,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: ComponentProps<typeof DialogPrimitive.Content>) => {
  // What had focus when the dialog opened. Radix only hands focus back to a
  // <DialogTrigger />, and most dialogs here open from state: a card, a menu
  // button, a slot. Without this their focus would end up on the page itself
  const openerRef = useRef<HTMLElement | null>(null);

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        // Portalled outside the admin wrapper, so it brings the admin type
        // scale and font along
        data-cms=""
        className={cn(
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 gap-6 overflow-y-auto rounded-2xl border border-neutral-950/10 bg-white p-6 text-neutral-950 shadow-xl duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in",
          cmsFont.className,
          className,
        )}
        onOpenAutoFocus={(event) => {
          // Still the opener here: focus only moves into the dialog after this
          const active = document.activeElement;
          openerRef.current = active instanceof HTMLElement ? active : null;
          onOpenAutoFocus?.(event);
        }}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event);
          const opener = openerRef.current;
          openerRef.current = null;
          // An opener that's gone, like a deleted card, has nothing to focus
          if (
            event.defaultPrevented ||
            !opener?.isConnected ||
            opener === document.body
          ) {
            return;
          }
          event.preventDefault();
          opener.focus();
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute top-4 right-4 grid pointer-coarse:size-9 size-7 cursor-pointer place-items-center rounded-[10px] text-neutral-600 transition-colors hover:bg-neutral-950/5 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-primary-500 disabled:pointer-events-none">
          <XIcon size={16} aria-hidden />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
};

const DialogHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // Room on the right for the close button
      "flex flex-col gap-1.5 pr-8 text-left",
      className,
    )}
    {...props}
  />
);

/**
 * The part of a dialog that scrolls when it has to, between a header and a
 * pinned footer. <DialogShell /> puts the three together.
 */
const DialogBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      // A little top padding, so the scroll edge doesn't clip a focus ring
      "min-h-0 min-w-0 flex-1 overflow-y-auto px-6 pt-1 pb-6",
      className,
    )}
    {...props}
  />
);

interface DialogFooterProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Keeps the buttons in reach under a <DialogBody />. The body fades out
   * above them instead of ending on a line.
   */
  isPinned?: boolean;
}

// A gap rather than Spark's space-x, so the buttons don't touch when they
// stack on small screens
const DialogFooter = ({ className, isPinned, ...props }: DialogFooterProps) => (
  <div
    className={cn(
      "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
      isPinned &&
        "relative shrink-0 px-6 pt-2 pb-6 before:pointer-events-none before:absolute before:inset-x-0 before:bottom-full before:h-4 before:bg-linear-to-t before:from-white before:to-transparent",
      className,
    )}
    {...props}
  />
);

const DialogTitle = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    className={cn(
      "font-medium text-base text-neutral-950",
      className,
    )}
    {...props}
  />
);

const DialogDescription = ({
  className,
  ...props
}: ComponentProps<typeof DialogPrimitive.Description>) => (
  <DialogPrimitive.Description
    className={cn("text-neutral-600 text-sm leading-normal", className)}
    {...props}
  />
);

interface DialogShellProps
  extends Omit<ComponentProps<typeof DialogContent>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  /**
   * "default" is 720px, roomy enough that a form rarely scrolls. "compact" is
   * 480px, for a list of rows or a field or two.
   */
  size?: "default" | "compact";
  /** Stays put between the header and the body, like a search field. */
  toolbar?: ReactNode;
  /** The body: the one part that scrolls. */
  children: ReactNode;
  bodyClassName?: string;
  /** The right end of the footer: Cancel, then the main button. */
  footer: ReactNode;
  /** The left end of the footer, for a button like Delete or Remove. */
  footerStart?: ReactNode;
}

/**
 * The content of every roomy dialog: a header, a body that scrolls when the
 * screen is too short for it, and a footer that stays in reach. It goes
 * inside a <Dialog />, in place of <DialogContent />.
 *
 * @example
 * <Dialog open={open} onOpenChange={setOpen}>
 *   <DialogShell
 *     title="Choose an item"
 *     toolbar={<Input.SearchField aria-label="Search items" />}
 *     footer={
 *       <DialogClose asChild>
 *         <Button className="w-full sm:w-fit">Cancel</Button>
 *       </DialogClose>
 *     }
 *   >
 *     ...
 *   </DialogShell>
 * </Dialog>
 */
const DialogShell = ({
  title,
  description,
  size = "default",
  toolbar,
  children,
  bodyClassName,
  footer,
  footerStart,
  className,
  ...props
}: DialogShellProps) => (
  <DialogContent
    // The content itself doesn't scroll: only the body does, so the footer's
    // buttons stay in reach
    className={cn(
      "flex flex-col gap-0 overflow-hidden p-0",
      size === "compact" ? "max-w-[480px]" : "max-w-[720px]",
      className,
    )}
    {...(description ? {} : { "aria-describedby": undefined })}
    {...props}
  >
    <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
      <DialogTitle>{title}</DialogTitle>
      {description && <DialogDescription>{description}</DialogDescription>}
    </DialogHeader>
    {toolbar && <div className="shrink-0 px-6 pb-3">{toolbar}</div>}
    <DialogBody className={bodyClassName}>{children}</DialogBody>
    <DialogFooter isPinned>
      {footerStart && (
        <div className="flex flex-col gap-2 sm:mr-auto sm:flex-row [&>*]:w-full sm:[&>*]:w-fit">
          {footerStart}
        </div>
      )}
      {footer}
    </DialogFooter>
  </DialogContent>
);

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogShell,
  DialogTitle,
  DialogTrigger,
};
