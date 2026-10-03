"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "~/modules/cms/components/primitives/dialog";
import Logo from "~/modules/cms/components/sidebar/logo";
import { SidebarContent } from "~/modules/cms/components/sidebar/sidebar";
import { cmsFont } from "~/modules/cms/utils/font";
import cn from "~/utils/cn";

interface Props {
  email: string;
}

const ICON_BUTTON =
  "grid size-9 cursor-pointer place-items-center rounded-[10px] text-neutral-700 transition-colors duration-200 hover:bg-neutral-950/5 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-primary-500";

/**
 * The sidebar on small screens: a bar with the wordmark and a menu button
 * that slides the whole sidebar in as a sheet, account menu included.
 */
const MobileSidebar = ({ email }: Props) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between bg-neutral-100 px-4 md:hidden">
      <Logo />
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger className={ICON_BUTTON} aria-label="Open menu">
          <Menu size={20} aria-hidden />
        </DialogTrigger>
        <DialogPortal>
          <DialogOverlay />
          {/* The primitive's DialogContent is a centred modal, a sheet needs
              its own position and motion */}
          <DialogPrimitive.Content
            data-cms
            aria-describedby={undefined}
            className={cn(
              "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left fixed inset-y-0 left-0 z-50 flex w-[252px] max-w-[85vw] flex-col bg-neutral-100 text-neutral-950 shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in",
              // Portalled outside the admin wrapper, so it brings the admin font
              cmsFont.className,
            )}
          >
            <DialogTitle className="sr-only">Menu</DialogTitle>
            <DialogClose
              className={cn(ICON_BUTTON, "absolute top-3 right-2")}
              aria-label="Close menu"
            >
              <X size={20} aria-hidden />
            </DialogClose>
            <SidebarContent
              email={email}
              onNavigate={() => setIsOpen(false)}
              className="flex-1"
            />
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
};

export default MobileSidebar;
