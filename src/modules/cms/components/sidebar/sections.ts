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
  Package,
  Palette,
  Search,
  ShieldCheck,
  Tag,
  UserRound,
} from "lucide-react";
import { ADMIN_ROOT } from "~/modules/cms/utils/admin-path";

export interface SidebarItem {
  label: string;
  url: string;
  icon: LucideIcon;
  exact?: boolean;
  children?: SidebarItem[];
}

export interface SidebarSection {
  id: string;
  label?: string;
  items: SidebarItem[];
}

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
      { label: "Products", url: "/admin/products", icon: Package },
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

export const isActiveUrl = (pathname: string, url: string) =>
  url === ADMIN_ROOT
    ? pathname === url
    : pathname === url || pathname.startsWith(`${url}/`);

export const isActiveItem = (pathname: string, item: SidebarItem) =>
  item.exact ? pathname === item.url : isActiveUrl(pathname, item.url);

export const ariaCurrent = (pathname: string, item: SidebarItem) => {
  if (!isActiveItem(pathname, item)) return undefined;
  return pathname === item.url ? "page" : "true";
};
