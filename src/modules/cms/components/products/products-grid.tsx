"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { deleteProduct } from "~/modules/cms/actions/products";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import CardGrid from "~/modules/cms/components/card-grid";
import { useConfirm } from "~/modules/cms/components/confirm";
import EmptyState from "~/modules/cms/components/empty-state";
import { MediaTypeBadge } from "~/modules/cms/components/item-card";
import MediaCard, { CardMenu } from "~/modules/cms/components/media-card";
import MediaThumb from "~/modules/cms/components/media-thumb";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/modules/cms/components/primitives/dropdown-menu";
import EditProductDialog, {
  DELETE_WARNING,
} from "~/modules/cms/components/products/edit-product-dialog";
import {
  NewProductDialog,
  NewProductLabel,
} from "~/modules/cms/components/products/new-product-dialog";
import { useAction } from "~/modules/cms/hooks/use-action";
import type { ProductRow } from "~/modules/content/utils/rows";
import { optionalMediaUrl } from "~/modules/media/utils/media-url";
import { TagLogo } from "~/modules/ui-ux/components/wall-tag";

// Two columns on a phone, and from there a card never gets wider than this
const CARD_SIZES = "(min-width: 640px) 300px, 50vw";

// Where the button sends people, by its host. A stored link is always a full
// https one, but a hand-edited row needn't be
const linkHost = (href: string | null) => {
  if (!href) return "No link";
  try {
    return new URL(href).host;
  } catch {
    return href;
  }
};

interface CardProps {
  row: ProductRow;
  onEdit: () => void;
}

const ProductCard = ({ row, onEdit }: CardProps) => {
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  // Set by a menu item, acted on once the menu has closed
  const requested = useRef<"edit" | "delete" | null>(null);
  const logoUrl = optionalMediaUrl(row.logo);

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${row.name}"?`,
      description: DELETE_WARNING,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (isConfirmed) run(() => deleteProduct(row.id), "Product deleted");
  };

  return (
    <MediaCard
      onClick={onEdit}
      title={
        // The logo as the site tints it, next to the name
        <span className="flex min-w-0 items-center gap-1.5">
          {logoUrl && <TagLogo logo={logoUrl} className="size-3.5" />}
          <span className="truncate">{row.name}</span>
        </span>
      }
      meta={linkHost(row.link_href)}
      badge={
        // Deleted from Media: off the site until another is picked
        !row.media && <Badge tone="warning">No media</Badge>
      }
      actions={
        <CardMenu
          label={`Actions for "${row.name}"`}
          isPending={isPending}
          // Opens a dialog as the menu closes, so the dialog hands focus
          // back to the menu's button instead of to the vanished item
          onCloseAutoFocus={() => {
            const action = requested.current;
            requested.current = null;
            if (action === "edit") onEdit();
            if (action === "delete") handleDelete();
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              requested.current = "edit";
            }}
          >
            <Pencil size={16} aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="danger"
            disabled={isPending}
            onSelect={() => {
              requested.current = "delete";
            }}
          >
            <Trash2 size={16} aria-hidden />
            Delete
          </DropdownMenuItem>
        </CardMenu>
      }
    >
      {/* On its background, like on the site. Without media the background
          shows alone */}
      <span className="relative block">
        {/* The card rounds and clips its image, a second clip on the same
            edge would show through at the corners */}
        <MediaThumb item={row} sizes={CARD_SIZES} className="rounded-none" />
        {row.media && <MediaTypeBadge type={row.media_type} />}
      </span>
    </MediaCard>
  );
};

/**
 * The products as cards, in the order the products page shows them. A card
 * opens its product in the edit dialog.
 */
const ProductsGrid = ({ rows }: { rows: ProductRow[] }) => {
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  // A new key for every opening, so the form starts from what's saved
  const [editKey, setEditKey] = useState(0);

  const handleEdit = (row: ProductRow) => {
    setEditing(row);
    setEditKey((key) => key + 1);
    setIsEditOpen(true);
  };

  // The saved row, so a save shows straight away. A deleted one stays as it
  // was while the dialog closes
  const editingRow = editing
    ? (rows.find((row) => row.id === editing.id) ?? editing)
    : null;

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          title="No products yet"
          hint="Until there's one, the home page shows the contact widget."
          action={
            <Button variant="primary" onClick={() => setIsNewOpen(true)}>
              <NewProductLabel />
            </Button>
          }
        />
      ) : (
        <CardGrid>
          {rows.map((row) => (
            <ProductCard
              key={row.id}
              row={row}
              onEdit={() => handleEdit(row)}
            />
          ))}
        </CardGrid>
      )}
      {/* Outside the empty state, which goes once the first product is in,
          so the dialog still gets to close */}
      <NewProductDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
      {/* Outside the grid, so deleting the last product doesn't cut its
          closing animation short */}
      {editingRow && (
        <EditProductDialog
          key={editKey}
          row={editingRow}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}
    </>
  );
};

export default ProductsGrid;
