"use client";

import { type ReactNode, useRef, useState } from "react";
import Badge from "~/modules/cms/components/badge";
import Button from "~/modules/cms/components/button";
import { cardGridClass } from "~/modules/cms/components/card-grid";
import { Placeholder } from "~/modules/cms/components/empty-state";
import Input from "~/modules/cms/components/input";
import ItemCard, { itemCardClass } from "~/modules/cms/components/item-card";
import {
  Dialog,
  DialogClose,
  DialogShell,
} from "~/modules/cms/components/primitives/dialog";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";
import cn from "~/utils/cn";

interface ItemPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  items: WallItemRow[];
  tags: WallTagRow[];
  /** Why an item can't be picked here, shown on its card. */
  disabledReason?: (item: WallItemRow) => string | undefined;
  /** A short label on a card, like where the item sits now. */
  note?: (item: WallItemRow) => string | undefined;
  /** Gets the picked item's id. The dialog closes itself afterwards. */
  onPick: (id: string) => void;
}

/**
 * A searchable grid of wall items to choose one from: the keyboard and touch
 * way to fill a slot or a list, next to dragging.
 *
 * @example
 * <ItemPickerDialog
 *   open={isPicking}
 *   onOpenChange={setIsPicking}
 *   title="Add to the experiments"
 *   items={items}
 *   tags={tags}
 *   disabledReason={(item) => (list.includes(item.id) ? "Already in the list" : undefined)}
 *   onPick={(id) => setList([...list, id])}
 * />
 */
const ItemPickerDialog = ({
  open,
  onOpenChange,
  title,
  description,
  items,
  tags,
  disabledReason,
  note,
  onPick,
}: ItemPickerDialogProps) => {
  const [query, setQuery] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const contentRef = useRef<HTMLDivElement>(null);

  // Every opening starts with an empty search
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setQuery("");
  }

  const tagOf = (item: WallItemRow) =>
    tags.find((tag) => tag.id === item.tag_id);
  // Matches the tag too, like the search on the items page
  const needle = query.trim().toLowerCase();
  const shown = items.filter(
    (item) =>
      !needle ||
      `${item.title} ${tagOf(item)?.label ?? ""}`.toLowerCase().includes(needle),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogShell
        ref={contentRef}
        title={title}
        description={description}
        onOpenAutoFocus={(event) => {
          // Focus on the search field would bring up a phone's keyboard, over
          // half the grid, before anything is typed
          if (!window.matchMedia("(pointer: coarse)").matches) return;
          event.preventDefault();
          contentRef.current?.focus();
        }}
        // Only the grid scrolls, so the search stays in reach
        toolbar={
          <Input.SearchField
            aria-label="Search items"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        }
        footer={
          <DialogClose asChild>
            <Button className="w-full sm:w-fit">Cancel</Button>
          </DialogClose>
        }
      >
        {shown.length ? (
          // Four cards per row in the full dialog, fewer when it's narrower
          <ul className={cardGridClass("compact")}>
            {shown.map((item) => {
              const reason = disabledReason?.(item);
              const label = note?.(item);

              return (
                <li key={item.id} className="flex min-w-0">
                  <button
                    type="button"
                    // Still focusable when it can't be picked, so the reason
                    // can be read out
                    aria-disabled={reason ? true : undefined}
                    onClick={() => {
                      if (reason) return;
                      onPick(item.id);
                      onOpenChange(false);
                    }}
                    className={cn(
                      itemCardClass,
                      "w-full text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
                      reason
                        ? "cursor-not-allowed"
                        : "cursor-pointer hover:border-primary-500 hover:bg-primary-50/40",
                    )}
                  >
                    <ItemCard
                      item={item}
                      tag={tagOf(item)}
                      sizes="180px"
                      isDimmed={Boolean(reason)}
                      overlay={
                        label && (
                          <Badge
                            tone="primary"
                            className="absolute bottom-1.5 left-1.5"
                          >
                            {label}
                          </Badge>
                        )
                      }
                    >
                      {reason && (
                        <span className="text-warning-800 text-xs leading-normal">
                          {reason}
                        </span>
                      )}
                    </ItemCard>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <Placeholder>
            {items.length
              ? "No items match that search."
              : "No items yet. Add screenshots under Items first."}
          </Placeholder>
        )}
      </DialogShell>
    </Dialog>
  );
};

export default ItemPickerDialog;
