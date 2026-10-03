"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { saveWall, saveWallList } from "~/modules/cms/actions/wall";
import AdminLink from "~/modules/cms/components/admin-link";
import Button from "~/modules/cms/components/button";
import { useConfirm } from "~/modules/cms/components/confirm";
import Header from "~/modules/cms/components/header";
import Panel from "~/modules/cms/components/panel";
import SaveActions from "~/modules/cms/components/shell/save-actions";
import StatCard from "~/modules/cms/components/stat-card";
import {
  ExperimentsEditor,
  HighlightsEditor,
} from "~/modules/cms/components/wall/home-lists";
import ItemLibrary from "~/modules/cms/components/wall/item-library";
import ItemPickerDialog from "~/modules/cms/components/wall/item-picker-dialog";
import SlotItemDialog from "~/modules/cms/components/wall/slot-item-dialog";
import {
  emptySlots,
  fits,
  isComplete,
  isMirrored,
  LAYOUTS,
  placeItem,
  placements,
  relayout,
  SLOT_LABELS,
  WALL_LAYOUTS,
  type WallRowDraft,
} from "~/modules/cms/components/wall/wall-layouts";
import WallRow from "~/modules/cms/components/wall/wall-row";
import type { WallSlotProps } from "~/modules/cms/components/wall/wall-slot";
import { isSessionError, useAction } from "~/modules/cms/hooks/use-action";
import { move } from "~/modules/cms/hooks/use-reorder";
import { useUnsavedWarning } from "~/modules/cms/hooks/use-unsaved-warning";
import { describeUsage } from "~/modules/cms/utils/wall-preview";
import { WALL_SLOTS, type WallLayout } from "~/modules/content/types";
import type {
  WallBlockRow,
  WallItemRow,
  WallListRow,
  WallTagRow,
} from "~/modules/content/utils/rows";

// randomUUID only exists on https and localhost, so there's a fallback for a
// dev server opened over the network
const newId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (digit) =>
        (
          Number(digit) ^
          (crypto.getRandomValues(new Uint8Array(1))[0] &
            (15 >> (Number(digit) / 4)))
        ).toString(16),
      );

/**
 * The saved rows as drafts. Slots pointing at a deleted item, or at an item
 * that's already higher up, become empty.
 */
const toDrafts = (
  blocks: WallBlockRow[],
  known: Map<string, WallItemRow>,
): WallRowDraft[] => {
  const seen = new Set<string>();
  return blocks.map((block) => ({
    id: block.id,
    layout: block.layout,
    items: Array.from({ length: WALL_SLOTS[block.layout] }, (_, slot) => {
      const id = block.items[slot] ?? "";
      if (!known.has(id) || seen.has(id)) return "";
      seen.add(id);
      return id;
    }),
  }));
};

const signature = (rows: WallRowDraft[]) =>
  JSON.stringify(rows.map((row) => [row.id, row.layout, row.items]));

const listSignature = (list: string[]) => JSON.stringify(list);

/**
 * What's being edited, next to what the database holds. Fresh data from the
 * server replaces the draft, unless there are edits that would be lost.
 */
const useDraft = <T,>(incoming: T, keyOf: (value: T) => string) => {
  const incomingKey = keyOf(incoming);
  const [value, setValue] = useState(incoming);
  // What the database holds, as far as this screen knows
  const [saved, setSaved] = useState(incomingKey);
  const [loaded, setLoaded] = useState(incomingKey);
  const key = keyOf(value);
  const isDirty = key !== saved;

  if (incomingKey !== loaded) {
    setLoaded(incomingKey);
    setSaved(incomingKey);
    if (!isDirty) setValue(incoming);
  }

  return {
    value,
    setValue,
    key,
    isDirty,
    /** After a save: what was sent is what the database holds now. */
    markSaved: setSaved,
    reset: () => setValue(incoming),
  };
};

// The parts of the page that save on their own, as a failed save names them
const PART_LABELS = {
  rows: "Rows",
  highlights: "Highlights",
  experiments: "Experiments",
} as const;

type Part = keyof typeof PART_LABELS;

/** A slot a dialog is open for. Rows go by id, since they can move. */
interface SlotRef {
  rowId: string;
  slot: number;
}

/** A filled slot's dialog also holds the item that sat in it then. */
interface OpenSlot extends SlotRef {
  itemId: string;
}

interface Props {
  items: WallItemRow[];
  tags: WallTagRow[];
  blocks: WallBlockRow[];
  lists: WallListRow[];
}

/**
 * The UI/UX wall screen, top to bottom: the item library, the rows with their
 * fixed slots, then the home highlights and experiments, each in its own
 * container. The one Save in the bottom bar saves whichever of the three
 * changed.
 */
const WallEditor = ({ items, tags, blocks, lists }: Props) => {
  const { run, isPending } = useAction();
  const confirm = useConfirm();
  const router = useRouter();

  const itemsById = useMemo(
    () => new Map(items.map((item) => [item.id, item])),
    [items],
  );
  const tagsById = useMemo(
    () => new Map(tags.map((tag) => [tag.id, tag])),
    [tags],
  );
  const incoming = useMemo(
    () => toDrafts(blocks, itemsById),
    [blocks, itemsById],
  );
  const rowsDraft = useDraft(incoming, signature);
  const { value: rows, setValue: setRows } = rowsDraft;

  // The two home lists are drafts too, saved by the same button
  const savedLists = useMemo(() => {
    const listItems = (id: string) =>
      lists.find((list) => list.id === id)?.items ?? [];
    const highlights = listItems("highlights");
    return {
      // Always two places, an empty one is ""
      highlights: [highlights[0] ?? "", highlights[1] ?? ""],
      experiments: listItems("experiments"),
    };
  }, [lists]);
  const highlightsDraft = useDraft(savedLists.highlights, listSignature);
  const experimentsDraft = useDraft(savedLists.experiments, listSignature);

  // The site needs both highlights, so one on its own waits
  const isHighlightsComplete = highlightsDraft.value.every(Boolean);
  const canSaveHighlights = highlightsDraft.isDirty && isHighlightsComplete;
  const isDirty =
    rowsDraft.isDirty || highlightsDraft.isDirty || experimentsDraft.isDirty;

  // Asks before the tab closes or a link leaves the page, like Edit item
  useUnsavedWarning(isDirty);

  // What's being dragged. A ref, since dragover fires too often for state.
  const dragRef = useRef<string | null>(null);
  // The slots the two dialogs are open for. Kept after closing, so a dialog
  // keeps its content during the exit animation.
  const [viewing, setViewing] = useState<OpenSlot | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [pickingFor, setPickingFor] = useState<SlotRef | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const placed = placements(rows);
  const rowOf = new Map(
    [...placed].map(([id, { row }]) => [id, row] as const),
  );
  const isVideo = (id: string) => itemsById.get(id)?.media_type === "video";
  const titleOf = (id: string) => itemsById.get(id)?.title || "Untitled";

  const place = (id: string, rowIndex: number, slot: number) => {
    const result = placeItem(rows, id, rowIndex, slot, isVideo, titleOf);
    if ("error" in result) {
      toast.error(result.error);
      return false;
    }
    setRows(result.rows);
    return true;
  };

  const clearSlot = (rowIndex: number, slot: number) =>
    setRows(
      rows.map((other, index) =>
        index === rowIndex
          ? {
              ...other,
              items: other.items.map((current, at) =>
                at === slot ? "" : current,
              ),
            }
          : other,
      ),
    );

  const slotProps =
    (rowIndex: number) =>
    (
      slot: number,
    ): Omit<WallSlotProps, "size" | "rowLabel" | "className" | "dragging"> => {
      const row = rows[rowIndex];
      const id = row.items[slot];
      const item = id ? itemsById.get(id) : undefined;

      return {
        item,
        tag: item ? tagsById.get(item.tag_id ?? "") : undefined,
        // Fits here, and whatever it swaps with fits where it came from
        accepts: (candidate) => {
          if (!fits(candidate, row.layout, slot, isVideo)) return false;
          const from = placed.get(candidate);
          return !(
            from &&
            id &&
            !fits(id, rows[from.row].layout, from.slot, isVideo)
          );
        },
        onDragStart: () => {
          dragRef.current = id;
        },
        onDragEnd: () => {
          dragRef.current = null;
        },
        onDrop: () => {
          const dragged = dragRef.current;
          dragRef.current = null;
          if (dragged) place(dragged, rowIndex, slot);
        },
        onOpen: () => {
          if (item) {
            setViewing({ rowId: row.id, slot, itemId: item.id });
            setIsViewOpen(true);
          } else {
            setPickingFor({ rowId: row.id, slot });
            setIsPickerOpen(true);
          }
        },
        onRemove: () => clearSlot(rowIndex, slot),
      };
    };

  // Puts a row back as it was, minus items that went elsewhere since
  const restoreRow = (previous: WallRowDraft) =>
    setRows((current) => {
      const taken = placements(
        current.filter((other) => other.id !== previous.id),
      );
      const restored = {
        ...previous,
        items: previous.items.map((id) => (taken.has(id) ? "" : id)),
      };
      return current.map((other) =>
        other.id === previous.id ? restored : other,
      );
    });

  const setLayout = (rowIndex: number, layout: WallLayout) => {
    const previous = rows[rowIndex];
    if (previous.layout === layout) return;
    const { row, leftOver } = relayout(previous, layout, isVideo);
    setRows(rows.map((other, index) => (index === rowIndex ? row : other)));
    // A smaller layout can drop items: Undo brings them back
    if (leftOver.length) {
      toast(`${leftOver.map(titleOf).join(", ")} went back to the library`, {
        // Long enough to decide on
        duration: 10000,
        action: { label: "Undo", onClick: () => restoreRow(previous) },
      });
    }
  };

  const deleteRow = async (rowIndex: number) => {
    const removed = rows[rowIndex];
    const isConfirmed = await confirm({
      title: `Delete row ${rowIndex + 1}?`,
      description: `${
        removed.items.some(Boolean) ? "Its items go back to the library. " : ""
      }The site doesn't change until you save.`,
      confirmLabel: "Delete row",
      tone: "danger",
    });
    if (!isConfirmed) return;

    setRows((current) => current.filter((row) => row.id !== removed.id));
    toast(`Row ${rowIndex + 1} deleted`, {
      // Long enough to decide on
      duration: 10000,
      action: {
        label: "Undo",
        onClick: () =>
          setRows((current) => {
            // Items placed elsewhere since then stay where they are now
            const taken = placements(current);
            const restored = {
              ...removed,
              items: removed.items.map((id) => (taken.has(id) ? "" : id)),
            };
            return [
              ...current.slice(0, rowIndex),
              restored,
              ...current.slice(rowIndex),
            ];
          }),
      },
    });
  };

  const addRow = (layout: WallLayout) =>
    setRows([...rows, { id: newId(), layout, items: emptySlots(layout) }]);

  // Saves the parts that changed, one after the other. A part that fails
  // stays unsaved and is named in the toast, the others still go through
  const onSave = async () => {
    const drafts = {
      rows: rowsDraft,
      highlights: highlightsDraft,
      experiments: experimentsDraft,
    };
    const actions: Record<Part, () => ReturnType<typeof saveWall>> = {
      rows: () => saveWall(rows),
      highlights: () => saveWallList("highlights", highlightsDraft.value),
      experiments: () => saveWallList("experiments", experimentsDraft.value),
    };
    const parts = (Object.keys(drafts) as Part[]).filter((part) =>
      part === "highlights" ? canSaveHighlights : drafts[part].isDirty,
    );
    // The drafts as they're sent, since they can change while the save runs
    const sent = Object.fromEntries(
      parts.map((part) => [part, drafts[part].key]),
    );
    const done: Part[] = [];

    const result = await run(async () => {
      const failures: string[] = [];
      for (const part of parts) {
        const { error } = await actions[part]();
        if (!error) done.push(part);
        // Signed out, or without a code, fails every part the same way, so
        // it's said once
        else if (isSessionError(error)) return { error };
        else failures.push(`${PART_LABELS[part]}: ${error}`);
      }
      return failures.length ? { error: failures.join(" ") } : {};
    }, false);

    for (const part of done) drafts[part].markSaved(sent[part]);

    if (!result) {
      // The parts that did save changed the site, so the screen reloads
      if (done.length) router.refresh();
      return;
    }
    toast.success(
      highlightsDraft.isDirty && !canSaveHighlights
        ? "Saved, except the highlights: pick both first"
        : "Saved",
    );
  };

  const onDiscard = async () => {
    const isConfirmed = await confirm({
      title: "Discard your changes?",
      description:
        "The rows, the highlights and the experiments go back to how they were last saved.",
      confirmLabel: "Discard",
      cancelLabel: "Keep editing",
      tone: "danger",
    });
    if (!isConfirmed) return;
    rowsDraft.reset();
    highlightsDraft.reset();
    experimentsDraft.reset();
  };

  const hiddenRows = rows.filter((row) => !isComplete(row)).length;

  // The dialogs find their row by id, since rows can move while one is open
  const viewedIndex = viewing
    ? rows.findIndex((row) => row.id === viewing.rowId)
    : -1;
  const viewedRow = rows[viewedIndex];
  const viewedItem = viewing ? itemsById.get(viewing.itemId) : undefined;
  const pickIndex = pickingFor
    ? rows.findIndex((row) => row.id === pickingFor.rowId)
    : -1;
  const pickRow = rows[pickIndex];
  const slotName = (rowIndex: number, slot: number) => {
    const size = LAYOUTS[rows[rowIndex].layout].slots[slot];
    return `Row ${rowIndex + 1}, ${SLOT_LABELS[size].toLowerCase()} slot`;
  };

  return (
    <>
      <Header
        title="Wall"
        description={
          <>
            Rows of fixed slots, mirrored every other row like on the site.
            Drag an item onto a slot, or click a slot to choose one. Drag a
            filled slot onto another to swap them. New screenshots are added
            under{" "}
            <AdminLink
              href="/admin/ui-ux/items"
              className="rounded-sm font-medium text-primary-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              Items
            </AdminLink>
            .
          </>
        }
        stats={
          <>
            <StatCard label="Rows" value={rows.length} />
            <StatCard
              label="Items on the wall"
              value={`${placed.size} of ${items.length}`}
            />
            <StatCard label="Hidden rows, not filled yet" value={hiddenRows} />
          </>
        }
      />

      {/* Sticks to the top of the scrolling panel on wider screens, so a card
          can be dragged to a row far below. The white strip around it fills
          the page's own gaps above and below, and hides the rows scrolling
          underneath. */}
      <div className="md:sticky md:top-0 md:z-20 md:-my-4 md:bg-white md:py-4">
        <ItemLibrary
          items={items}
          tags={tags}
          rowOf={rowOf}
          onDragStart={(id) => {
            dragRef.current = id;
          }}
          onDragEnd={() => {
            dragRef.current = null;
          }}
        />
      </div>

      {/* Every row is its own container. Left out when there are none, so an
          empty wall doesn't leave a double gap. */}
      {rows.length > 0 && (
        <section
          aria-labelledby="wall-rows-title"
          className="flex flex-col gap-4"
        >
          <h2 id="wall-rows-title" className="sr-only">
            Rows
          </h2>
          {rows.map((row, index) => (
            <WallRow
              key={row.id}
              row={row}
              index={index}
              count={rows.length}
              isMirrored={isMirrored(rows, index)}
              dragging={() => dragRef.current}
              slotProps={slotProps(index)}
              onLayout={(layout) => setLayout(index, layout)}
              onMove={(direction) => setRows(move(rows, index, direction))}
              onDelete={() => deleteRow(index)}
            />
          ))}
        </section>
      )}

      <Panel
        title="Add a row"
        description={
          rows.length
            ? "A new row goes at the bottom. It stays hidden on the site until every slot is filled."
            : "The wall is empty. Add a row to start."
        }
        actions={WALL_LAYOUTS.map((layout) => (
          <Button key={layout} onClick={() => addRow(layout)}>
            <Plus size={16} aria-hidden />
            {LAYOUTS[layout].label} row
            <span className="hidden font-normal text-neutral-600 sm:inline">
              {LAYOUTS[layout].hint}
            </span>
          </Button>
        ))}
      />

      <HighlightsEditor
        items={items}
        tags={tags}
        value={highlightsDraft.value}
        onChange={highlightsDraft.setValue}
        isPending={isPending}
      />
      <ExperimentsEditor
        items={items}
        tags={tags}
        value={experimentsDraft.value}
        onChange={experimentsDraft.setValue}
        isPending={isPending}
      />

      {/* The page's one Save, in the bottom bar in place of the + button.
          Discard is here only: this page builds up a draft in many steps */}
      <SaveActions
        isDirty={isDirty}
        isPending={isPending}
        // Half-picked highlights alone leave nothing to save yet
        isDisabled={
          !rowsDraft.isDirty && !experimentsDraft.isDirty && !canSaveHighlights
        }
        onSave={onSave}
        start={
          isDirty && (
            <Button variant="ghost" disabled={isPending} onClick={onDiscard}>
              Discard
            </Button>
          )
        }
      />

      <SlotItemDialog
        open={isViewOpen && Boolean(viewedRow)}
        onOpenChange={setIsViewOpen}
        item={viewedItem}
        tag={viewedItem ? tagsById.get(viewedItem.tag_id ?? "") : undefined}
        place={viewing && viewedRow ? slotName(viewedIndex, viewing.slot) : ""}
        isRowHidden={viewedRow ? !isComplete(viewedRow) : false}
        // The lists only: the wall is the slot itself
        elsewhere={viewing ? describeUsage(viewing.itemId, [], lists) : []}
        onRemove={() => {
          // Only when the item is still there, not one swapped in since
          if (viewing && viewedRow?.items[viewing.slot] === viewing.itemId) {
            clearSlot(viewedIndex, viewing.slot);
          }
        }}
        // The keyboard and touch way to put another item in a filled slot
        onReplace={() => {
          if (!viewing) return;
          setPickingFor({ rowId: viewing.rowId, slot: viewing.slot });
          setIsPickerOpen(true);
        }}
      />

      <ItemPickerDialog
        open={isPickerOpen && Boolean(pickRow)}
        onOpenChange={setIsPickerOpen}
        title={
          pickingFor && pickRow
            ? `Choose an item for ${slotName(pickIndex, pickingFor.slot).toLowerCase()}`
            : "Choose an item"
        }
        description={
          pickingFor && pickRow?.items[pickingFor.slot]
            ? "An item that's already on the wall swaps places with the one in this slot."
            : "An item that's already on the wall moves here, and its old slot empties."
        }
        items={items}
        tags={tags}
        disabledReason={(item) =>
          pickingFor &&
          pickRow &&
          !fits(item.id, pickRow.layout, pickingFor.slot, isVideo)
            ? "Videos can't go in a small slot"
            : undefined
        }
        note={(item) => {
          const row = rowOf.get(item.id);
          return row === undefined ? undefined : `On the wall, row ${row + 1}`;
        }}
        onPick={(id) => {
          if (!pickingFor || !pickRow) return;
          const from = placed.get(id);
          if (place(id, pickIndex, pickingFor.slot) && from) {
            toast(`${titleOf(id)} moved here from row ${from.row + 1}`);
          }
        }}
      />
    </>
  );
};

export default WallEditor;
