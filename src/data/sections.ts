import type { Content } from "~/modules/content/types";

export interface Section {
  href: string;
  label: string;
  // For where there's little room, like a stop on the island's dial
  short: string;
  // How much there is to see, shown on the island's counter
  count: number;
  unit: string;
}

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
];
