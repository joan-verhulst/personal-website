import type { ComponentProps, ReactNode } from "react";
import Panel from "~/modules/cms/components/panel";
import cn from "~/utils/cn";

interface EmptyStateProps {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}

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
