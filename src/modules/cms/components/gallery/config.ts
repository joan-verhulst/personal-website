// Photography and digital art share every screen. What differs between them
// lives here, so the components only need to know which one they're showing
export type GalleryKind = "photos" | "artworks";

export const GALLERY_KINDS = ["photos", "artworks"] as const;

export interface GalleryConfig {
  table: string;
  // Storage folder for uploads
  folder: string;
  // The collection page
  href: string;
  title: string;
  // "photo" in "New photo", "Photo added"
  noun: string;
  plural: string;
  description: string;
  // Photos keep their hue and colorfulness, for the photo table
  measureColor: boolean;
}

export const GALLERIES: Record<GalleryKind, GalleryConfig> = {
  photos: {
    table: "photos",
    folder: "photography",
    href: "/admin/photography",
    title: "Photography",
    noun: "photo",
    plural: "photos",
    description:
      "The grid follows this order. The photo table scatters them and groups by color, which is measured on upload.",
    measureColor: true,
  },
  artworks: {
    table: "artworks",
    folder: "digital-art",
    href: "/admin/digital-art",
    title: "Digital art",
    noun: "artwork",
    plural: "artworks",
    description:
      "The slider follows this order. The first few load right away, so lead with the strongest pieces.",
    measureColor: false,
  },
};

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
