import { posts } from "~/data/posts";
import type { Content } from "~/modules/content/types";

export interface Section {
  href: string;
  label: string;
  // For where there's little room, like a stop on the island's dial
  short: string;
  // How much there is to see, shown on the island's counter. The about page
  // has nothing to count
  count?: number;
  unit?: string;
}

/** What the island says there is to see in a section, like "9 prints". */
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
  // Last: it's about the person, not the work. Its tiles on home are the
  // about photo, the record that's on and the gear, which all open it
  {
    href: "/about",
    label: "About",
    short: "About",
  },
];

/**
 * The section a page belongs to: its own, or for a blog post, the blog's.
 * Undefined on the home screen.
 */
export const sectionOf = (sections: Section[], pathname: string) =>
  sections.find(
    ({ href }) => pathname === href || pathname.startsWith(`${href}/`),
  );
