import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import cn from "~/utils/cn";

const Table = ({ className, ...props }: HTMLAttributes<HTMLTableElement>) => (
  <div className="relative w-full overflow-x-auto">
    <table
      className={cn("w-full caption-bottom text-xs", className)}
      {...props}
    />
  </div>
);

const TableHeader = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <thead
    className={cn(
      "bg-neutral-100 [&_tr:hover]:bg-transparent [&_tr]:border-neutral-950/10 [&_tr]:border-b",
      className,
    )}
    {...props}
  />
);

const TableBody = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
);

const TableFooter = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) => (
  <tfoot
    className={cn(
      "border-neutral-950/10 border-t bg-neutral-100 font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
);

// data-state="last-edited" highlights the row that was just saved
const TableRow = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableRowElement>) => (
  <tr
    className={cn(
      "border-neutral-950/10 border-b transition-colors hover:bg-neutral-50 data-[state=last-edited]:bg-primary-50 data-[state=selected]:bg-neutral-100",
      className,
    )}
    {...props}
  />
);

const TableHead = ({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "h-[37px] whitespace-nowrap px-3 text-left align-middle font-normal text-neutral-600 text-xs [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
);

const TableCell = ({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td
    className={cn(
      "h-[41px] whitespace-nowrap px-3 py-1.5 align-middle font-medium text-neutral-950 text-xs [&:has([role=checkbox])]:pr-0",
      className,
    )}
    {...props}
  />
);

const TableCaption = ({
  className,
  ...props
}: HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption
    className={cn("mt-4 text-neutral-600 text-xs", className)}
    {...props}
  />
);

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
