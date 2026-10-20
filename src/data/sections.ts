import { posts } from "~/data/posts";
import type { Content } from "~/modules/content/types";

export interface Section {
  href: string;
  label: string;
  short: string;
  count?: number;
  unit?: string;
}

export const sectionHint = ({ count, unit }: Section) =>
  count === undefined ? "" : `${count} ${unit}`;

/** The pages that open over the home screen, in the order the island lists them. */
export const getSections = (content: Content): Section[] => [
  {
    href: "/ui-ux",
    label: "UI/UX",
    short: "UI/UX",
    count: content.wall.reduce((total, block) => total + block.items.length, 0),
    unit: "projects",
  },
  {
    href: "/digital-art",
    label: "Digital Art",
    short: "Art",
    count: content.artworks.length,
    unit: "pieces",
  },
  {
    href: "/photography",
    label: "Photography",
    short: "Photo",
    count: content.photos.length,
    unit: "prints",
  },
  ...(content.products.length > 0
    ? [
        {
          href: "/products",
          label: "Products",
          short: "Try",
          count: content.products.length,
          unit: "to try",
        },
      ]
    : []),
  {
    href: "/blog",
    label: "Blog",
    short: "Blog",
    count: posts.length,
    unit: posts.length === 1 ? "post" : "posts",
  },
  {
    href: "/about",
    label: "About",
    short: "About",
  },
];

export const sectionOf = (sections: Section[], pathname: string) =>
  sections.find(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
