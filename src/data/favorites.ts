export type FavoritesSection = "on-rotation" | "gear";

export interface FavoritesSectionTab {
  id: FavoritesSection;
  label: string;
  description: string;
  // Square thumbnail. On rotation shows the first record's cover instead
  image?: string;
}

export const favoritesSections: FavoritesSectionTab[] = [
  {
    id: "on-rotation",
    label: "On rotation",
    description: "Records I keep coming back to",
  },
  {
    id: "gear",
    label: "Gear",
    description: "Cameras, guitars and the rest",
    image: "/assets/images/gear/mamiya-rz67.png",
  },
];

// A favorite song as Apple Music has it, served by /api/on-rotation
export interface RotationTrack {
  title: string;
  artist: string;
  // 30 second clip
  previewUrl: string;
  // Where the song lives on Apple Music, credited in the player
  url: string;
}

export type GearType = "camera" | "lens" | "film" | "guitar";

export interface GearStat {
  label: string;
  value: string;
}

export interface GearItem {
  id: string;
  name: string;
  type: GearType;
  // Cut-out with a transparent background
  image: string;
  // Images cropped at the edges fill the art window instead of floating in it
  fit?: "contain" | "cover";
  blurb: string;
  stats: GearStat[];
}

const GEAR = "/assets/images/gear";

// Ordered like a binder page: three rows of three
export const gear: GearItem[] = [
  {
    id: "mamiya-rz67",
    name: "Mamiya RZ67",
    type: "camera",
    image: `${GEAR}/mamiya-rz67.png`,
    blurb: "Medium format SLR with a rotating back",
    stats: [
      { label: "Format", value: "6×7" },
      { label: "Film", value: "120" },
      { label: "Since", value: "1982" },
    ],
  },
  {
    id: "mamiya-sekor-z-110mm",
    name: "Sekor Z 110mm",
    type: "lens",
    image: `${GEAR}/mamiya-sekor-z-110mm.png`,
    blurb: "The RZ67's standard lens",
    stats: [
      { label: "Focal", value: "110mm" },
      { label: "Aperture", value: "f/2.8" },
      { label: "Mount", value: "RZ" },
    ],
  },
  {
    id: "mamiya-m645",
    name: "Mamiya M645",
    type: "camera",
    image: `${GEAR}/mamiya-m645.png`,
    blurb: "Medium format SLR, light enough to carry all day",
    stats: [
      { label: "Format", value: "6×4.5" },
      { label: "Film", value: "120" },
      { label: "Since", value: "1975" },
    ],
  },
  {
    id: "kodak-ektar-100",
    name: "Kodak Ektar 100",
    type: "film",
    image: `${GEAR}/kodak-ektar-100.png`,
    blurb: "Color negative with punchy, saturated color",
    stats: [
      { label: "ISO", value: "100" },
      { label: "Format", value: "120" },
      { label: "Type", value: "Color" },
    ],
  },
  {
    id: "kodak-gold-200",
    name: "Kodak Gold 200",
    type: "film",
    image: `${GEAR}/kodak-gold-200.png`,
    blurb: "Warm color negative with a golden cast",
    stats: [
      { label: "ISO", value: "200" },
      { label: "Format", value: "120" },
      { label: "Type", value: "Color" },
    ],
  },
  {
    id: "kodak-tmax-100",
    name: "Kodak T-Max 100",
    type: "film",
    image: `${GEAR}/kodak-tmax-100.png`,
    blurb: "Fine grain black and white",
    stats: [
      { label: "ISO", value: "100" },
      { label: "Format", value: "120" },
      { label: "Type", value: "B&W" },
    ],
  },
  {
    id: "cinestill-bwxx",
    name: "CineStill BwXX",
    type: "film",
    image: `${GEAR}/cinestill-bwxx.png`,
    blurb: "Black and white motion picture film, spooled for stills",
    stats: [
      { label: "EI", value: "200" },
      { label: "Format", value: "120" },
      { label: "Type", value: "B&W" },
    ],
  },
  {
    id: "epiphone-hummingbird",
    name: "Epiphone Hummingbird",
    type: "guitar",
    image: `${GEAR}/epiphone-hummingbird.png`,
    fit: "cover",
    blurb: "Square shoulder dreadnought with the hummingbird pickguard",
    stats: [
      { label: "Type", value: "Acoustic" },
      { label: "Strings", value: "6" },
      { label: "Body", value: "Dreadnought" },
    ],
  },
  {
    id: "ibanez-azes31",
    name: "Ibanez AZES31",
    type: "guitar",
    image: `${GEAR}/ibanez-azes31.png`,
    blurb: "Electric with three single coils",
    stats: [
      { label: "Type", value: "Electric" },
      { label: "Strings", value: "6" },
      { label: "Pickups", value: "SSS" },
    ],
  },
];
