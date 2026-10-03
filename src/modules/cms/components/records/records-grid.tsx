"use client";

import { Pencil, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { deleteRecord } from "~/modules/cms/actions/records";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import CardGrid from "~/modules/cms/components/card-grid";
import { useConfirm } from "~/modules/cms/components/confirm";
import EmptyState from "~/modules/cms/components/empty-state";
import MediaCard, { CardMenu } from "~/modules/cms/components/media-card";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "~/modules/cms/components/primitives/dropdown-menu";
import EditRecordDialog from "~/modules/cms/components/records/edit-record-dialog";
import {
  NewRecordDialog,
  NewRecordLabel,
} from "~/modules/cms/components/records/new-record-dialog";
import { useAction } from "~/modules/cms/hooks/use-action";
import type { RecordRow } from "~/modules/content/utils/rows";
import { mediaUrl } from "~/modules/supabase/utils/media";

// Two columns on a phone, and from there a card never gets wider than this
const CARD_SIZES = "(min-width: 640px) 300px, 50vw";

interface CardProps {
  row: RecordRow;
  isFirst: boolean;
  onEdit: () => void;
}

const RecordCard = ({ row, isFirst, onEdit }: CardProps) => {
  const confirm = useConfirm();
  const { run, isPending } = useAction();
  // Set by a menu item, acted on once the menu has closed
  const requested = useRef<"edit" | "delete" | null>(null);

  const handleDelete = async () => {
    const isConfirmed = await confirm({
      title: `Delete "${row.title}"?`,
      description: "Its cover is removed from storage too. This can't be undone.",
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (isConfirmed) run(() => deleteRecord(row.id), "Record deleted");
  };

  return (
    <MediaCard
      onClick={onEdit}
      aspect="square"
      title={row.title}
      meta={`${row.artist} · ${row.type === "album" ? "Album" : "Song"}`}
      badge={isFirst && <Badge tone="primary">Home widget</Badge>}
      actions={
        <CardMenu
          label={`Actions for "${row.title}"`}
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
      <Image src={mediaUrl(row.cover)} alt="" fill sizes={CARD_SIZES} />
    </MediaCard>
  );
};

/**
 * The records as cards, in the order the On rotation modal shows them. A card
 * opens its record in the edit dialog.
 */
const RecordsGrid = ({ rows }: { rows: RecordRow[] }) => {
  const [editing, setEditing] = useState<RecordRow | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewOpen, setIsNewOpen] = useState(false);
  // A new key for every opening, so the form starts from what's saved
  const [editKey, setEditKey] = useState(0);

  const handleEdit = (row: RecordRow) => {
    setEditing(row);
    setEditKey((key) => key + 1);
    setIsEditOpen(true);
  };

  // The saved row, so a new cover shows straight away. A deleted one stays
  // as it was while the dialog closes
  const editingRow = editing
    ? (rows.find((row) => row.id === editing.id) ?? editing)
    : null;

  return (
    <>
      {rows.length === 0 ? (
        <EmptyState
          title="No records yet"
          action={
            <Button variant="primary" onClick={() => setIsNewOpen(true)}>
              <NewRecordLabel />
            </Button>
          }
        />
      ) : (
        <CardGrid>
          {rows.map((row, index) => (
            <RecordCard
              key={row.id}
              row={row}
              isFirst={index === 0}
              onEdit={() => handleEdit(row)}
            />
          ))}
        </CardGrid>
      )}
      {/* Outside the empty state, which goes once the first record is in,
          so the dialog still gets to close */}
      <NewRecordDialog open={isNewOpen} onOpenChange={setIsNewOpen} />
      {/* Outside the grid, so deleting the last record doesn't cut its
          closing animation short */}
      {editingRow && (
        <EditRecordDialog
          key={editKey}
          row={editingRow}
          isFirst={rows[0]?.id === editingRow.id}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
        />
      )}
    </>
  );
};

export default RecordsGrid;
