import { pages } from "~/data/pages";
import type { ContactCard, ContactCardKey } from "~/modules/content/types";

/** The cards in the order the contact modal shows them. The first is primary. */
export const CONTACT_CARDS: ContactCardKey[] = [
  "uiUx",
  "photography",
  "digitalArt",
];

/**
 * What a card says while its fields in the CMS are empty, as they are before
 * 0009_contact_cards.sql. Placeholders, the real lines are written in the CMS.
 */
export const fallbackCards: Record<ContactCardKey, ContactCard> = {
  uiUx: {
    title: "Work with me",
    // From the Pixel Perfect blurb on the about page
    text: "Through Pixel Perfect, I partner with founders to create digital products that scale, from strategy and infrastructure to design and code.",
    button: "Start a project",
    href: "https://pixelperfect.agency/contact",
  },
  photography: {
    title: "Prints and licensing",
    text: "Every photo here is available as a print or to license.",
    button: "Ask about a photo",
  },
  digitalArt: {
    title: "License an artwork",
    text: "Use a piece for a cover, a campaign or your wall.",
    button: "Ask about a piece",
  },
};

/** The section a card is about, named over it. */
export const cardLabel = (key: ContactCardKey) => pages[key].title;

/** The card a page's footer shows: its own section's, and UI/UX elsewhere. */
export const cardForPath = (pathname: string): ContactCardKey =>
  CONTACT_CARDS.find((key) => pages[key].path === pathname) ?? "uiUx";
