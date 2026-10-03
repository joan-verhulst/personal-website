"use client";

import { Plus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import AdminLink from "~/modules/cms/components/admin-link";
import { useAdminPathname } from "~/modules/cms/components/admin-path";
import Button from "~/modules/cms/components/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/modules/cms/components/primitives/tooltip";
import { usePageActionsSlot } from "~/modules/cms/components/shell/page-actions";
import {
  ariaCurrent,
  isActiveItem,
  isActiveUrl,
  type SidebarItem,
  uiUxPages,
} from "~/modules/cms/components/sidebar/sections";
import cn from "~/utils/cn";

interface BottomNavSection {
  /** The section's root, the nav shows on it and every page under it. */
  url: string;
  label: string;
  pages: SidebarItem[];
  /** Where the round + button goes, the section's main "new" action. */
  create: { href: string; label: string };
}

const SECTIONS: BottomNavSection[] = [
  {
    url: "/admin/ui-ux",
    label: "UI/UX",
    pages: uiUxPages,
    create: { href: "/admin/ui-ux/items/new", label: "New item" },
  },
];

/**
 * The bar at the bottom of the panel. In a section with sub-pages it holds
 * their tabs in a pill and a round + button; a page's own actions, from
 * <PageActions />, take the place of the +. Outside those sections it only
 * shows while the page has actions.
 *
 * It sits under the scrolling content instead of floating over it, so it
 * never covers anything.
 */
const BottomNav = () => {
  // Canonical, like the sections' own paths it's compared with
  const pathname = useAdminPathname();
  const searchParams = useSearchParams();
  const { setSlot, hasActions, hasWideActions } = usePageActionsSlot();
  const section = SECTIONS.find(({ url }) => isActiveUrl(pathname, url));

  if (!section && !hasActions) return null;

  // No "add" while you're editing something, or already on the new page
  const hasCreate =
    section && !hasActions && pathname !== section.create.href;
  // On the Experiments tab of the items, a new item goes into that list,
  // like the header's New item there
  const createHref =
    section &&
    pathname === "/admin/ui-ux/items" &&
    searchParams.get("tab") === "experiments"
      ? `${section.create.href}?list=experiments`
      : section?.create.href;

  return (
    <div
      className="relative z-20 flex shrink-0 flex-wrap items-center justify-center gap-2 bg-white px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      {section && (
        <nav
          aria-label={section.label}
          className="flex min-w-0 gap-0.5 rounded-full border border-neutral-950/10 bg-white p-1"
        >
          {section.pages.map((page) => {
            const { icon: Icon } = page;
            const isActive = isActiveItem(pathname, page);
            return (
              <AdminLink
                key={page.url}
                href={page.url}
                aria-current={ariaCurrent(pathname, page)}
                className={cn(
                  "flex items-center gap-2 rounded-full px-3 py-2 font-medium text-xs transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-primary-500",
                  isActive
                    ? "bg-primary-50 text-primary-500"
                    : "text-neutral-600 hover:bg-neutral-950/5 hover:text-neutral-950",
                )}
              >
                <Icon size={16} aria-hidden className="shrink-0" />
                {/* On a phone the tabs go down to their icons next to a
                    page's actions, so both fit on one row */}
                <span className={cn(hasWideActions && "max-sm:sr-only")}>
                  {page.label}
                </span>
              </AdminLink>
            );
          })}
        </nav>
      )}
      {/* <PageActions /> renders into this */}
      <div
        ref={setSlot}
        className="flex flex-wrap items-center justify-center gap-2 empty:hidden"
      />
      {hasCreate && createHref && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              href={createHref}
              size="icon"
              variant="primary"
              aria-label={section.create.label}
            >
              <Plus size={16} aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{section.create.label}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export default BottomNav;
