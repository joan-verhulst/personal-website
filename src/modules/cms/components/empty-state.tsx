import type { ComponentProps, ReactNode } from "react";
import Panel from "~/modules/cms/components/panel";
import cn from "~/utils/cn";

interface EmptyStateProps {
  /** What's missing, like "No photos yet". */
  title: ReactNode;
  /** What to do about it, when the button alone doesn't say. */
  hint?: ReactNode;
  /** A button that starts the first one. Left out when a filter came up empty. */
  action?: ReactNode;
  className?: string;
}

/**
 * What a collection page shows in place of its cards or rows while there are
 * none.
 *
 * @example
 * <EmptyState
 *   title="No photos yet"
 *   action={<Button variant="primary">New photo</Button>}
 * />
 */
const EmptyState = ({ title, hint, action, className }: EmptyStateProps) => (
  <Panel className={cn("items-center py-10 text-center", className)}>
    <div className="flex flex-col gap-1">
      <p className="font-medium text-neutral-950 text-sm">{title}</p>
      {hint && (
        <p className="text-neutral-600 text-xs leading-normal">{hint}</p>
      )}
    </div>
    {action}
  </Panel>
);

/**
 * The dashed line that holds the place of content inside a section, like a
 * list nothing was added to yet.
 *
 * @example
 * <Placeholder>No experiments yet. Add an item to start.</Placeholder>
 */
export const Placeholder = ({ className, ...props }: ComponentProps<"p">) => (
  <p
    className={cn(
      "rounded-xl border border-neutral-950/15 border-dashed px-4 py-6 text-center text-neutral-600 text-xs leading-normal",
      className,
    )}
    {...props}
  />
);

export default EmptyState;
