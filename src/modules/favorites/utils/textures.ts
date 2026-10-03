// Surfaces shared by the turntable and the gear cards

/** Fine grain, laid over a surface so it reads as material instead of a flat fill. */
export const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** Polished brass, as a ring: light and dark alternate around the turn. */
export const BRASS =
  "conic-gradient(from 210deg, #ecd9a8, #9a7a3c 18%, #f3e3b6 36%, #86672e 55%, #e6cf98 72%, #94743a 88%, #ecd9a8)";

/** Machined aluminium, turned on a lathe. */
export const ALUMINIUM =
  "conic-gradient(from 0deg, #dcdcdc, #8d8d8d 9%, #f4f4f4 19%, #9a9a9a 31%, #e8e8e8 44%, #7e7e7e 57%, #f0f0f0 69%, #929292 82%, #dcdcdc)";

/** A chrome tube, lit from the left. */
export const CHROME = "linear-gradient(90deg, #6f6f6f, #f7f7f7 42%, #8a8a8a)";

/** The lacquered top of the deck. */
export const PLINTH =
  "linear-gradient(155deg, #2e2e31 0%, #1a1a1c 42%, #0c0c0d 100%)";
