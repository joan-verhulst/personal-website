
import saved from "~/modules/about/room/layout.json";

export type Vec3 = [number, number, number];

export interface Placement {
  position: Vec3;
  rotation: number;
  hidden?: boolean;
}

export const PIECE_KEYS = [
  "bed",
  "desk",
  "chair",
  "rug",
  "shelves",
  "guitarNatural",
  "guitarSunburst",
  "electric",
  "plant",
  "lamp",
  "walkway",
  "headphones",
  "turntable",
  "frameLarge",
  "framePortrait",
  "frameSmall",
  "frameSquare",
  "frameLeftTall",
  "frameLeftSmall",
  "frameNear",
  "frameRight",
  "shelfBooks",
  "shelfTrinkets",
  "plantTall",
  "plantHanging",
  "plantDesk",
] as const;

export type PieceKey = (typeof PIECE_KEYS)[number];

export interface RoomShape {
  width: number;
  depth: number;
  height: number;
  nearWallFaces: number;
  hallway: number;
  window: {
    wall: "near" | "left";
    from: number;
    to: number;
    bottom: number;
    top: number;
  };
  door: { from: number; to: number; height: number; open: number };
}

export interface RoomLayout {
  stills?: number;
  camera: { position: Vec3; target: Vec3; fov: number };
  room: RoomShape;
  pieces: Record<PieceKey, Placement>;
  colors: {
    walls: string;
    hallway: string;
    duvet: string;
    sheets: string;
    floor: string;
    wood: string;
    chair: string;
    deskLamps: string;
    ledStrip: string;
    trim: string;
    outline: string;
  };
  light: {
    sun: number;
    beams: number;
    bounce: number;
    window: number;
    sky: number;
    ambient: number;
    lamp: number;
    deskLamps: number;
    ledStrip: number;
    screens: number;
    gi: number;
    ao: number;
    reflections: number;
    toneMapping: "aces" | "agx" | "neutral";
    exposure: number;
    bloom: number;
    bloomRadius: number;
    bloomThreshold: number;
  };
  paint: {
    smooth: boolean;
    detail: number;
    bands: number;
    softness: number;
    outline: number;
  };
  quality: {
    playResolution: number;
    movingShade: number;
  };
}

export const savedLayout = saved as RoomLayout;

export const copyLayout = (layout: RoomLayout): RoomLayout =>
  structuredClone(layout);

export const overSaved = (partial: unknown): RoomLayout => {
  const merge = (base: unknown, over: unknown): unknown => {
    if (Array.isArray(base) || typeof base !== "object" || base === null) {
      return over === undefined ? base : over;
    }
    if (typeof over !== "object" || over === null || Array.isArray(over)) return base;
    const merged: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    const from = over as Record<string, unknown>;
    for (const key of Object.keys(merged)) {
      merged[key] = merge(merged[key], from[key]);
    }
    if (typeof from.hidden === "boolean") merged.hidden = from.hidden;
    return merged;
  };
  return merge(copyLayout(savedLayout), partial) as RoomLayout;
};
