"use client";

import { EyeOff, Pencil, Replace, X } from "lucide-react";
import { type ReactNode, useRef } from "react";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import { TagLabel } from "~/modules/cms/components/item-card";
import {
  Dialog,
  DialogClose,
  DialogShell,
} from "~/modules/cms/components/primitives/dialog";
import WallCardPreview from "~/modules/cms/components/wall/wall-card-preview";
import { toPreviewItem } from "~/modules/cms/utils/wall-preview";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";

interface SlotItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: WallItemRow;
  tag?: WallTagRow;
  /** Where it sits, like "Row 2, large slot". */
  place: string;
  /** Whether that row is hidden on the site, since a slot is empty. */
  isRowHidden: boolean;
  /** Other places it shows up, like "Experiments". */
  elsewhere: string[];
  onRemove: () => void;
  /** Runs once the dialog has closed, to choose another item for the slot. */
  onReplace: () => void;
}

const Detail = ({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) => (
  <div className="flex min-w-0 flex-col gap-1">
    <dt className="text-neutral-600 text-xs">{label}</dt>
    <dd className="font-medium text-neutral-950 text-xs">{children}</dd>
  </div>
);

/** A filled slot's item: a preview, its details and what to do with it. */
const SlotItemDialog = ({
  open,
  onOpenChange,
  item,
  tag,
  place,
  isRowHidden,
  elsewhere,
  onRemove,
  onReplace,
}: SlotItemDialogProps) => {
  const href = item ? `/admin/ui-ux/items/${item.id}` : "/admin/ui-ux/items";
  // Set by Replace, acted on once this dialog has closed and focus is back on
  // the slot. The picker then returns focus there too
  const isReplaceRequested = useRef(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogShell
        title={<span className="block truncate">{item?.title || "Untitled"}</span>}
        description={place}
        bodyClassName="flex flex-col gap-4"
        onCloseAutoFocus={() => {
          if (!isReplaceRequested.current) return;
          isReplaceRequested.current = false;
          onReplace();
        }}
        footerStart={
          // Takes it off the draft only, so it isn't a delete
          <Button
            variant="ghost"
            onClick={() => {
              onRemove();
              onOpenChange(false);
            }}
          >
            <X size={16} aria-hidden />
            Remove from wall
          </Button>
        }
        footer={
          <>
            <Button
              className="w-full sm:w-fit"
              onClick={() => {
                isReplaceRequested.current = true;
                onOpenChange(false);
              }}
            >
              <Replace size={16} aria-hidden />
              Replace
            </Button>
            <DialogClose asChild>
              <Button className="w-full sm:w-fit">Close</Button>
            </DialogClose>
            <Button variant="primary" href={href} className="w-full sm:w-fit">
              Edit item
              <Pencil size={16} aria-hidden />
            </Button>
          </>
        }
      >
        {/* The card as the site shows it, the same as on the item's own page */}
        {item && (
          <WallCardPreview
            item={toPreviewItem(item, tag ? [tag] : [])}
            className="shrink-0"
          />
        )}

        {isRowHidden && (
          <Badge tone="warning" className="shrink-0 whitespace-normal">
            <EyeOff aria-hidden />
            This row is hidden on the site until every slot is filled
          </Badge>
        )}

        <dl className="flex shrink-0 flex-col gap-3">
          <Detail label="Tag">
            <TagLabel tag={tag} />
          </Detail>
          <Detail label="Type">
            {item?.media_type === "video" ? "Video" : "Image"}
            {item?.width && item.height ? `, ${item.width}×${item.height}` : ""}
          </Detail>
          <Detail label="Also used in">
            {elsewhere.length ? (
              elsewhere.join(", ")
            ) : (
              <span className="font-normal text-neutral-600">Nowhere else</span>
            )}
          </Detail>
        </dl>
      </DialogShell>
    </Dialog>
  );
};

export default SlotItemDialog;
