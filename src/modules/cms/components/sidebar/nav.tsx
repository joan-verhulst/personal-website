"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import AdminLink from "~/modules/cms/components/admin-link";
import { useAdminPathname } from "~/modules/cms/components/admin-path";
import {
  ariaCurrent,
  isActiveItem,
  isActiveUrl,
  type SidebarItem,
  sidebarSections,
} from "~/modules/cms/components/sidebar/sections";
import cn from "~/utils/cn";

interface Props {
  /** Called when a link is followed, so the mobile sheet can close. */
  onNavigate?: () => void;
}

const ROW =
  "flex min-w-0 items-center gap-2 rounded-[10px] px-[10px] py-2 text-sm transition-colors duration-200 hover:bg-neutral-950/5 focus-visible:outline-2 focus-visible:outline-primary-500";

const NavLink = ({
  item,
  pathname,
  onNavigate,
}: {
  item: SidebarItem;
  pathname: string;
  onNavigate?: () => void;
}) => {
  const { url, label, icon: Icon, children } = item;
  // A section with sub-pages opens while you're anywhere inside it
  const isOpen = Boolean(children) && isActiveUrl(pathname, url);
  const isActive = isActiveItem(pathname, item);

  return (
    <li>
      <AdminLink
        href={url}
        onClick={onNavigate}
        // The open sub-page is the "page", so its section only says "true"
        aria-current={isOpen ? "true" : ariaCurrent(pathname, item)}
        className={cn(
          ROW,
          isActive
            ? "bg-neutral-950/5 text-neutral-950"
            : "text-neutral-700 hover:text-neutral-950",
        )}
      >
        <Icon size={16} aria-hidden className="shrink-0" />
        <span className="truncate">{label}</span>
        {children && (
          <ChevronDown
            size={16}
            aria-hidden
            className={cn(
              "ml-auto shrink-0 text-neutral-600 transition-transform duration-200",
              !isOpen && "-rotate-90",
            )}
          />
        )}
      </AdminLink>
      {isOpen && children && (
        <ul className="mt-0.5 flex flex-col gap-0.5">
          {children.map((child) => {
            const { icon: ChildIcon } = child;
            const isChildActive = isActiveItem(pathname, child);
            return (
              <li key={child.url}>
                <AdminLink
                  href={child.url}
                  onClick={onNavigate}
                  aria-current={ariaCurrent(pathname, child)}
                  className={cn(
                    ROW,
                    "pl-8",
                    isChildActive
                      ? "text-neutral-950"
                      : "text-neutral-700 hover:text-neutral-950",
                  )}
                >
                  <ChildIcon
                    size={16}
                    aria-hidden
                    className={cn(
                      "shrink-0",
                      isChildActive && "text-primary-500",
                    )}
                  />
                  <span className="truncate">{child.label}</span>
                </AdminLink>
              </li>
            );
          })}
        </ul>
      )}
    </li>
  );
};

/** The CMS's pages, grouped under the same headings as the dashboard. */
const Nav = ({ onNavigate }: Props) => {
  // Canonical, like the urls in sidebarSections it's compared with
  const pathname = useAdminPathname();
  // The sheet on small screens renders a second copy, so ids can't be fixed
  const id = useId();

  return (
    <nav aria-label="Content" className="flex flex-col gap-4">
      {sidebarSections.map((section) => (
        <div key={section.id} className="flex flex-col gap-1">
          {section.label && (
            <h2
              id={`${id}-${section.id}`}
              className="px-2 py-1 font-normal text-neutral-600 text-xs"
            >
              {section.label}
            </h2>
          )}
          <ul
            aria-labelledby={
              section.label ? `${id}-${section.id}` : undefined
            }
            className="flex flex-col gap-0.5"
          >
            {section.items.map((item) => (
              <NavLink
                key={item.url}
                item={item}
                pathname={pathname}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
};

export default Nav;
