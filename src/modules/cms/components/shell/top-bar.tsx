"use client";

import { ChevronRight, House } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Fragment } from "react";
import { useAdminPathname } from "~/modules/cms/components/admin-path";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "~/modules/cms/components/primitives/breadcrumb";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";

interface Crumb {
  label: string;
  href: string;
}

const SEGMENT_LABELS: Record<string, string> = {
  "ui-ux": "UI/UX",
  items: "Items",
  tags: "Tags",
  products: "Products",
  photography: "Photography",
  "digital-art": "Digital art",
  "on-rotation": "On rotation",
  about: "About",
  contact: "Contact",
  security: "Security",
  new: "New",
};

const ROOT_PAGE_LABELS: Record<string, string> = {
  "/admin/ui-ux": "Wall",
};

const ITEMS = "/admin/ui-ux/items";

const crumbsFor = (pathname: string, from: string | null): Crumb[] => {
  const segments = pathname.split("/").filter(Boolean).slice(1);
  if (segments.length === 0) return [{ label: "Dashboard", href: ADMIN_ROOT }];

  const crumbs = segments.map((segment, index) => {
    const href = `${ADMIN_ROOT}/${segments.slice(0, index + 1).join("/")}`;
    return {
      label: SEGMENT_LABELS[segment] ?? "Edit",
      href:
        href === ITEMS && from === "experiments"
          ? `${ITEMS}?tab=experiments`
          : href,
    };
  });

  const rootLabel = ROOT_PAGE_LABELS[pathname];
  if (rootLabel) crumbs.push({ label: rootLabel, href: pathname });

  return crumbs;
};

const SEPARATOR = (
  <BreadcrumbSeparator className="[&>svg]:size-4">
    <ChevronRight className="text-neutral-400" />
  </BreadcrumbSeparator>
);

const TopBar = () => {
  const pathname = useAdminPathname();
  const searchParams = useSearchParams();
  const crumbs = crumbsFor(
    pathname,
    searchParams.get("from") ?? searchParams.get("list"),
  );

  return (
    <div className="relative z-10 flex h-13.5 shrink-0 items-center rounded-t-xl border-neutral-950/10 border-b bg-white px-4 md:rounded-tr-none">
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap gap-2 text-neutral-700 sm:gap-2">
          <BreadcrumbItem className="shrink-0">
            <BreadcrumbLink
              href={ADMIN_ROOT}
              aria-label="Dashboard"
              className="-m-1 rounded-md p-1 text-neutral-600 focus-visible:outline-2 focus-visible:outline-primary-500"
            >
              <House size={16} aria-hidden />
            </BreadcrumbLink>
          </BreadcrumbItem>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1;
            const isSelf = crumb.href === pathname;

            return (
              <Fragment key={`${crumb.href}-${crumb.label}`}>
                {SEPARATOR}
                <BreadcrumbItem className="min-w-0">
                  {isLast ? (
                    <BreadcrumbPage className="truncate font-medium text-neutral-950 text-sm">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : isSelf ? (
                    <span className="truncate font-medium text-xs">
                      {crumb.label}
                    </span>
                  ) : (
                    <BreadcrumbLink
                      href={crumb.href}
                      className="truncate rounded-md font-medium text-xs focus-visible:outline-2 focus-visible:outline-primary-500"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
};

export default TopBar;
