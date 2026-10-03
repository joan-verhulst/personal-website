import { ChevronRightIcon, MoreHorizontalIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import AdminLink from "~/modules/cms/components/admin-link";
import cn from "~/utils/cn";

const Breadcrumb = (props: ComponentProps<"nav">) => (
  <nav aria-label="breadcrumb" {...props} />
);

const BreadcrumbList = ({ className, ...props }: ComponentProps<"ol">) => (
  <ol
    className={cn(
      "flex min-w-0 flex-wrap items-center gap-2 break-words font-medium text-neutral-700 text-xs",
      className,
    )}
    {...props}
  />
);

const BreadcrumbItem = ({ className, ...props }: ComponentProps<"li">) => (
  <li
    className={cn("inline-flex min-w-0 items-center gap-1.5", className)}
    {...props}
  />
);

// Every crumb is a page inside the admin, so links take its canonical path
const BreadcrumbLink = ({
  className,
  ...props
}: ComponentProps<typeof AdminLink>) => (
  <AdminLink
    className={cn(
      "rounded-md transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-primary-500",
      className,
    )}
    {...props}
  />
);

const BreadcrumbPage = ({ className, ...props }: ComponentProps<"span">) => (
  <span
    aria-current="page"
    className={cn("truncate font-medium text-neutral-950 text-sm", className)}
    {...props}
  />
);

interface BreadcrumbSeparatorProps extends ComponentProps<"li"> {
  children?: ReactNode;
}

const BreadcrumbSeparator = ({
  children,
  className,
  ...props
}: BreadcrumbSeparatorProps) => (
  <li
    role="presentation"
    aria-hidden="true"
    className={cn("text-neutral-400 [&>svg]:size-4", className)}
    {...props}
  >
    {children ?? <ChevronRightIcon />}
  </li>
);

const BreadcrumbEllipsis = ({
  className,
  ...props
}: ComponentProps<"span">) => (
  <span
    role="presentation"
    aria-hidden="true"
    className={cn("flex size-7 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontalIcon className="size-4" />
    <span className="sr-only">More</span>
  </span>
);

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
