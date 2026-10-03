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

/** Names for the url segments under /admin. */
const SEGMENT_LABELS: Record<string, string> = {
  "ui-ux": "UI/UX",
  items: "Items",
  tags: "Tags",
  photography: "Photography",
  "digital-art": "Digital art",
  "on-rotation": "On rotation",
  about: "About",
  contact: "Contact",
  security: "Security",
  new: "New",
};

/**
 * Sections whose own page is one of their tabs: the wall is UI/UX's root,
 * so /admin/ui-ux reads "UI/UX > Wall" like its sibling tabs do.
 */
const ROOT_PAGE_LABELS: Record<string, string> = {
  "/admin/ui-ux": "Wall",
};

const ITEMS = "/admin/ui-ux/items";

/**
 * The trail for a canonical path, in canonical paths: the links spell them
 * for the host. Any segment without a name is a record's id, which
 * is always its edit page. An item opened from the Experiments tab carries
 * ?from=experiments, and its Items crumb leads back to that tab.
 */
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

/** The bar along the top of the panel, with the breadcrumbs for the page. */
const TopBar = () => {
  const pathname = useAdminPathname();
  const searchParams = useSearchParams();
  const crumbs = crumbsFor(
    pathname,
    // A new item for Experiments says so with ?list, an existing one with ?from
    searchParams.get("from") ?? searchParams.get("list"),
  );

  return (
    // Rounded like the panel it tops, so its white doesn't square off the corner
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
            // A section crumb for the page you're on would only link to itself
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
