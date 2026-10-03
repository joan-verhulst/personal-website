import type { WallBackground, WallItem } from "~/modules/content/types";

// Dark at the top, glowing at the bottom behind the media. Pick the one
// closest to the media's own accent color.
export const wallBackgrounds: Record<WallBackground, string> = {
  forest:
    "radial-gradient(120% 70% at 50% 100%, #4ade80 0%, transparent 70%), linear-gradient(180deg, #022c22 0%, #065f46 55%, #16a34a 100%)",
  lime: "radial-gradient(120% 70% at 50% 100%, #f6fbe4 0%, transparent 70%), linear-gradient(180deg, #80af0d 0%, #9fcc22 50%, #d2ee6e 100%)",
  mint: "radial-gradient(120% 70% at 50% 100%, #f7f8f7 0%, transparent 70%), linear-gradient(180deg, #005740 0%, #00bb64 35%, #86eb7f 65%, #baff9a 100%)",
  ocean:
    "radial-gradient(120% 70% at 50% 100%, #7dd3fc 0%, transparent 70%), linear-gradient(180deg, #0b1437 0%, #1e3a8a 55%, #2563eb 100%)",
  sky: "radial-gradient(120% 70% at 50% 100%, #bae6fd 0%, transparent 70%), linear-gradient(180deg, #082f49 0%, #075985 55%, #0ea5e9 100%)",
  indigo:
    "radial-gradient(120% 70% at 50% 100%, #c7d2fe 0%, transparent 70%), linear-gradient(180deg, #1e1b4b 0%, #3730a3 55%, #4f46e5 100%)",
  midnight:
    "radial-gradient(120% 70% at 50% 100%, #3b82f6 0%, transparent 70%), linear-gradient(180deg, #020617 0%, #0b1437 55%, #172554 100%)",
  graphite:
    "radial-gradient(120% 70% at 50% 100%, #52525b 0%, transparent 70%), linear-gradient(180deg, #09090b 0%, #18181b 55%, #27272a 100%)",
  violet:
    "radial-gradient(120% 70% at 50% 100%, #f0abfc 0%, transparent 70%), linear-gradient(180deg, #1e0b4b 0%, #5b21b6 55%, #9333ea 100%)",
  sunset:
    "radial-gradient(120% 70% at 50% 100%, #fde68a 0%, transparent 70%), linear-gradient(180deg, #4c0519 0%, #e11d48 55%, #fb923c 100%)",
  dusk: "radial-gradient(120% 70% at 50% 100%, #f9a8d4 0%, transparent 70%), linear-gradient(180deg, #1e1b4b 0%, #6d28d9 55%, #db2777 100%)",
  neutral: "var(--color-neutral-50)",
};

export const getWallBackground = ({ background }: WallItem) =>
  wallBackgrounds[background];
