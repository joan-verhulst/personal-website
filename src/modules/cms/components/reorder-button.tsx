"use client";

import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import Button from "~/modules/cms/components/button";
import ReorderDialog, {
  type ReorderItem,
} from "~/modules/cms/components/reorder-dialog";

interface ReorderButtonProps {
  title: string;
  description?: string;
  items: ReorderItem[];
  onSave: (ids: string[]) => Promise<boolean> | boolean;
  saveLabel?: string;
  isPending?: boolean;
  disabled?: boolean;
}

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
