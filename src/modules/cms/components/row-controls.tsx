"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { ReactElement } from "react";
import Button from "~/modules/cms/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/modules/cms/components/primitives/tooltip";
import cn from "~/utils/cn";

export interface RowControlsLabels {
  moveUp?: string;
  moveDown?: string;
  delete?: string;
}

interface RowControlsProps {
  /** Each control only shows when its handler is given. */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  /** Blocks every control while a save runs, so moves can't overtake it. */
  isPending?: boolean;
  labels?: RowControlsLabels;
  className?: string;
}

const WithTooltip = ({
  label,
  children,
}: {
  label: string;
  children: ReactElement;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <TooltipContent>{label}</TooltipContent>
  </Tooltip>
);

/**
 * The move up, move down and delete buttons at the end of a list row.
 *
 * @example
 * <RowControls
 *   isFirst={index === 0}
 *   isLast={index === rows.length - 1}
 *   isPending={isPending}
 *   onMoveUp={() => onMove(-1)}
 *   onMoveDown={() => onMove(1)}
 *   onDelete={() => setConfirming(true)}
 * />
 */
const RowControls = ({
  onMoveUp,
  onMoveDown,
  onDelete,
  isFirst,
  isLast,
  isPending,
  labels,
  className,
}: RowControlsProps) => {
  const moveUpLabel = labels?.moveUp ?? "Move up";
  const moveDownLabel = labels?.moveDown ?? "Move down";
  const deleteLabel = labels?.delete ?? "Delete";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {onMoveUp && (
        <WithTooltip label={moveUpLabel}>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={moveUpLabel}
            disabled={isFirst || isPending}
            onClick={onMoveUp}
          >
            <ArrowUp size={16} />
          </Button>
        </WithTooltip>
      )}
      {onMoveDown && (
        <WithTooltip label={moveDownLabel}>
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={moveDownLabel}
            disabled={isLast || isPending}
            onClick={onMoveDown}
          >
            <ArrowDown size={16} />
          </Button>
        </WithTooltip>
      )}
      {onDelete && (
        <WithTooltip label={deleteLabel}>
          <Button
            size="icon-sm"
            variant="danger"
            aria-label={deleteLabel}
            disabled={isPending}
            onClick={onDelete}
          >
            <Trash2 size={16} />
          </Button>
        </WithTooltip>
      )}
    </div>
  );
};

export default RowControls;
