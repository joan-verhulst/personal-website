// How the room is laid out, lit and painted. It lives in layout.json, which
// the tuner writes when you save in it, see tuner.ts: open /about?tune
// while running the site locally

import saved from "~/modules/about/room/layout.json";

export type Vec3 = [number, number, number];

export interface Placement {
  position: Vec3;
  // Degrees about the vertical
  rotation: number;
  // Taken out of the room, without losing where it was
  hidden?: boolean;
}

// Everything that can be moved, in the order the tuner lists it
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
  // Decoration
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
  // Meters, inside the walls
  width: number;
  depth: number;
  height: number;
  // The compass direction the near wall faces, outward: where the sun is
  // worked out from
  nearWallFaces: number;
  // How wide the hallway behind the door is
  hallway: number;
  // On the near wall, from and to are x; on the left wall, z
  window: {
    wall: "near" | "left";
    from: number;
    to: number;
    bottom: number;
    top: number;
  };
  // In the right wall, from and to are z. Open is degrees into the hallway
  door: { from: number; to: number; height: number; open: number };
}

export interface RoomLayout {
  // When the loading pictures were last saved with it, see stills.ts. None
  // until the first save that draws them
  stills?: number;
  camera: { position: Vec3; target: Vec3; fov: number };
  room: RoomShape;
  pieces: Record<PieceKey, Placement>;
  colors: {
    walls: string;
    hallway: string;
    duvet: string;
    sheets: string;
    // Tints over the painted floor and wood: white leaves them as painted
    floor: string;
    wood: string;
    chair: string;
    // The light of the two lamps on the desk and of the strip behind it
    deskLamps: string;
    ledStrip: string;
    // Door casings, skirting, the window's frame and the door itself
    trim: string;
    // The outline around every object
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
    // How bright the pictures on the monitors are
    screens: number;
    // Light bounced around the room, baked into a grid of probes
    gi: number;
    // Soft darkening where things meet and in corners (ambient occlusion)
    ao: number;
    // How much shiny things reflect the room around them
    reflections: number;
    // How the light is turned into screen colours
    toneMapping: "aces" | "agx" | "neutral";
    exposure: number;
    bloom: number;
    bloomRadius: number;
    bloomThreshold: number;
  };
  // The style, in the materials and the models, see toon.ts
  paint: {
    // Smooths every edge (antialiasing)
    smooth: boolean;
    // How much of the surfaces' painted detail shows: 0 is flat colour
    detail: number;
    // Each light falls in this many flat bands, its shadows with edges,
    // like cel animation. 0 is smooth
    bands: number;
    // How soft the edge between two bands is, 0 to 0.5
    softness: number;
    // The outline around every object, in screen pixels. 0 is none
    outline: number;
  };
}

export const savedLayout = saved as RoomLayout;

export const copyLayout = (layout: RoomLayout): RoomLayout =>
  structuredClone(layout);

/**
 * A layout from elsewhere, like a draft left in the browser, over the saved
 * one: whatever it doesn't have yet, like a piece added since, comes from
 * what's saved, and whatever the room no longer has is left behind.
 * Whether a piece is hidden is its own, so that's kept too.
 */
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
