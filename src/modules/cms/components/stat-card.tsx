import type { ReactNode } from "react";
import AdminLink from "~/modules/cms/components/admin-link";
import cn from "~/utils/cn";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  /** Makes the whole card a link, like to the list it counts. */
  href?: string;
  className?: string;
}

/**
 * A label and a number side by side, for the row of stats under a page
 * header.
 *
 * @example
 * <StatCard label="Prints" value={prints.length} href="/admin/photography" />
 */
const StatCard = ({ label, value, href, className }: StatCardProps) => {
  const classes = cn(
    "flex min-w-0 items-center justify-between gap-3 rounded-xl border border-neutral-950/10 bg-white px-4 py-3",
    href &&
      "transition-colors hover:border-neutral-950/20 hover:bg-neutral-50 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2",
    className,
  );
  const content = (
    <>
      <span className="min-w-0 truncate font-medium text-neutral-700 text-xs">
        {label}
      </span>
      <span className="shrink-0 font-medium text-neutral-950 text-sm tabular-nums">
        {value}
      </span>
    </>
  );

  return href ? (
    <AdminLink href={href} className={classes}>
      {content}
    </AdminLink>
  ) : (
    <div className={classes}>{content}</div>
  );
};

export default StatCard;
