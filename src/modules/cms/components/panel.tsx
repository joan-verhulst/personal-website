import { type ComponentProps, type ReactNode, useId } from "react";
import cn from "~/utils/cn";

export const panelClass =
  "rounded-2xl border border-neutral-950/10 bg-white";

interface PanelProps extends Omit<ComponentProps<"section">, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

const Panel = ({
  title,
  description,
  actions,
  className,
  children,
  ...props
}: PanelProps) => {
  const titleId = useId();

  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn(
        panelClass,
        "flex min-w-0 flex-col gap-4 p-5",
        className,
      )}
      {...props}
    >
      {(title || description || actions) && (
        // Stacked, never side by side: the owner wants every admin page to read
        // top to bottom
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            {title && (
              <h2 id={titleId} className="font-medium text-neutral-950 text-sm">
                {title}
              </h2>
            )}
            {description && (
              <p className="max-w-[620px] text-neutral-600 text-xs leading-normal">
                {description}
              </p>
            )}
          </div>
          {actions && (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      {children}
    </section>
  );
};

export default Panel;
