
import type { RoomLayout } from "~/modules/about/room/layout";
import type { Painted } from "~/modules/about/room/painting";
import type { Hotspot } from "~/modules/about/room/parts";
import type { PerfReport } from "~/modules/about/room/profiler";
import type { Room, RoomView } from "~/modules/about/room/room-scene";

export interface RoomHandle {
  resize: (view: RoomView) => void;
  setVisible: (isShown: boolean) => void;
  setOffset: (ms: number) => void;
  hover: (point: { x: number; y: number } | null) => Promise<Hotspot | null>;
  pick: (x: number, y: number) => Promise<Hotspot | null>;
  destroy: () => void;
}

export const handleOf = (room: Room): RoomHandle => ({
  resize: (view) => room.resize(view),
  setVisible: (isShown) => room.setVisible(isShown),
  setOffset: (ms) => room.setOffset(ms),
  hover: async (point) => room.hover(point),
  pick: async (x, y) => room.pick(x, y),
  destroy: () => room.destroy(),
});

export type ToRoom =
  | {
      type: "init";
      canvas: OffscreenCanvas;
      view: RoomView;
      layout: RoomLayout;
      pictures: string[];
      sleeve?: string;
      reducedMotion: boolean;
      profile: boolean;
    }
  | { type: "painted"; painted: Painted }
  | { type: "view"; view: RoomView }
  | { type: "visible"; isShown: boolean }
  | { type: "offset"; ms: number }
  | { type: "hover"; id: number; point: { x: number; y: number } | null }
  | { type: "pick"; id: number; x: number; y: number }
  | { type: "destroy" };

export type FromRoom =
  | { type: "status"; label: string }
  | { type: "progress"; share: number }
  | { type: "ready" }
  | { type: "answer"; id: number; hotspot: Hotspot | null }
  | { type: "perf"; report: PerfReport }
  | { type: "failed" };
