import type { ReactNode } from "react";
import cn from "~/utils/cn";

export const textLinkClass =
  "rounded-sm font-medium text-primary-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2";

interface HeaderProps {
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  stats?: ReactNode;
  className?: string;
}

const Header = ({
  title,
  description,
  meta,
  actions,
  stats,
  className,
}: HeaderProps) => (
  <header className={cn("mb-2 flex flex-col md:mb-4", className)}>
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="flex min-w-0 max-w-[620px] flex-col gap-2">
        <h1 className="font-medium text-neutral-950 text-xl">{title}</h1>
        {description && (
          <p className="text-neutral-600 text-sm leading-normal">
            {description}
          </p>
        )}
        {meta && (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-2 font-medium text-neutral-950 text-xs [&_svg]:size-4 [&_svg]:shrink-0">
            {meta}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
    {stats && (
      <div className="mt-6 grid grid-cols-2 gap-3 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
        {stats}
      </div>
    )}
  </header>
);

export default Header;
