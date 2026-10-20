export type GalleryKind = "photos" | "artworks";

export const GALLERY_KINDS = ["photos", "artworks"] as const;

export interface GalleryConfig {
  table: string;
  folder: string;
  href: string;
  title: string;
  noun: string;
  plural: string;
  description: string;
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
  },
};

export const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);
