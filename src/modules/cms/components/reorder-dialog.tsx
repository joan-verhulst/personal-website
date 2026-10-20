"use client";

import { ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import {
  type DragEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Button from "~/modules/cms/components/button";
import {
  type ConfirmOptions,
  useConfirm,
} from "~/modules/cms/components/confirm";
import {
  Dialog,
  DialogClose,
  DialogShell,
} from "~/modules/cms/components/primitives/dialog";
import cn from "~/utils/cn";

export interface ReorderItem {
  id: string;
  title: string;
  thumbnail?: ReactNode;
}

interface ReorderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  items: ReorderItem[];
  onSave: (ids: string[]) => Promise<boolean> | boolean;
  saveLabel?: string;
  isPending?: boolean;
}

const DISCARD_ORDER: ConfirmOptions = {
  title: "Discard the new order?",
  description: "The order you made here isn't saved yet.",
  confirmLabel: "Discard",
  cancelLabel: "Keep editing",
  tone: "danger",
};

const move = (ids: string[], from: number, to: number) => {
  const next = [...ids];
  const [id] = next.splice(from, 1);
  next.splice(to, 0, id);
  return next;
};

const ReorderDialog = ({
  open,
  onOpenChange,
  title,
  description = "Drag the rows, or use their arrow buttons, to change the order.",
  items,
  onSave,
  saveLabel = "Save order",
  isPending,
}: ReorderDialogProps) => {
  const confirm = useConfirm();
  const [order, setOrder] = useState(() => items.map((item) => item.id));
  const [wasOpen, setWasOpen] = useState(open);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const listRef = useRef<HTMLOListElement>(null);
  const focusAfterMove = useRef<{
    id: string;
    direction: "up" | "down";
  } | null>(null);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setOrder(items.map((item) => item.id));
      setAnnouncement("");
    }
  }

  const byId = new Map(items.map((item) => [item.id, item]));
  const rows = [
    ...order.flatMap((id) => byId.get(id) ?? []),
    ...items.filter((item) => !order.includes(item.id)),
  ];
  const isChanged =
    rows.length !== items.length ||
    rows.some((row, index) => row.id !== items[index]?.id);

  // Moving a row moves its DOM node, which can drop focus, so the button
  // that moved it gets focus back. At the top or bottom that button turns
  // off, so its neighbour gets it instead.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after each move
  useEffect(() => {
    const target = focusAfterMove.current;
    if (!target) return;
    focusAfterMove.current = null;

    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
      `[data-row="${CSS.escape(target.id)}"] [data-move]`,
    );
    if (!buttons) return;
    const [up, down] = Array.from(buttons);
    const preferred = target.direction === "up" ? up : down;
    (preferred?.disabled ? (preferred === up ? down : up) : preferred)?.focus();
  }, [order]);

  const moveBy = (index: number, offset: -1 | 1) => {
    const row = rows[index];
    const to = index + offset;
    if (!row || to < 0 || to >= rows.length) return;

    focusAfterMove.current = {
      id: row.id,
      direction: offset < 0 ? "up" : "down",
    };
    setOrder(
      move(
        rows.map((item) => item.id),
        index,
        to,
      ),
    );
    setAnnouncement(
      `"${row.title}" moved to position ${to + 1} of ${rows.length}.`,
    );
  };

  const endDrag = () => {
    setDragId(null);
    setDropIndex(null);
  };

  const handleDragOver = (event: DragEvent<HTMLLIElement>, index: number) => {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    const rect = event.currentTarget.getBoundingClientRect();
    const isBelow = event.clientY > rect.top + rect.height / 2;
    setDropIndex(isBelow ? index + 1 : index);
  };

  const handleDrop = (event: DragEvent<HTMLOListElement>) => {
    event.preventDefault();
    const from = rows.findIndex((row) => row.id === dragId);

    if (from !== -1 && dropIndex !== null) {
      const to = dropIndex > from ? dropIndex - 1 : dropIndex;
      if (to !== from) {
        setOrder(
          move(
            rows.map((row) => row.id),
            from,
            to,
          ),
        );
        setAnnouncement(
          `"${rows[from].title}" moved to position ${to + 1} of ${rows.length}.`,
        );
      }
    }
    endDrag();
  };

  const handleSave = async () => {
    const isSaved = await onSave(rows.map((row) => row.id));
    if (isSaved) onOpenChange(false);
  };

  const fromIndex = rows.findIndex((row) => row.id === dragId);
  const indicatorIndex =
    dropIndex === null || dropIndex === fromIndex || dropIndex === fromIndex + 1
      ? null
      : dropIndex;

  const handleOpenChange = async (isOpen: boolean) => {
    if (!isOpen && isPending) return;
    if (!isOpen && isChanged && !(await confirm(DISCARD_ORDER))) return;
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogShell
        size="compact"
        title={title}
        description={description}
        onEscapeKeyDown={(event) => {
          if (isPending) event.preventDefault();
        }}
        onInteractOutside={(event) => {
          // A stray click next to the dialog never throws a new order away
          if (isPending || isChanged) event.preventDefault();
        }}
        footer={
          <>
            <DialogClose asChild>
              <Button className="w-full sm:w-fit" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="primary"
              className="w-full sm:w-fit"
              isPending={isPending}
              disabled={!isChanged}
              onClick={handleSave}
            >
              {saveLabel}
            </Button>
          </>
        }
      >
        {rows.length === 0 ? (
          <p className="text-neutral-600 text-xs">Nothing to reorder yet.</p>
        ) : (
          <ol
            ref={listRef}
            className="flex flex-col gap-2"
            onDragOver={(event) => {
              if (dragId) event.preventDefault();
            }}
            onDrop={handleDrop}
            onDragLeave={(event) => {
              const to = event.relatedTarget as Node | null;
              if (!event.currentTarget.contains(to)) setDropIndex(null);
            }}
          >
            {rows.map((row, index) => (
              <li
                key={row.id}
                data-row={row.id}
                draggable={!isPending}
                onDragStart={(event) => {
                  event.dataTransfer.effectAllowed = "move";
                  // Firefox only starts a drag that carries some data
                  event.dataTransfer.setData("text/plain", row.id);
                  setDragId(row.id);
                }}
                onDragOver={(event) => handleDragOver(event, index)}
                onDragEnd={endDrag}
                className={cn(
                  "relative flex min-w-0 items-center gap-3 rounded-xl border border-neutral-950/10 bg-white p-2 transition-opacity",
                  !isPending && "cursor-grab active:cursor-grabbing",
                  dragId === row.id && "opacity-50",
                )}
              >
                {indicatorIndex === index && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 -top-[5px] h-0.5 rounded-full bg-primary-500"
                  />
                )}
                {indicatorIndex === rows.length &&
                  index === rows.length - 1 && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 -bottom-[5px] h-0.5 rounded-full bg-primary-500"
                    />
                  )}

                <GripVertical
                  size={16}
                  aria-hidden
                  className="shrink-0 text-neutral-400"
                />
                {row.thumbnail && (
                  // The image can't be dragged on its own, so grabbing it
                  // drags the row
                  <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100 [&>*]:size-full [&_img]:pointer-events-none [&_img]:size-full [&_img]:object-cover [&_video]:size-full [&_video]:object-cover">
                    {row.thumbnail}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-neutral-950 text-xs">
                  {row.title}
                </span>
                <span className="w-6 shrink-0 text-right text-neutral-600 text-xs tabular-nums">
                  <span className="sr-only">Position </span>
                  {index + 1}
                </span>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    data-move="up"
                    aria-label={`Move "${row.title}" up`}
                    disabled={index === 0 || isPending}
                    onClick={() => moveBy(index, -1)}
                  >
                    <ArrowUp size={16} aria-hidden />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    data-move="down"
                    aria-label={`Move "${row.title}" down`}
                    disabled={index === rows.length - 1 || isPending}
                    onClick={() => moveBy(index, 1)}
                  >
                    <ArrowDown size={16} aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p aria-live="polite" className="sr-only">
          {announcement}
        </p>
      </DialogShell>
    </Dialog>
  );
};

export default ReorderDialog;
