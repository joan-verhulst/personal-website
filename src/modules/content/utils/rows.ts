import type { WallBackground, WallLayout } from "~/modules/content/types";

// Rows as they're stored, see supabase/migrations. Media columns hold paths in
// the media bucket.

export interface SiteRow {
  id: 1;
  about_headline: string;
  about_intro: string;
  about_image: string | null;
  currently_name: string | null;
  currently_since: string | null;
  currently_blurb: string | null;
  currently_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  email: string | null;
}

export interface PhotoRow {
  id: string;
  title: string;
  description: string | null;
  image: string;
  width: number;
  height: number;
  hue: number;
  chroma: number;
  sort_order: number;
  is_cover: boolean;
}

export interface ArtworkRow {
  id: string;
  title: string;
  description: string | null;
  image: string;
  width: number;
  height: number;
  sort_order: number;
  is_cover: boolean;
}

export interface RecordRow {
  id: string;
  type: "album" | "song";
  title: string;
  artist: string;
  cover: string;
  apple_id: number;
  favorite_title: string;
  sort_order: number;
}

export interface WallTagRow {
  id: string;
  label: string;
  color: string;
  logo: string | null;
}

export interface WallItemRow {
  id: string;
  title: string;
  tag_id: string | null;
  media_type: "image" | "video";
  media: string;
  width: number;
  height: number;
  background: WallBackground;
  bare: boolean;
  object_position: string | null;
  zoom: number | null;
  description: string | null;
  link_label: string | null;
  link_href: string | null;
}

export interface WallBlockRow {
  id: string;
  layout: WallLayout;
  // One item id per slot, big to small. An empty string is an empty slot: the
  // row is saved but stays off the site until it's filled.
  items: string[];
  sort_order: number;
}

export type WallListId = "experiments" | "highlights";

export interface WallListRow {
  id: WallListId;
  items: string[];
}
