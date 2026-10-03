import type { ReactNode } from "react";
import cn from "~/utils/cn";

/** A link in running text, like one in a header's description. */
export const textLinkClass =
  "rounded-sm font-medium text-primary-500 underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2";

interface HeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** A row under the description, like counts with an icon each. */
  meta?: ReactNode;
  /**
   * Right of the title, wrapping under it on phones. For a collection's
   * "New ..." and Reorder buttons. Save and Delete go in the bottom bar
   * instead, through <PageActions />.
   */
  actions?: ReactNode;
  /** A row of <StatCard />s under the header. */
  stats?: ReactNode;
  className?: string;
}

/**
 * The title block every CMS screen starts with. Breadcrumbs live in the
 * shell's top bar, not here. It takes the width of the page around it: 960px
 * from the layout, or 720px inside <Page width="form">.
 *
 * @example
 * <Header
 *   title="Photography"
 *   description="Prints shown on the photography page."
 *   actions={<Button variant="primary">New <Plus size={16} /></Button>}
 *   stats={<StatCard label="Prints" value={12} />}
 * />
 */
const Header = ({
  title,
  description,
  meta,
  actions,
  stats,
  className,
}: HeaderProps) => (
  // The page stacks its parts 16px apart, and this margin makes that 24 to
  // 32px between the header and what follows
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
      // Two per row on a phone, where an odd one out takes the full width.
      // One row from sm up, however many stats there are
      <div className="mt-6 grid grid-cols-2 gap-3 sm:auto-cols-fr sm:grid-flow-col sm:grid-cols-none max-sm:[&>*:last-child:nth-child(odd)]:col-span-2">
        {stats}
      </div>
    )}
  </header>
);

export default Header;
