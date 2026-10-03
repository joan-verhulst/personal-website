"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Placeholder } from "~/modules/cms/components/empty-state";
import Input from "~/modules/cms/components/input";
import ItemCard, { itemCardClass } from "~/modules/cms/components/item-card";
import Panel from "~/modules/cms/components/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import Toolbar from "~/modules/cms/components/toolbar";
import type { WallItemRow, WallTagRow } from "~/modules/content/utils/rows";
import cn from "~/utils/cn";

type Filter = "all" | "free";

interface ItemLibraryProps {
  items: WallItemRow[];
  tags: WallTagRow[];
  /** The row each item on the wall sits in, from 0. */
  rowOf: Map<string, number>;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  className?: string;
}

/**
 * Every wall item as a card in a strip, to drag onto a slot. Placing without
 * a mouse goes through a slot's picker instead, so the cards themselves do
 * nothing on a click.
 */
const ItemLibrary = ({
  items,
  tags,
  rowOf,
  onDragStart,
  onDragEnd,
  className,
}: ItemLibraryProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const stripId = useId();

  const free = items.filter((item) => !rowOf.has(item.id));
  const tagOf = (item: WallItemRow) =>
    tags.find((tag) => tag.id === item.tag_id);
  // Matches the tag too, like the search on the items page
  const needle = query.trim().toLowerCase();
  const shown = (filter === "free" ? free : items).filter(
    (item) =>
      !needle ||
      `${item.title} ${tagOf(item)?.label ?? ""}`.toLowerCase().includes(needle),
  );

  return (
    <Panel aria-labelledby={`${stripId}-title`} className={className}>
      {/* The title shares its row with the filter and search, which keeps the
          library short while it sticks above the rows */}
      <Toolbar
        start={
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id={`${stripId}-title`}>
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={stripId}
                onClick={() => setIsOpen(!isOpen)}
                className="flex cursor-pointer items-center gap-1.5 rounded-[10px] pr-1 font-medium text-neutral-950 text-sm focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
              >
                Library
                <ChevronDown
                  size={16}
                  aria-hidden
                  className={cn(
                    "text-neutral-600 transition-transform duration-150",
                    !isOpen && "-rotate-90",
                  )}
                />
              </button>
            </h2>
            <p className="text-neutral-600 text-xs tabular-nums leading-normal">
              {items.length - free.length} of {items.length} on the wall. Drag
              a card onto a slot, or tap a slot to choose one.
            </p>
          </div>
        }
        end={
          isOpen && (
            <>
              <Select
                value={filter}
                onValueChange={(value) => setFilter(value as Filter)}
              >
                <SelectTrigger
                  aria-label="Filter the library"
                  className="sm:w-44"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    All items ({items.length})
                  </SelectItem>
                  <SelectItem value="free">
                    Not on the wall ({free.length})
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input.Root className="sm:w-56">
                <Input.SearchField
                  aria-label="Search the library"
                  placeholder="Search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </Input.Root>
            </>
          )
        }
      />

      {/* Scrolls sideways, so the library stays short enough to keep in view
          above the rows while dragging */}
      <div id={stripId} hidden={!isOpen}>
        {shown.length ? (
          <ul
            // Focusable, so the strip can scroll from the keyboard too
            // biome-ignore lint/a11y/noNoninteractiveTabindex: see above
            tabIndex={0}
            aria-label="Library items"
            // Runs out to the container's edges, so cards scroll away under
            // its border instead of stopping short of it
            className="-mx-5 flex scroll-px-5 gap-2 overflow-x-auto px-5 pb-2 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:-outline-offset-2"
          >
            {shown.map((item) => {
              const row = rowOf.get(item.id);
              const onWall = row !== undefined;

              return (
                <li
                  key={item.id}
                  draggable
                  onDragStart={(event) => {
                    // Firefox only starts a drag that carries data
                    event.dataTransfer.setData("text/plain", item.id);
                    event.dataTransfer.effectAllowed = "move";
                    onDragStart(item.id);
                  }}
                  onDragEnd={onDragEnd}
                  className={cn(
                    itemCardClass,
                    "w-36 shrink-0 cursor-grab select-none transition-[border-color,opacity] duration-150 hover:border-neutral-950/20 active:cursor-grabbing",
                    onWall && "opacity-60 hover:opacity-100",
                  )}
                >
                  <ItemCard
                    item={item}
                    tag={tagOf(item)}
                    sizes="144px"
                    note={onWall ? `Row ${row + 1}` : undefined}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <Placeholder>
            {items.length
              ? needle
                ? "No items match that search."
                : "Every item is on the wall."
              : "No items yet. Add screenshots under Items first."}
          </Placeholder>
        )}
      </div>
    </Panel>
  );
};

export default ItemLibrary;
