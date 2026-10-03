"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRef } from "react";
import { deleteWallItem } from "~/modules/cms/actions/wall";
import AdminLink from "~/modules/cms/components/admin-link";
import { useConfirm } from "~/modules/cms/components/confirm";
import { CardMenu } from "~/modules/cms/components/media-card";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/modules/cms/components/primitives/dropdown-menu";
import { describeDelete } from "~/modules/cms/components/wall-item-form";
import { useAction } from "~/modules/cms/hooks/use-action";

interface Props {
  id: string;
  /** The item's edit page, as a canonical path. */
  href: string;
  title: string;
  // Where it shows on the site, so deleting can warn
  usage: string[];
}

/** The ⋮ menu on an item's card. */
const ItemCardMenu = ({ id, href, title, usage }: Props) => {
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  // Set by the menu item, acted on once the menu has closed
  const isDeleteRequested = useRef(false);

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${title}"?`,
      description: describeDelete(usage),
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (isConfirmed) run(() => deleteWallItem(id), "Item deleted");
  };

  return (
    <CardMenu
      label={`Actions for "${title}"`}
      isPending={isPending}
      // Asks as the menu closes, so the dialog hands focus back to the menu's
      // button instead of to the vanished menu item
      onCloseAutoFocus={() => {
        if (!isDeleteRequested.current) return;
        isDeleteRequested.current = false;
        handleDelete();
      }}
    >
      <DropdownMenuItem asChild>
        <AdminLink href={href}>
          <Pencil aria-hidden />
          Edit
        </AdminLink>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="danger"
        onSelect={() => {
          isDeleteRequested.current = true;
        }}
      >
        <Trash2 aria-hidden />
        Delete
      </DropdownMenuItem>
    </CardMenu>
  );
};

export default ItemCardMenu;
