"use client";

import { EyeOff } from "lucide-react";
import Badge from "~/modules/cms/components/badge";
import Panel from "~/modules/cms/components/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/modules/cms/components/primitives/select";
import RowControls from "~/modules/cms/components/row-controls";
import {
  LAYOUTS,
  WALL_LAYOUTS,
  type WallRowDraft,
} from "~/modules/cms/components/wall/wall-layouts";
import WallSlot, {
  type WallSlotProps,
} from "~/modules/cms/components/wall/wall-slot";
import type { WallLayout } from "~/modules/content/types";
import cn from "~/utils/cn";

// The rows at their real proportions: 13 columns of 4:3 units, as on the site.
// Phones stack the slots at 4:3 instead, like the site does.
const BLOCK_CLASSES: Record<WallLayout, string> = {
  spiral: "sm:aspect-[13/6] sm:grid-cols-13 sm:grid-rows-8",
  triple: "sm:aspect-[13/3.75] sm:grid-cols-13 sm:grid-rows-1",
  double: "sm:grid-cols-2",
};

// Where each slot sits, plain and mirrored. Spirals and triples stretch their
// slots to the grid, so they drop the 4:3 from a phone.
const SLOT_CLASSES: Record<WallLayout, { plain: string[]; mirrored: string[] }> =
  {
    spiral: {
      plain: [
        "sm:col-span-8 sm:col-start-1 sm:row-span-8 sm:row-start-1",
        "sm:col-span-5 sm:col-start-9 sm:row-span-5 sm:row-start-1",
        "sm:col-span-3 sm:col-start-9 sm:row-span-3 sm:row-start-6",
        "sm:col-span-2 sm:col-start-12 sm:row-span-3 sm:row-start-6",
      ],
      mirrored: [
        "sm:col-span-8 sm:col-start-6 sm:row-span-8 sm:row-start-1",
        "sm:col-span-5 sm:col-start-1 sm:row-span-5 sm:row-start-1",
        "sm:col-span-3 sm:col-start-3 sm:row-span-3 sm:row-start-6",
        "sm:col-span-2 sm:col-start-1 sm:row-span-3 sm:row-start-6",
      ],
    },
    triple: {
      plain: [
        "sm:col-span-5 sm:col-start-1 sm:row-start-1",
        "sm:col-span-5 sm:col-start-6 sm:row-start-1",
        "sm:col-span-3 sm:col-start-11 sm:row-start-1",
      ],
      mirrored: [
        "sm:col-span-5 sm:col-start-4 sm:row-start-1",
        "sm:col-span-5 sm:col-start-9 sm:row-start-1",
        "sm:col-span-3 sm:col-start-1 sm:row-start-1",
      ],
    },
    double: { plain: ["", ""], mirrored: ["", ""] },
  };

type SlotHandlers = Pick<WallSlotProps, "dragging">;

interface WallRowProps extends SlotHandlers {
  row: WallRowDraft;
  index: number;
  count: number;
  isMirrored: boolean;
  slotProps: (
    slot: number,
  ) => Omit<WallSlotProps, "size" | "rowLabel" | "className" | keyof SlotHandlers>;
  onLayout: (layout: WallLayout) => void;
  onMove: (direction: -1 | 1) => void;
  onDelete: () => void;
}

/**
 * One row of the wall in its own container: its name and controls on top,
 * then its slots.
 */
const WallRow = ({
  row,
  index,
  count,
  isMirrored,
  dragging,
  slotProps,
  onLayout,
  onMove,
  onDelete,
}: WallRowProps) => {
  const label = `Row ${index + 1}`;
  const titleId = `wall-row-${row.id}`;
  const empty = row.items.filter((id) => !id).length;
  const placement = SLOT_CLASSES[row.layout][isMirrored ? "mirrored" : "plain"];

  return (
    <Panel aria-labelledby={titleId}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3
          id={titleId}
          className="font-medium text-neutral-950 text-sm tabular-nums"
        >
          {label}
        </h3>
        <Select
          value={row.layout}
          onValueChange={(value) => onLayout(value as WallLayout)}
        >
          <SelectTrigger
            aria-label={`Layout of row ${index + 1}`}
            className="w-fit min-w-28"
          >
            {/* The label alone: the hint only helps while choosing */}
            <SelectValue>{LAYOUTS[row.layout].label}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {WALL_LAYOUTS.map((layout) => (
              <SelectItem key={layout} value={layout}>
                {LAYOUTS[layout].label}
                <span className="ml-2 font-normal text-neutral-600">
                  {LAYOUTS[layout].hint}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {empty > 0 && (
          <Badge tone="warning">
            <EyeOff aria-hidden />
            {empty} empty, hidden on the site
          </Badge>
        )}
        <RowControls
          className="ml-auto"
          isFirst={index === 0}
          isLast={index === count - 1}
          labels={{
            moveUp: `Move row ${index + 1} up`,
            moveDown: `Move row ${index + 1} down`,
            delete: `Delete row ${index + 1}`,
          }}
          onMoveUp={() => onMove(-1)}
          onMoveDown={() => onMove(1)}
          onDelete={onDelete}
        />
      </div>

      {/* A plain box around the grid, so the container's own layout can't
          pull the grid out of the row's exact proportions */}
      <div>
        <div
          className={cn("grid grid-cols-1 gap-2", BLOCK_CLASSES[row.layout])}
        >
          {LAYOUTS[row.layout].slots.map((size, slot) => (
            <WallSlot
              // biome-ignore lint/suspicious/noArrayIndexKey: slots are fixed places, their position is who they are
              key={slot}
              size={size}
              rowLabel={label}
              dragging={dragging}
              className={cn(
                placement[slot],
                row.layout !== "double" && "sm:aspect-auto",
              )}
              {...slotProps(slot)}
            />
          ))}
        </div>
      </div>
    </Panel>
  );
};

export default WallRow;
