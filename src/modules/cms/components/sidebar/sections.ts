import {
  BrickWall,
  Camera,
  Disc3,
  HardDrive,
  Images,
  LayoutDashboard,
  LayoutGrid,
  type LucideIcon,
  Mail,
  Palette,
  Search,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";

export interface SidebarItem {
  label: string;
  /** The page's canonical path. A link spells it for the host it's on. */
  url: string;
  icon: LucideIcon;
  /** Only active on its own url, for a page that is the root of a section. */
  exact?: boolean;
  /** Sub-pages, shown under the item while one of them is open. */
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  /** The heading above the group. The dashboard's group has none. */
  label?: string;
  items: SidebarItem[];
}

/** The pages of the UI/UX section, in the sidebar and its bottom nav. */
export const uiUxPages: SidebarItem[] = [
  { label: "Wall", url: "/admin/ui-ux", icon: BrickWall, exact: true },
  { label: "Items", url: "/admin/ui-ux/items", icon: Images },
  { label: "Tags", url: "/admin/ui-ux/tags", icon: Tag },
];

export const sidebarSections: SidebarSection[] = [
  {
    id: "dashboard",
    items: [
      {
        label: "Dashboard",
        url: ADMIN_ROOT,
        icon: LayoutDashboard,
        exact: true,
      },
    ],
  },
  {
    id: "work",
    label: "Work",
    items: [
      {
        label: "UI/UX",
        url: "/admin/ui-ux",
        icon: LayoutGrid,
        children: uiUxPages,
      },
      { label: "Digital art", url: "/admin/digital-art", icon: Palette },
      { label: "Photography", url: "/admin/photography", icon: Camera },
    ],
  },
  {
    id: "favorites",
    label: "Favorites",
    items: [{ label: "On rotation", url: "/admin/on-rotation", icon: Disc3 }],
  },
  {
    id: "site",
    label: "Site",
    items: [
      { label: "About", url: "/admin/about", icon: UserRound },
      { label: "Contact", url: "/admin/contact", icon: Mail },
      { label: "Search", url: "/admin/search", icon: Search },
      { label: "Media", url: "/admin/media", icon: HardDrive },
      { label: "Security", url: "/admin/security", icon: ShieldCheck },
    ],
  },
];

/**
 * A section stays active on its sub pages, the dashboard only on itself.
 * The pathname is the canonical one, from useAdminPathname().
 */
export const isActiveUrl = (pathname: string, url: string) =>
  url === ADMIN_ROOT
    ? pathname === url
    : pathname === url || pathname.startsWith(`${url}/`);

/** Like isActiveUrl, but an exact item only counts on its own page. */
export const isActiveItem = (pathname: string, item: SidebarItem) =>
  item.exact ? pathname === item.url : isActiveUrl(pathname, item.url);

/**
 * What aria-current says for a link: "page" on the page itself, "true" on a
 * section above it, nothing elsewhere.
 */
export const ariaCurrent = (pathname: string, item: SidebarItem) => {
  if (!isActiveItem(pathname, item)) return undefined;
  return pathname === item.url ? "page" : "true";
};
