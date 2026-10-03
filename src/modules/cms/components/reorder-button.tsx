"use client";

import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import Button from "~/modules/cms/components/button";
import ReorderDialog, {
  type ReorderItem,
} from "~/modules/cms/components/reorder-dialog";

interface ReorderButtonProps {
  /** The dialog's title, like "Reorder photos". */
  title: string;
  description?: string;
  /** In their current order. */
  items: ReorderItem[];
  /** Gets every id in the new order. Return true to close the dialog. */
  onSave: (ids: string[]) => Promise<boolean> | boolean;
  /** The dialog's main button. "Save order" unless the order saves later. */
  saveLabel?: string;
  isPending?: boolean;
  disabled?: boolean;
}

/**
 * The Reorder button of a collection or a list, with the dialog it opens.
 *
 * @example
 * <ReorderButton
 *   title="Reorder records"
 *   items={records.map((row) => ({ id: row.id, title: row.title }))}
 *   onSave={async (ids) => !!(await run(() => reorderRecords(ids), "Order saved"))}
 *   isPending={isPending}
 * />
 */
const ReorderButton = ({
  title,
  description,
  items,
  onSave,
  saveLabel,
  isPending,
  disabled,
}: ReorderButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        // One item or none has no order to change
        disabled={items.length < 2 || disabled}
        onClick={() => setOpen(true)}
      >
        <ArrowUpDown size={16} aria-hidden />
        Reorder
      </Button>
      <ReorderDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        description={description}
        items={items}
        onSave={onSave}
        saveLabel={saveLabel}
        isPending={isPending}
      />
    </>
  );
};

export default ReorderButton;
