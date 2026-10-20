export const WALL_BACKGROUNDS = [
  "forest",
  "lime",
  "mint",
  "ocean",
  "sky",
  "indigo",
  "midnight",
  "graphite",
  "violet",
  "sunset",
  "dusk",
  "neutral",
] as const;

export type WallBackground = (typeof WALL_BACKGROUNDS)[number];

export interface WallTag {
  label: string;
  color: string;
  logo?: string;
}

export interface WallMedia {
  type: "image" | "video";
  src: string;
  width: number;
  height: number;
}

export interface WallItem {
  id: string;
  title: string;
  tag?: WallTag;
  media: WallMedia;
  background: WallBackground;
  bare?: boolean;
  position?: string;
  // Scales the media up, e.g. to crop browser chrome out of a recording
  zoom?: number;
  description?: string;
  link?: { label: string; href: string };
}

/**
 * Blocks are split along the Fibonacci sequence on a 13 column grid. A unit
 * is 4:3, so every square renders as a 4:3 card. List items from big to
 * small; spirals and triples mirror on every other block.
 *
 * spiral  8×8 + 5×5 + 3×3 + 2×3 (near square)
 * triple  5×5 + 5×5 + 3×5 (near square)
 * double  two equal 4:3 halves, never mirrored
 *
 * Keep videos out of the small slots (the last two of a spiral, the last of a
 * triple), they'd be too small to follow.
 */
export type WallBlock =
  | { layout: "spiral"; items: [WallItem, WallItem, WallItem, WallItem] }
  | { layout: "triple"; items: [WallItem, WallItem, WallItem] }
  | { layout: "double"; items: [WallItem, WallItem] };

export type WallLayout = WallBlock["layout"];

export const WALL_SLOTS: Record<WallLayout, number> = {
  spiral: 4,
  triple: 3,
  double: 2,
};

export interface Product {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  link?: { label: string; href: string };
  media: WallMedia;
  background: WallBackground;
  bare?: boolean;
}

export interface PhotographyProject {
  id: string;
  title: string;
  image: string;
  description?: string;
}

export interface Print extends PhotographyProject {
  width: number;
  height: number;
  hue: number;
  chroma: number;
}

export interface DigitalArtProject {
  id: string;
  title: string;
  description?: string;
  image: string;
}

export interface Artwork extends DigitalArtProject {
  width: number;
  height: number;
}

export interface RotationRecord {
  id: string;
  type: "album" | "song";
  title: string;
  artist: string;
  cover: string;
  favoriteSong: { appleId: number; title: string };
}

export interface About {
  headline: string;
  intro: string;
  image?: string;
  modalImage?: string;
  currently?: {
    name: string;
    since?: string;
    blurb?: string;
    url?: string;
  };
}

export interface Contact {
  instagram?: string;
  linkedin?: string;
  email?: string;
  cards: Record<ContactCardKey, ContactCard>;
}

export type ContactCardKey = "uiUx" | "photography" | "digitalArt";

export interface ContactCard {
  title: string;
  text: string;
  button: string;
  href?: string;
}

export type PageKey = "home" | "uiUx" | "digitalArt" | "photography";

export interface Content {
  about: About;
  contact: Contact;
  descriptions: Partial<Record<PageKey, string>>;
  photos: Print[];
  artworks: Artwork[];
  records: RotationRecord[];
  wall: WallBlock[];
  experiments: WallItem[];
  products: Product[];
  highlights: WallItem[];
  covers: {
    photography?: string;
    digitalArt?: string;
  };
}
