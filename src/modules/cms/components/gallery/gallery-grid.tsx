"use client";

import { Pencil, Star, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import {
  deleteGalleryItem,
  setGalleryCover,
} from "~/modules/cms/actions/gallery";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import CardGrid from "~/modules/cms/components/card-grid";
import { useConfirm } from "~/modules/cms/components/confirm";
import EmptyState from "~/modules/cms/components/empty-state";
import {
  capitalize,
  GALLERIES,
  type GalleryKind,
} from "~/modules/cms/components/gallery/config";
import GalleryImage from "~/modules/cms/components/gallery/gallery-image";
import GalleryItemDialog from "~/modules/cms/components/gallery/gallery-item-dialog";
import {
  NewGalleryDialog,
  NewGalleryLabel,
} from "~/modules/cms/components/gallery/new-gallery-item";
import MediaCard, { CardMenu } from "~/modules/cms/components/media-card";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/modules/cms/components/primitives/dropdown-menu";
import { useAction } from "~/modules/cms/hooks/use-action";
import type { ArtworkRow, PhotoRow } from "~/modules/content/utils/rows";

export type GalleryRow = PhotoRow | ArtworkRow;

// Two columns on a phone, and from there a card never gets wider than this
const CARD_SIZES = "(min-width: 640px) 300px, 50vw";

/**
 * A piece's size in pixels. Rows from before sizes were measured have none,
 * which says nothing about what kind of file it is.
 */
export const describeSize = (row: Pick<GalleryRow, "width" | "height">) =>
  row.width > 0 && row.height > 0
    ? `${row.width} × ${row.height}`
    : "Size unknown";

/** What deleting a piece does, for the confirm dialog. */
export const deleteWarning = (row: Pick<GalleryRow, "is_cover">) =>
  `The image is removed from storage too. This can't be undone.${
    row.is_cover
      ? " It's the cover, so the home widget shows the first one in the order until you pick another."
      : ""
  }`;

interface CardProps {
  kind: GalleryKind;
  row: GalleryRow;
  onEdit: () => void;
}

const GalleryCard = ({ kind, row, onEdit }: CardProps) => {
  const config = GALLERIES[kind];
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  // Set by the menu's Edit and Delete, acted on as the menu closes, so the
  // dialog that follows hands focus back to the menu's button
  const menuChoice = useRef<"edit" | "delete" | null>(null);

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${row.title}"?`,
      description: deleteWarning(row),
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (isConfirmed) {
      run(() => deleteGalleryItem(kind, row.id), `${capitalize(config.noun)} deleted`);
    }
  };

  return (
    <MediaCard
      onClick={onEdit}
      aspect="4/3"
      title={row.title}
      meta={describeSize(row)}
      badge={
        row.is_cover && (
          <Badge tone="primary">
            <Star aria-hidden className="fill-current" />
            Cover
          </Badge>
        )
      }
      actions={
        <CardMenu
          label={`Actions for "${row.title}"`}
          isPending={isPending}
          onCloseAutoFocus={() => {
            const choice = menuChoice.current;
            menuChoice.current = null;
            if (choice === "edit") onEdit();
            if (choice === "delete") handleDelete();
          }}
        >
          <DropdownMenuItem
            onSelect={() => {
              menuChoice.current = "edit";
            }}
          >
            <Pencil size={16} aria-hidden />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={row.is_cover || isPending}
            onSelect={() =>
              run(() => setGalleryCover(kind, row.id), "Set as cover")
            }
          >
            <Star size={16} aria-hidden />
            Set as cover
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="danger"
            disabled={isPending}
            onSelect={() => {
              menuChoice.current = "delete";
            }}
          >
            <Trash2 size={16} aria-hidden />
            Delete
          </DropdownMenuItem>
        </CardMenu>
      }
    >
      {/* The card's button already names it, so the image stays silent */}
      <GalleryImage image={row.image} alt="" sizes={CARD_SIZES} />
    </MediaCard>
  );
};

interface Props {
  kind: GalleryKind;
  rows: GalleryRow[];
}

/**
 * The collection as cards in sort order, each with its quick actions.
 * Clicking a card edits it in a dialog.
 */
const GalleryGrid = ({ kind, rows }: Props) => {
  const config = GALLERIES[kind];
  const [editing, setEditing] = useState<{
    row: GalleryRow;
    // Counts the openings, so each one mounts a fresh form
    session: number;
  } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);

  const openEdit = (row: GalleryRow) => {
    setEditing((current) => ({ row, session: (current?.session ?? 0) + 1 }));
    setIsEditOpen(true);
  };

  // The saved row, so a replaced image shows once the grid refreshes. A row
  // that was just deleted is gone from the list, so the dialog keeps its
  // last copy while it animates out
  const editingRow = editing
    ? (rows.find((row) => row.id === editing.row.id) ?? editing.row)
    : null;

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          title={`No ${config.plural} yet`}
          action={
            <Button variant="primary" onClick={() => setIsNewOpen(true)}>
              <NewGalleryLabel kind={kind} />
            </Button>
          }
        />
      ) : (
        <CardGrid>
          {rows.map((row) => (
            <GalleryCard
              key={row.id}
              kind={kind}
              row={row}
              onEdit={() => openEdit(row)}
            />
          ))}
        </CardGrid>
      )}
      {/* Outside the empty state, which goes as soon as the first of several
          uploads lands, while the dialog still shows the rest going up */}
      <NewGalleryDialog
        kind={kind}
        open={isNewOpen}
        onOpenChange={setIsNewOpen}
      />
      {/* Outside the grid, so deleting the last piece still lets it close */}
      {editingRow && (
        <GalleryItemDialog
          key={`${editingRow.id}-${editing?.session}`}
          kind={kind}
          row={editingRow}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}
    </>
  );
};

export default GalleryGrid;
