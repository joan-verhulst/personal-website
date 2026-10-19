// What the page holds of the room, wherever it's drawn: on the page itself,
// or in a worker, see room-client.ts. Asking what's under the pointer is
// answered later either way, as a worker answers by message

import type { RoomLayout } from "~/modules/about/room/layout";
import type { Painted } from "~/modules/about/room/painting";
import type { Hotspot } from "~/modules/about/room/parts";
import type { Room, RoomView } from "~/modules/about/room/room-scene";

export interface RoomHandle {
  resize: (view: RoomView) => void;
  // Draws while shown
  setVisible: (isShown: boolean) => void;
  // How far off the clock the room is, in milliseconds, for playing a day
  setOffset: (ms: number) => void;
  // The pointer over the room, in CSS pixels, or null when it leaves: what
  // it's on is outlined and grows a little, if it opens something
  hover: (point: { x: number; y: number } | null) => Promise<Hotspot | null>;
  // What's under a point, for a click
  pick: (x: number, y: number) => Promise<Hotspot | null>;
  destroy: () => void;
}

/** A room drawn on the page, held like one drawn in a worker. */
export const handleOf = (room: Room): RoomHandle => ({
  resize: (view) => room.resize(view),
  setVisible: (isShown) => room.setVisible(isShown),
  setOffset: (ms) => room.setOffset(ms),
  hover: async (point) => room.hover(point),
  pick: async (x, y) => room.pick(x, y),
  destroy: () => room.destroy(),
});

// ── Messages ────────────────────────────────────────────────────────────────

/** From the page to the room's worker. */
export type ToRoom =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      view: RoomView;
      layout: RoomLayout;
      pictures: string[];
      sleeve?: string;
      reducedMotion: boolean;
    }
  // A surface painted, by the page's painters, see painter.ts
  | { type: "painted"; painted: Painted }
  | { type: "view"; view: RoomView }
  | { type: "visible"; isShown: boolean }
  | { type: "offset"; ms: number }
  | { type: "hover"; id: number; point: { x: number; y: number } | null }
  | { type: "pick"; id: number; x: number; y: number }
  | { type: "destroy" };

/** From the room's worker to the page. */
export type FromRoom =
  | { type: "status"; label: string }
  | { type: "progress"; share: number }
  | { type: "ready" }
  // What's under the pointer, for the question with this id
  | { type: "answer"; id: number; hotspot: Hotspot | null }
  | { type: "failed" };
