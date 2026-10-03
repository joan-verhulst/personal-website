// Everything the CMS manages, in the shape the site renders it. Media paths
// are full URLs by the time they get here, see get-content.

// ── UI/UX ─────────────────────────────────────────────────────────────────────

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
  // Single color SVG, tinted to match the tag text
  logo?: string;
}

export interface WallMedia {
  type: "image" | "video";
  src: string;
  // Source dimensions, used to keep the aspect ratio without cropping
  width: number;
  height: number;
}

export interface WallItem {
  id: string;
  title: string;
  tag: WallTag;
  media: WallMedia;
  background: WallBackground;
  // Fills the whole card with no frame, for reels that bring their own
  // background. Export reels at 4:3 so they fill a card without cropping.
  // Its background then only picks the header: "neutral" for light reels,
  // any other for dark ones.
  bare?: boolean;
  // CSS object-position for the cropped card view, defaults to "left top".
  // The modal always shows the full media.
  position?: string;
  // Scales the media up, e.g. to crop browser chrome out of a recording
  zoom?: number;
  // Opens a modal only when it has text or a link
  description?: string;
  link?: { label: string; href: string };
}

/**
 * Blocks are split along the Fibonacci sequence on a 13 column grid. A unit
 * is 4:3, so every square renders as a 4:3 card. List items from big to
 * small; the layout mirrors on every other block.
 *
 * spiral  8×8 + 5×5 + 3×3 + 2×3 (near square)
 * triple  5×5 + 5×5 + 3×5 (near square)
 *
 * Keep videos in the first two slots, they should never be small.
 */
export type WallBlock =
  | { layout: "spiral"; items: [WallItem, WallItem, WallItem, WallItem] }
  | { layout: "triple"; items: [WallItem, WallItem, WallItem] };

export type WallLayout = WallBlock["layout"];

export const WALL_SLOTS: Record<WallLayout, number> = {
  spiral: 4,
  triple: 3,
};

// ── Photography ───────────────────────────────────────────────────────────────

export interface PhotographyProject {
  id: string;
  title: string;
  image: string;
  description?: string;
}

export interface Print extends PhotographyProject {
  width: number;
  height: number;
  // Hue in degrees, and how colorful the photo is from 0 (black and white) up
  hue: number;
  chroma: number;
}

// ── Digital art ───────────────────────────────────────────────────────────────

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

// ── On rotation ───────────────────────────────────────────────────────────────

export interface RotationRecord {
  id: string;
  type: "album" | "song";
  title: string;
  artist: string;
  // Square artwork, used as the record's label
  cover: string;
  // The track I'd put on first. Its Apple Music ID fetches the real title,
  // artist and a preview clip; the name is shown until that arrives.
  favoriteSong: { appleId: number; title: string };
}

// ── About and contact ─────────────────────────────────────────────────────────

export interface About {
  headline: string;
  intro: string;
  image?: string;
  // Where I work now, linked from the bottom of the about modal
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
  // Plain address, without mailto:
  email?: string;
}

// ── All of it ─────────────────────────────────────────────────────────────────

export interface Content {
  about: About;
  contact: Contact;
  photos: Print[];
  artworks: Artwork[];
  records: RotationRecord[];
  wall: WallBlock[];
  // Side projects and motion studies, shown in the experiments modal on the
  // home page. The first two fill the home page widget: an image, then a video.
  experiments: WallItem[];
  // The two wall items that rotate in the home page widget, always images
  highlights: WallItem[];
  // Images on the home page widgets
  covers: {
    photography?: string;
    digitalArt?: string;
  };
}
